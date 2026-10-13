import { getRedis } from '@config/redis';
import { logger } from '@shared/logger';
import { randomUUID } from 'crypto';

const RELEASE_LOCK_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
else
    return 0
end
`;

export interface ConcurrencyLockHandle {
    key: string;
    token: string;
    acquired: boolean;
}

export class ConcurrencyLockService {
    /**
     * Acquire a distributed lock with automatic TTL expiration.
     * @param resourceKey Unique key for the resource (e.g. lock:booking:assignment:123)
     * @param ttlMs Time-to-live in milliseconds (default 4000ms)
     */
    static async acquireLock(resourceKey: string, ttlMs: number = 4000): Promise<ConcurrencyLockHandle> {
        const token = randomUUID();
        try {
            const redis = getRedis();
            // SET resourceKey token PX ttlMs NX
            const result = await redis.set(resourceKey, token, 'PX', ttlMs, 'NX');
            const acquired = result === 'OK';
            if (!acquired) {
                logger.warn(`[ConcurrencyLock] Failed to acquire lock for ${resourceKey} (already held)`);
            }
            return { key: resourceKey, token, acquired };
        } catch (err) {
            logger.error(`[ConcurrencyLock] Redis error acquiring lock for ${resourceKey}:`, err);
            // In case of Redis outage, return acquired: true or handle gracefully
            // For critical consistency, we log and return false or throw
            return { key: resourceKey, token, acquired: false };
        }
    }

    /**
     * Safely release the lock using Lua script to ensure we only release if the token matches.
     */
    static async releaseLock(handle: ConcurrencyLockHandle): Promise<boolean> {
        if (!handle.acquired) return false;
        try {
            const redis = getRedis();
            const result = await redis.eval(RELEASE_LOCK_LUA, 1, handle.key, handle.token);
            return result === 1;
        } catch (err) {
            logger.error(`[ConcurrencyLock] Error releasing lock for ${handle.key}:`, err);
            return false;
        }
    }

    /**
     * Execute a block inside a distributed lock.
     * Throws conflict error if the lock cannot be acquired.
     */
    static async runWithLock<T>(
        resourceKey: string,
        ttlMs: number,
        onConflictErrorMessage: string,
        fn: () => Promise<T>
    ): Promise<T> {
        const lock = await this.acquireLock(resourceKey, ttlMs);
        if (!lock.acquired) {
            const error = new Error(onConflictErrorMessage) as any;
            error.statusCode = 409;
            error.code = 'RESOURCE_LOCKED';
            throw error;
        }
        try {
            return await fn();
        } finally {
            await this.releaseLock(lock);
        }
    }
}
