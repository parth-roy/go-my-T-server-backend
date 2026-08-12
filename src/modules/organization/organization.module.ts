/**
 * organization.module.ts
 *
 * Module bootstrap / dependency wiring for the Organization Domain.
 * This file is the single entry point imported by app.ts.
 */
import { workspaceResolverRegistry } from '@shared/context/workspace-resolver.registry';
import { OrganizationWorkspaceResolver } from './application/resolvers/organization-workspace.resolver';
import { registerOrganizationListeners } from './infrastructure/event-listeners/organization.listeners';

export { organizationRouter } from './presentation/organization.router';

export function initializeOrganizationModule() {
  // Register the organization workspace resolver into the platform context pipeline
  workspaceResolverRegistry.register(new OrganizationWorkspaceResolver());
  
  // Register organization domain event listeners
  registerOrganizationListeners();
}
