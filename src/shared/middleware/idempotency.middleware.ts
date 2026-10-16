import { Request, Response, NextFunction } from 'express';
import { getRedis } from '@config/redis';
import { logger } from '@shared/logger';

interface IdempotencyRecord {
  status: 'IN_PROGRESS' | 'COMPLETED';
  statusCode?: number;
  body?: any;
  expiresAt: number;
}

// In-memory LRU/TTL store fallback
const inMemoryCache = new Map<string, IdempotencyRecord>();

function cleanExpiredRecords() {
  const now = Date.now();
  for (const [key, record] of inMemoryCache.entries()) {
    if (record.expiresAt <= now) {
      inMemoryCache.delete(key);
    }
  }
}

/**
 * Idempotency Middleware (RFC 9110 / Stripe-style deduplication)
 *
 * For state-mutating requests (POST, PATCH, PUT, DELETE) carrying an
 * 'Idempotency-Key' or 'X-Idempotency-Key' header:
 * 1. If currently running: returns 409 Conflict.
 * 2. If already completed: returns exact cached response and status without re-executing.
 * 3. If new: executes controller and caches the resulting payload.
 */
export function idempotencyMiddleware(ttlSeconds: number = 86400) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Only enforce on mutating HTTP methods
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      return next();
    }

    const sanitizedKey = rawKey.trim().slice(0, 128);
    const userId = (req as any).user?.id || 'anon';
    const storageKey = `idempotency:${userId}:${req.method}:${req.baseUrl || ''}${req.path}:${sanitizedKey}`;
    const now = Date.now();

    cleanExpiredRecords();

    // 2. Check in-memory store
    const local = inMemoryCache.get(storageKey);
    if (local && local.expiresAt > now) {
      if (local.status === 'IN_PROGRESS') {
        return res.status(409).json({
          success: false,
          message: 'An operation with this Idempotency-Key is currently in progress. Please retry in a few moments.',
          code: 'IDEMPOTENCY_IN_PROGRESS',
        });
      }
      if (local.status === 'COMPLETED') {
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(local.statusCode || 200).json(local.body);
      }
    }

    // 3. Check Redis if active
    let redisClient: any = null;
    try {
      redisClient = getRedis();
      if (redisClient && redisClient.status === 'ready') {
        const cachedStr = await redisClient.get(storageKey);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr) as IdempotencyRecord;
          if (cached.status === 'IN_PROGRESS') {
            return res.status(409).json({
              success: false,
              message: 'An operation with this Idempotency-Key is currently in progress. Please retry in a few moments.',
              code: 'IDEMPOTENCY_IN_PROGRESS',
            });
          }
          if (cached.status === 'COMPLETED') {
            res.setHeader('X-Idempotent-Replay', 'true');
            return res.status(cached.statusCode || 200).json(cached.body);
          }
        }
        // Set short 120s lock in Redis
        await redisClient.set(storageKey, JSON.stringify({ status: 'IN_PROGRESS' }), 'EX', 120);
      }
    } catch (err: any) {
      logger.debug('[Idempotency] Redis lookup failed, operating on in-memory store:', err.message);
    }

    // 4. Mark in-progress in memory
    inMemoryCache.set(storageKey, {
      status: 'IN_PROGRESS',
      expiresAt: now + 120000,
    });

    // 5. Intercept res.json to capture response payload
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const statusCode = res.statusCode || 200;
      if (statusCode < 500) {
        // Cache successful and 4xx responses
        inMemoryCache.set(storageKey, {
          status: 'COMPLETED',
          statusCode,
          body,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });

        if (redisClient && redisClient.status === 'ready') {
          redisClient.set(
            storageKey,
            JSON.stringify({ status: 'COMPLETED', statusCode, body }),
            'EX',
            ttlSeconds,
          ).catch(() => {});
        }
      } else {
        // Clear lock on 5xx server crash so client can retry
        inMemoryCache.delete(storageKey);
        if (redisClient && redisClient.status === 'ready') {
          redisClient.del(storageKey).catch(() => {});
        }
      }
      return originalJson(body);
    };

    next();
  };
}
