/**
 * correlation.middleware.ts — Operation ID & Request Tracing Middleware (Point 9)
 *
 * Extracts incoming correlation headers (x-operation-id, x-request-id, x-correlation-id),
 * assigns a unique UUID if missing, echoes them in response headers, and maintains
 * contextual correlation in AsyncLocalStorage throughout the request lifecycle.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { CorrelationContext } from '@shared/context/correlation.context';

declare global {
  namespace Express {
    interface Request {
      operationId?: string;
    }
  }
}

export function correlationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawHeader =
      req.headers['x-operation-id'] ||
      req.headers['x-request-id'] ||
      req.headers['x-correlation-id'];

    const operationId =
      (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) ||
      `op_${randomUUID()}`;

    // Normalize on request
    req.operationId = operationId;
    req.headers['x-operation-id'] = operationId;

    // Echo in response headers
    res.setHeader('X-Operation-Id', operationId);
    res.setHeader('X-Request-Id', operationId);

    // Initialize correlation context in AsyncLocalStorage
    CorrelationContext.run(
      {
        operationId,
        source: req.ip || req.socket?.remoteAddress,
      },
      () => {
        next();
      }
    );
  };
}
