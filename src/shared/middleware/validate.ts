import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req[target]);
      if (!result.success) return next(result.error);
      
      if (target === 'query') {
        Object.keys(req.query).forEach(key => delete req.query[key]);
        Object.assign(req.query, result.data);
      } else {
        req[target] = result.data;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}