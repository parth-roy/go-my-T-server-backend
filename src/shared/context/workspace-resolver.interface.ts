import { Request } from 'express';
import { RequestContext } from './request-context';

export interface IWorkspaceResolver {
  /**
   * Identifies if this resolver can handle the current request.
   * Typically checks for the presence of a specific header (e.g., x-organization-id).
   */
  canResolve(req: Request): boolean;

  /**
   * Resolves the request context based on the provided request and authenticated user.
   * Should throw an AppError if resolution fails (e.g., unauthorized or missing).
   */
  resolve(req: Request, user: { id: string; phone: string; role: string }): Promise<RequestContext>;
}
