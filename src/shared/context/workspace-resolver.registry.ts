import { IWorkspaceResolver } from './workspace-resolver.interface';
import { Request } from 'express';
import { RequestContext, PlatformIdentityType } from './request-context';

class WorkspaceResolverRegistry {
  private resolvers: IWorkspaceResolver[] = [];

  register(resolver: IWorkspaceResolver) {
    this.resolvers.push(resolver);
  }

  getResolvers(): IWorkspaceResolver[] {
    return this.resolvers;
  }

  /**
   * Resolves the context by finding the first matching resolver.
   * If no resolver matches (e.g. no workspace headers), it falls back to the Personal Workspace context.
   */
  async resolve(req: Request, user: { id: string; phone: string; role: string }): Promise<RequestContext> {
    for (const resolver of this.resolvers) {
      if (resolver.canResolve(req)) {
        return await resolver.resolve(req, user);
      }
    }

    // Fallback: Personal Workspace
    return {
      user: { id: user.id, phone: user.phone, rootRole: user.role },
      workspace: {
        id: user.id,
        type: 'PERSONAL'
      },
      platformIdentity: {
        type: user.role as PlatformIdentityType,
        role: user.role
      }
    };
  }
}

export const workspaceResolverRegistry = new WorkspaceResolverRegistry();
