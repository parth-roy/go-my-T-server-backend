import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { workspaceResolverRegistry } from '../context/workspace-resolver.registry';

export async function resolveContext(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(AppError.unauthorized('User not authenticated'));
    }

    req.context = await workspaceResolverRegistry.resolve(req, {
      id: req.user.id,
      phone: req.user.phone,
      role: req.user.role
    });

    next();
  } catch (err) {
    next(err);
  }
}
