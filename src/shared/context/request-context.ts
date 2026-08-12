export type WorkspaceType = 'PERSONAL' | 'ORGANIZATION';

export type PlatformIdentityType = 
  | 'CUSTOMER' 
  | 'DRIVER' 
  | 'FLEET_OWNER' 
  | 'ORGANIZATION_MEMBER' 
  | 'PLATFORM_ADMIN';

export interface RequestContext {
  /**
   * The authenticated biological user (Who)
   */
  user: {
    id: string;
    phone: string;
    rootRole: string;
  };

  /**
   * The targeted boundary of resources (Where)
   */
  workspace: {
    id: string;
    type: WorkspaceType;
  };

  /**
   * The active persona projected into the workspace (What/How)
   */
  platformIdentity: {
    type: PlatformIdentityType;
    role: string; // Resolves to either OrgRole or RootRole depending on context
  };

  // Optional Organization-specific resolved data
  organization?: {
    id: string;
    status: string;
  };
  membership?: {
    id: string;
    role: string;
    status: string;
  };
}
