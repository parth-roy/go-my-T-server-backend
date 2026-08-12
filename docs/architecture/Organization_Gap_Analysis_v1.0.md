# Organization Gap Analysis v1.0

## Executive Summary
The Organization Domain introduces a comprehensive B2B and internal team hierarchy system, encompassing Organizations, Branches, Departments, Teams, role-based capabilities (RBAC), Collaborations, and Shift scheduling. Our gap analysis indicates that while robust entities exist for `Worker` and `FleetOwner` (representing gig laborers and vendors), enterprise structures are largely missing. The current `TeamMember` implementation in the `user` module is a mock feature without authentication flows and will become obsolete. The strategy ensures zero disruption to existing active domains (Workforce, Gig, Fleet, Booking, Dispatch) by leveraging the `TypedEventBus` for cross-domain integration and preserving core Shared Kernel elements like the `User` model and `requireRole` middleware.

## Feature-by-Feature Gap Analysis

### 1. Organization & Branch CRUD
- **Existing implementation**: None directly. `TeamMember` in `user` provides flat lists. `FleetOwner` acts as a vendor company but is tightly coupled to the fleet module.
- **Reusable code**: `AppError` utilities, Zod validation patterns.
- **Code to extend**: `prisma/schema.prisma` (additive models).
- **Files obsolete**: None yet (legacy `TeamMember` phased out later).
- **Migration difficulty**: Low
- **Risk level**: Low

### 2. Invitation & Membership
- **Existing implementation**: `fleet-owner.service.ts` has a driver invitation flow via phone numbers. No generalized enterprise invitation exists.
- **Reusable code**: SMS/Notification services for sending invites.
- **New files required**: `invitation.service.ts`, `membership.service.ts`.
- **Migration difficulty**: Medium
- **Risk level**: Medium (concurrency race conditions on membership creation).

### 3. Capability-Based RBAC
- **Existing implementation**: `requireRole` middleware in `shared/middleware/auth.middleware.ts` enforces high-level roles (`UserRole`).
- **Reusable code**: Existing JWT authentication middleware and basic role checks.
- **Code to extend**: None. New capability guards will layer on top.
- **New files required**: `capability-resolver.service.ts`, `org-capability.middleware.ts`, `OrganizationCapabilityGrant` schema.
- **Migration difficulty**: High
- **Risk level**: High (authorization bypass risks if improperly applied).

### 4. Collaboration
- **Existing implementation**: B2B agreements do not exist in the platform.
- **Reusable code**: EventBus for state transitions.
- **Code to extend**: `schema.prisma`.
- **New files required**: `collaboration.state-machine.ts`, `collaboration.service.ts`.
- **Migration difficulty**: Medium
- **Risk level**: Low

### 5. Project & Shift
- **Existing implementation**: The `gig` module tracks `GigJob` and `GigAssignment`, which behave similarly to shifts but lack organization hierarchies. Worker availability is toggled rather than scheduled.
- **Reusable code**: None directly (Gig is separate).
- **Code that should remain untouched**: `GigJob` and `Worker` schemas and services.
- **New files required**: `shift-conflict.detector.ts`, project/shift services.
- **Migration difficulty**: High
- **Risk level**: Medium (conflict detection performance overhead).

### 6. Verification Integration
- **Existing implementation**: Extensive government integrations (VAHAN/SARATHI) exist in `ulip.service.ts` and `VerificationLog`.
- **Reusable code**: EventBus `verification.status_changed` emitters.
- **Code to extend**: EventBus listeners.
- **Migration difficulty**: Low
- **Risk level**: Low

### 7. Cross-Domain Wiring
- **Existing implementation**: Core domain logic in Workforce, Booking, and Dispatch is production-ready.
- **Code to extend**: `shared/eventbus/eventbus.ts`.
- **Code that should remain untouched**: Booking, Dispatch, and Workforce service files.
- **Migration difficulty**: Medium
- **Risk level**: Medium (event payload mismatches).

## Reuse Matrix

| Existing Component | Reuse | Extend | Replace | Notes |
|---|---|---|---|---|
| `User` model | Yes | No | No | Core identity referenced by new org models. |
| `requireRole` middleware | Yes | No | No | Used for initial route guarding prior to Capability checks. |
| `TypedEventBus` | Yes | Yes | No | New org topics and listeners will be registered. |
| `TeamMember` (user module) | No | No | Yes | Mock implementation to be deprecated in Phase 2. |
| `FleetOwner` / `Worker` | Yes | No | No | Remain parallel independent domains. |
| `AppError` (shared/errors) | Yes | No | No | Standardized error throwing. |

## File Creation Matrix

**Domain Layer (Business Logic & Rules):**
- `server/src/modules/organization/rbac/capability-resolver.service.ts`
- `server/src/modules/organization/collaboration/collaboration.state-machine.ts`
- `server/src/modules/organization/shift/shift-conflict.detector.ts`

**Application Layer (Use Cases):**
- `server/src/modules/organization/organization.service.ts`
- `server/src/modules/organization/branch/branch.service.ts`
- `server/src/modules/organization/invitation/invitation.service.ts`
- `server/src/modules/organization/membership/membership.service.ts`
- `server/src/modules/organization/project/project.service.ts`
- `server/src/modules/organization/shift/shift.service.ts`
- `server/src/modules/organization/collaboration/collaboration.service.ts`
- `server/src/modules/organization/rbac/capability-grants.service.ts`

**Infrastructure Layer (Event Listeners & Emitters):**
- `server/src/modules/organization/listeners/verification-status.listener.ts`
- `server/src/modules/organization/listeners/workforce-worker.listener.ts`
- `server/src/modules/organization/listeners/booking-org-context.listener.ts`
- `server/src/modules/organization/emitters/org-member.emitter.ts`
- `server/src/modules/organization/emitters/org-collaboration.emitter.ts`

**Presentation Layer (Controllers & Routers):**
- `server/src/modules/organization/organization.router.ts` (and sub-routers)
- `server/src/modules/organization/organization.controller.ts` (and sub-controllers)
- `server/src/modules/organization/organization.schema.ts` (and sub-schemas)
- `server/src/modules/organization/rbac/org-capability.middleware.ts`

## Refactoring Matrix

| Existing File | Required Changes | Notes |
|---|---|---|
| `server/prisma/schema.prisma` | Add Organization, Branch, Invitation, OrganizationMembership, Collaboration, Project, Shift, OrganizationCapabilityGrant, OrgAuditLog. | Strict additive approach. No existing schemas modified. Enums require manual raw SQL. |
| `server/src/app.ts` | Mount `/api/v1/orgs` router. | Guarded via `featureFlagMiddleware`. |
| `server/src/shared/eventbus/topics/index.ts` | Export new organization topics. | Additive. |
| `server/src/shared/eventbus/eventbus.ts` | Register new organization emitters and listeners. | Additive. |
| `server/src/modules/dispatch/dispatch.listeners.ts` | Register `org.member_joined` consumer. | Additive single line only. |
| `server/src/shared/middleware/feature-flag.middleware.ts` | Implement middleware if it does not exist. | Returns 503 if flag is disabled. |

## Zero Touch Matrix

| Module / Path | Reason for Zero Touch |
|---|---|
| `src/modules/booking/*` | Complex financial/status transitions (`assertTransition`). Handled via EventBus instead. |
| `src/modules/dispatch/*` | Real-time tracking and socket logic is production-critical. Additive listener registration only. |
| `src/modules/workforce/*` | `Worker` logic (location, payments) is independent of Org hierarchy. Wiring is purely event-driven. |
| `src/modules/gig/*` | `GigJob` operates independently. `Shift.gigJobId` linkage will be handled in M7 externally. |
| `src/modules/fleet-owner/*` | Vendor logic serves a distinct role. `FleetOwner` will co-exist with `Organization`. |
| `src/modules/user/user.service.ts` | The legacy `TeamMember` API must continue functioning for existing clients. Deprecation occurs separately post-migration. |
