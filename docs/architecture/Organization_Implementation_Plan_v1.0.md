# Organization Domain — Implementation Plan v1.0

**Project:** Parther Logistics Platform  
**Domain:** Organization  
**Document Version:** 1.0  
**Date:** 2026-08-06  
**Status:** APPROVED FOR EXECUTION  
**Author:** Engineering Team  

> **Architecture Constraint:** The architecture for the Organization Domain is finalized and must **NOT** be redesigned. This document is an execution plan only. All structural decisions (module layout, event contracts, RBAC model, Prisma schema topology) are treated as immutable inputs.

---

## Table of Contents

1. [Part 1 – Milestones Overview](#part-1--milestones-overview)
2. [Part 2 – Per-Milestone Detail](#part-2--per-milestone-detail)
3. [Part 3 – Per-Milestone Checklists](#part-3--per-milestone-checklists)
4. [Part 4 – Migration Order](#part-4--migration-order)
5. [Part 5 – Prisma Migration Order](#part-5--prisma-migration-order)
6. [Part 6 – API Development Order](#part-6--api-development-order)
7. [Part 7 – Risk Register](#part-7--risk-register)
8. [Part 8 – Release Strategy](#part-8--release-strategy)
9. [Part 9 – Definition of Done](#part-9--definition-of-done)

---

# Part 1 – Milestones Overview

Each milestone must produce a **working backend artifact** — meaning the server builds, Prisma validates, and the milestone scope is exercisable in isolation under a feature flag. No milestone may be considered complete if it breaks any existing functionality.

| ID | Name | Scope Summary | Artifact |
|----|------|---------------|----------|
| **M0** | Foundation | Shared Kernel types, feature flag middleware, Prisma base models (Organization, Branch stubs) | Buildable server with feature-flagged router mounted (empty) |
| **M1** | Organization & Branch CRUD | Full CRUD for Organization and Branch entities; owner assignment; validation | Working `POST /orgs`, `GET /orgs/:id`, `PUT /orgs/:id`, `DELETE /orgs/:id`; same for Branch |
| **M2** | Invitation & Membership | Worker invitation flow; membership creation on acceptance; membership termination | Working invitation issuance -> acceptance/rejection -> membership lifecycle |
| **M3** | Capability-Based RBAC | Role model, CapabilityGrant model, CapabilityResolver service, permission guard middleware | Working `GET /orgs/:id/capabilities`; guards protecting M1/M2 routes |
| **M4** | Collaboration | B2B dual opt-in Collaboration model; proposal and acceptance endpoints; status machine | Working `POST /orgs/:id/collaborations`, `PUT /orgs/:id/collaborations/:colId/accept` |
| **M5** | Project & Shift | Project model, Shift model, shift scheduling within org context; conflict detection | Working shift creation, listing, and conflict-rejection logic |
| **M6** | Verification Integration | EventBus consumer for `verification.status_changed`; org/branch status update handler | Org/branch `verificationStatus` updated automatically on domain event receipt |
| **M7** | Cross-Domain Wiring | EventBus listeners for Workforce, Booking, Dispatch domains; emitters for org events | Full event mesh: org membership changes -> Workforce; booking org context -> Booking/Dispatch |
| **M8** | Hardening & Observability | Optimistic locking / concurrency guards; structured audit log; Prometheus metrics; alert thresholds | Production-hardened module with audit trail and dashboards |

> **Milestone sequencing is strict.** Each milestone depends on the one(s) preceding it. No milestone may begin until all stated dependencies pass their Definition of Done.


---

# Part 2 – Per-Milestone Detail

---

## M0 — Foundation

### Objective
Establish the structural scaffolding for the Organization Domain without exposing any functional routes to production traffic. This includes: shared kernel type definitions, the feature flag infrastructure, the Prisma schema stubs for Organization and Branch (enough for `prisma validate` and `prisma generate` to pass), and the empty module mount point.

### Estimated Complexity
**Low**

### Dependencies
None. M0 is the root milestone. However, it must not conflict with the existing Prisma schema. A `prisma validate` run against the current schema must still pass after M0 schema additions.

### Files Affected

**New Files:**
```
server/src/modules/organization/organization.router.ts
server/src/modules/organization/organization.controller.ts
server/src/modules/organization/organization.service.ts
server/src/modules/organization/organization.schema.ts
server/src/shared/types/organization.types.ts
server/src/shared/constants/feature-flags.ts          (if not exists)
server/src/shared/middleware/feature-flag.middleware.ts
server/prisma/migrations/20260806_M0_org_foundation/   (migration dir)
```

**Existing Files Touched:**
```
server/src/app.ts                   — mount /api/v1/orgs router (behind flag)
server/prisma/schema.prisma         — add Organization, Branch model stubs
server/src/shared/types/index.ts    — re-export organization types
```

### Database Changes
- New model: `Organization` (stub — id, name, ownerId, createdAt, updatedAt, isActive, featureFlags JSON)
- New model: `Branch` (stub — id, organizationId FK, name, address, createdAt, updatedAt)
- No enum additions at this stage

### Feature Flags Required
| Flag | Default | Purpose |
|------|---------|---------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` | Guards entire `/api/v1/orgs` router; returns `503` when false |

### Backward Compatibility Notes
- Adding new Prisma models is purely additive. No existing models are touched.
- The new router returns `503` by default (flag off), so no existing client is affected.
- `app.ts` mount is additive — no existing routes are modified.
- `feature-flags.ts` must not redeclare any existing constant names.

### Testing Strategy
- Unit test: `feature-flag.middleware.ts` returns 503 when flag is false, passes through when true.
- Integration test: `GET /api/v1/orgs/health` returns 503 with flag off; returns 200 with flag on.
- `prisma validate` must pass in CI after schema changes.
- `tsc --noEmit` must pass with zero errors.

### Rollback Strategy
- Flip `ORGANIZATION_DOMAIN_ENABLED=false` in environment — zero traffic impact.
- If schema migration must be rolled back: `prisma migrate reset` is safe at M0 since no data exists in the new tables.
- Revert `app.ts` mount commit (one-line change).

---

## M1 — Organization & Branch CRUD

### Objective
Implement full Create, Read, Update, Delete operations for `Organization` and `Branch` entities. This includes owner assignment, slug generation, address validation, and soft-delete semantics. Branch is always scoped to its parent Organization. No auth guards beyond JWT ownership are required yet (RBAC arrives in M3).

### Estimated Complexity
**Medium**

### Dependencies
**M0 must be complete** (Foundation, feature flag, stub models in schema).

### Files Affected

**New Files:**
```
server/src/modules/organization/branch/branch.router.ts
server/src/modules/organization/branch/branch.controller.ts
server/src/modules/organization/branch/branch.service.ts
server/src/modules/organization/branch/branch.schema.ts
server/src/shared/validators/organization.validators.ts
server/prisma/migrations/20260806_M1_org_branch_crud/
```

**Existing Files Touched:**
```
server/src/modules/organization/organization.router.ts   — add branch sub-router
server/src/modules/organization/organization.service.ts  — implement create/read/update/delete
server/src/modules/organization/organization.controller.ts — wire all handlers
server/src/modules/organization/organization.schema.ts   — add Zod schemas for all endpoints
server/prisma/schema.prisma                              — finalize Organization + Branch models (all fields)
```

### Database Changes
- `Organization` model finalized: add `slug String @unique`, `description String?`, `type OrgType`, `verificationStatus VerificationStatus @default(PENDING)`, `logoUrl String?`, `gstNumber String?`, `panNumber String?`, `addressLine1 String`, `city String`, `state String`, `pincode String`, `deletedAt DateTime?`
- `Branch` model finalized: add `branchCode String @unique`, `managerId String?`, `phone String?`, `email String?`, `lat Float?`, `lng Float?`, `isHeadquarters Boolean @default(false)`, `deletedAt DateTime?`
- Enum addition: `OrgType` (FLEET_OWNER, LOGISTICS_PROVIDER, ENTERPRISE_SHIPPER, STAFFING_AGENCY)

> WARNING: `OrgType` is a new enum. Per `AGENTS.md`, the raw SQL `ALTER TYPE` must be executed BEFORE running `prisma migrate dev`. See Part 5.

### Feature Flags Required
| Flag | Default | Notes |
|------|---------|-------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` (inherited from M0) | Still the primary gate |

### Backward Compatibility Notes
- `Organization` and `Branch` are new tables — no existing foreign keys reference them yet.
- `OrgType` enum is new — no existing code references it.
- Soft delete (`deletedAt`) pattern matches existing platform convention. No new pattern introduced.
- All new Zod schemas are in the org module only. No shared schema files are modified.

### Testing Strategy
- Unit tests for `organization.service.ts`: create (happy path, duplicate slug), read (found, not found), update (owner only), soft delete.
- Unit tests for `branch.service.ts`: create under org, read, update, soft delete; assert branch cannot belong to deleted org.
- Integration tests: full CRUD cycle via HTTP using supertest; assert 404 on soft-deleted records.
- Contract test: verify response shape matches `{ success: true, data: {}, message: "" }` format per `AGENTS.md`.
- `prisma validate` + `tsc --noEmit` in CI.

### Rollback Strategy
- Feature flag flip covers all traffic exposure.
- M1 migration is additive (new columns on new tables). Rolling back requires `prisma migrate reset` on dev; in staging, execute `DROP TABLE "Branch"; DROP TABLE "Organization"; DROP TYPE "OrgType";` in a controlled window — no existing data affected.

---

## M2 — Invitation & Membership

### Objective
Implement the worker onboarding flow: an organization admin issues an invitation to a phone number or user ID; the target user accepts or rejects; on acceptance an `OrganizationMembership` record is created. Membership can later be terminated (soft delete with reason). Duplicate active membership must be prevented at the database level via a unique constraint.

### Estimated Complexity
**Medium**

### Dependencies
**M1 must be complete** (Organization and Branch entities must be persisted).

### Files Affected

**New Files:**
```
server/src/modules/organization/invitation/invitation.router.ts
server/src/modules/organization/invitation/invitation.controller.ts
server/src/modules/organization/invitation/invitation.service.ts
server/src/modules/organization/invitation/invitation.schema.ts
server/src/modules/organization/membership/membership.router.ts
server/src/modules/organization/membership/membership.controller.ts
server/src/modules/organization/membership/membership.service.ts
server/src/modules/organization/membership/membership.schema.ts
server/prisma/migrations/20260806_M2_invitation_membership/
```

**Existing Files Touched:**
```
server/src/modules/organization/organization.router.ts   — mount invitation + membership sub-routers
server/prisma/schema.prisma                              — add Invitation, OrganizationMembership models + enums
```

### Database Changes
- New model: `Invitation` — fields: id, organizationId, branchId?, invitedById, targetUserId?, targetPhone, status `InvitationState`, expiresAt, createdAt, updatedAt, revokedAt?, revokedById?
- New model: `OrganizationMembership` — fields: id, organizationId, branchId?, userId, role `OrgRole`, joinedAt, terminatedAt?, terminationReason?, isActive Boolean
- **Unique constraint**: `@@unique([organizationId, userId, isActive])` where `isActive = true` — prevents duplicate active memberships
- Enum additions: `InvitationState` (PENDING, ACCEPTED, REJECTED, EXPIRED, REVOKED), `OrgRole` (OWNER, ADMIN, MANAGER, MEMBER, OBSERVER)

> WARNING: Both enums are new. Raw SQL `ALTER TYPE` required before migration. See Part 5.

### Feature Flags Required
| Flag | Default | Notes |
|------|---------|-------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` | Primary gate (inherited) |
| `ORG_INVITATION_ENABLED` | `false` | Sub-flag; allows staging invitation flow independently |

### Backward Compatibility Notes
- `OrganizationMembership` is a new table. Existing `Worker`, `FleetOwner`, and `User` tables are not modified.
- The invitation flow does not replace or interfere with the existing workforce `GigJob` acceptance flow.
- `Invitation.targetUserId` is nullable — supports phone-number-only invitations for users not yet registered.
- No existing EventBus topics are published or consumed in M2 (that arrives in M7).

### Testing Strategy
- Unit test `invitation.service.ts`: issue (success, duplicate active check, expired org check), accept (idempotent on already-accepted), reject, revoke.
- Unit test `membership.service.ts`: create (happy path), terminate (with reason), list by org, list by user.
- Race condition test: two concurrent acceptance requests for the same invitation — assert only one membership is created.
- Integration test: full invitation lifecycle via HTTP.
- Expiry test: invitation past `expiresAt` returns `INVITATION_EXPIRED` error code.

### Rollback Strategy
- Feature flag `ORG_INVITATION_ENABLED=false` disables invitation routes immediately.
- `ORGANIZATION_DOMAIN_ENABLED=false` disables everything.
- M2 tables are new and unpopulated in staging; rollback is `DROP TABLE "OrganizationMembership"; DROP TABLE "Invitation";` with enum drops.

---

## M3 — Capability-Based RBAC

### Objective
Implement the capability-based permission system. Each `OrgRole` carries a default capability set; additional capabilities can be explicitly granted via `OrganizationCapabilityGrant`. A `CapabilityResolver` service computes the effective permission set for a (user, organization) pair. An Express middleware (`requireOrgCapability`) uses the resolver to protect routes. All M1 and M2 write routes must be retroactively guarded.

### Estimated Complexity
**High**

### Dependencies
**M2 must be complete** (OrgRole enum and OrganizationMembership must exist and be queryable).

### Files Affected

**New Files:**
```
server/src/modules/organization/rbac/capability-resolver.service.ts
server/src/modules/organization/rbac/capability-resolver.spec.ts
server/src/modules/organization/rbac/org-capability.middleware.ts
server/src/modules/organization/rbac/capability-grants.service.ts
server/src/modules/organization/rbac/capability-grants.router.ts
server/src/modules/organization/rbac/capability-grants.controller.ts
server/src/shared/constants/org-role-capabilities.ts   — default capability map
server/src/shared/types/capability.types.ts
server/prisma/migrations/20260806_M3_capability_grant/
```

**Existing Files Touched:**
```
server/src/modules/organization/organization.router.ts   — add requireOrgCapability guards to existing routes
server/src/modules/organization/branch/branch.router.ts  — guard write routes
server/src/modules/organization/invitation/invitation.router.ts — guard issuance route
server/src/modules/organization/membership/membership.router.ts — guard termination route
server/prisma/schema.prisma                              — add OrganizationCapabilityGrant model
```

### Database Changes
- New model: `OrganizationCapabilityGrant` — fields: id, organizationId, granteeUserId, capability `OrgCapability`, grantedById, grantedAt, expiresAt?, revokedAt?
- Enum addition: `OrgCapability` (MANAGE_BRANCHES, MANAGE_MEMBERS, INVITE_WORKERS, TERMINATE_MEMBERS, VIEW_FINANCIALS, MANAGE_SHIFTS, MANAGE_PROJECTS, INITIATE_COLLABORATION, MANAGE_CAPABILITIES, VIEW_AUDIT_LOG)

> WARNING: `OrgCapability` is a new enum. Raw SQL required before migration.

### Feature Flags Required
| Flag | Default | Notes |
|------|---------|-------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` | Primary gate |
| `ORG_RBAC_ENABLED` | `false` | When false, `requireOrgCapability` middleware is a pass-through |

### Backward Compatibility Notes
- `ORG_RBAC_ENABLED=false` ensures M1/M2 routes continue to function unchanged in test environments.
- No existing modules have `requireOrgCapability` applied — it is scoped to org module routes only.
- `CapabilityResolver` has no side effects; it is a pure read-only query service.
- Default capability map in `org-role-capabilities.ts` is a constant — no DB seed required.

### Testing Strategy
- **Unit tests for `CapabilityResolver`** (critical path):
  - Assert OWNER role resolves all capabilities.
  - Assert OBSERVER role resolves only VIEW-class capabilities.
  - Assert explicit grant elevates MEMBER capability beyond role default.
  - Assert expired grant is not included in resolved set.
  - Assert revoked grant is not included.
- Unit test `requireOrgCapability` middleware: 403 when capability absent, passes when present, pass-through when `ORG_RBAC_ENABLED=false`.
- Integration tests: attempt M1 write routes as OBSERVER — expect 403. As ADMIN — expect 200.
- Regression: all M1 and M2 integration tests must still pass with RBAC enabled (as OWNER actor).

### Rollback Strategy
- `ORG_RBAC_ENABLED=false` collapses all guards to pass-through — instant rollback without redeployment.
- `OrganizationCapabilityGrant` table drop is safe (no foreign references from other domains).

---

## M4 — Collaboration

### Objective
Implement the B2B dual opt-in Collaboration model. Organization A proposes a collaboration with Organization B. Organization B must explicitly accept. Neither party can unilaterally confirm a collaboration. Once active, collaborations gate certain cross-org operations (M7 wires these). The collaboration state machine enforces: PROPOSED -> ACCEPTED | REJECTED | WITHDRAWN.

### Estimated Complexity
**Medium**

### Dependencies
**M3 must be complete** (RBAC must be in place to protect collaboration endpoints).

### Files Affected

**New Files:**
```
server/src/modules/organization/collaboration/collaboration.router.ts
server/src/modules/organization/collaboration/collaboration.controller.ts
server/src/modules/organization/collaboration/collaboration.service.ts
server/src/modules/organization/collaboration/collaboration.schema.ts
server/src/modules/organization/collaboration/collaboration.state-machine.ts
server/prisma/migrations/20260806_M4_collaboration/
```

**Existing Files Touched:**
```
server/src/modules/organization/organization.router.ts   — mount collaboration sub-router
server/prisma/schema.prisma                              — add Collaboration model + CollaborationStatus enum
```

### Database Changes
- New model: `Collaboration` — fields: id, proposerOrgId (FK Organization), receiverOrgId (FK Organization), status `CollaborationStatus`, proposedById, respondedById?, proposedAt, respondedAt?, withdrawnAt?, notes?, expiresAt?
- **Unique constraint**: `@@unique([proposerOrgId, receiverOrgId])` — prevents duplicate proposals between same pair
- Enum addition: `CollaborationStatus` (PROPOSED, ACCEPTED, REJECTED, WITHDRAWN, EXPIRED)

> WARNING: `CollaborationStatus` is a new enum. Raw SQL required before migration.

### Feature Flags Required
| Flag | Default | Notes |
|------|---------|-------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` | Primary gate |
| `ORG_COLLABORATION_ENABLED` | `false` | Sub-flag for B2B feature |

### Backward Compatibility Notes
- Collaboration is entirely internal to the Organization domain at this stage. No other domain reads from the `Collaboration` table until M7.
- `Collaboration` self-references `Organization` twice (proposer, receiver). Prisma handles named relation constraints — review generated migration for correct FK naming.
- No changes to Booking, Dispatch, or Workforce in this milestone.

### Testing Strategy
- Unit test `collaboration.state-machine.ts`: all valid transitions; all invalid transitions throw `InvalidTransitionError`.
- Unit test `collaboration.service.ts`: propose (success, duplicate, self-proposal rejection), accept (only receiver), reject (only receiver), withdraw (only proposer).
- Integration tests: full lifecycle via HTTP as two distinct org actors.
- Deadlock simulation: concurrent accept + withdraw — assert exactly one wins, other gets 409.
- RBAC test: `INITIATE_COLLABORATION` capability required for proposal endpoint.

### Rollback Strategy
- `ORG_COLLABORATION_ENABLED=false` disables all collaboration routes.
- `Collaboration` table has no downstream foreign keys in M4. Safe to drop.

---

## M5 — Project & Shift

### Objective
Implement Project and Shift scheduling within the Organization context. Projects group Shifts; Shifts represent time-bounded workforce assignments scoped to a Branch. Shift conflict detection must prevent two active shifts for the same worker within the same time window. The GigJob model in the Workforce domain is NOT modified — Project/Shift is an org-internal scheduling primitive that will be linked to GigJob in M7.

### Estimated Complexity
**High**

### Dependencies
**M4 must be complete** (Organization and Branch fully established; RBAC guards available).

### Files Affected

**New Files:**
```
server/src/modules/organization/project/project.router.ts
server/src/modules/organization/project/project.controller.ts
server/src/modules/organization/project/project.service.ts
server/src/modules/organization/project/project.schema.ts
server/src/modules/organization/shift/shift.router.ts
server/src/modules/organization/shift/shift.controller.ts
server/src/modules/organization/shift/shift.service.ts
server/src/modules/organization/shift/shift.schema.ts
server/src/modules/organization/shift/shift-conflict.detector.ts
server/prisma/migrations/20260806_M5_project_shift/
```

**Existing Files Touched:**
```
server/src/modules/organization/organization.router.ts   — mount project + shift sub-routers
server/prisma/schema.prisma                              — add Project, Shift models
```

### Database Changes
- New model: `Project` — fields: id, organizationId, branchId?, name, description?, startDate DateTime, endDate DateTime?, status ProjectStatus, createdById, createdAt, updatedAt, deletedAt?
- New model: `Shift` — fields: id, projectId, organizationId, branchId?, assignedMemberId, startTime DateTime, endTime DateTime, role OrgRole?, notes?, status ShiftStatus, createdById, createdAt, updatedAt, cancelledAt?
- **Index**: `@@index([assignedMemberId, startTime, endTime])` on Shift — required for conflict detection queries
- Enum additions: `ProjectStatus` (DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED), `ShiftStatus` (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)

> WARNING: Both enums are new. Raw SQL required before migration.

### Feature Flags Required
| Flag | Default | Notes |
|------|---------|-------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` | Primary gate |
| `ORG_SCHEDULING_ENABLED` | `false` | Sub-flag for project/shift features |

### Backward Compatibility Notes
- `Project` and `Shift` are new tables with no existing foreign key references.
- The existing `GigJob` model in the Workforce domain is **not touched** in M5. The `Shift.gigJobId` nullable FK that will eventually link them is deferred to M7.
- `MANAGE_SHIFTS` capability (defined in M3) is now enforced in M5 shift write routes.

### Testing Strategy
- Unit test `shift-conflict.detector.ts`: overlapping window returns conflict, adjacent windows return clear, same member different org returns clear.
- Unit test `shift.service.ts`: create (no conflict, conflict detected -> 409), update (re-check conflict), cancel.
- Unit test `project.service.ts`: create, list, update, soft delete; assert shifts under deleted project are cascade-cancelled.
- Integration test: schedule two overlapping shifts for same member — expect 409.
- Perf test: conflict detection query with 1000 existing shifts must complete < 100ms.

### Rollback Strategy
- `ORG_SCHEDULING_ENABLED=false` disables project/shift routes.
- `Project` and `Shift` tables have no downstream foreign keys in M5. Safe to drop.

---

## M6 — Verification Integration

### Objective
Subscribe to `verification.status_changed` events emitted by the Verification domain. When an Organization or Branch completes or fails verification, update the `verificationStatus` field on the corresponding record. This milestone is entirely event-driven — no new API endpoints are created. The handler must be idempotent.

### Estimated Complexity
**Low**

### Dependencies
**M5 must be complete** (Organization model must have `verificationStatus` field; EventBus infrastructure must be available).

### Files Affected

**New Files:**
```
server/src/modules/organization/listeners/verification-status.listener.ts
server/src/modules/organization/listeners/verification-status.listener.spec.ts
```

**Existing Files Touched:**
```
server/src/shared/eventbus/eventbus.ts         — register new listener
server/src/modules/organization/organization.service.ts — add updateVerificationStatus() method
```

### Database Changes
- No new models or enums.
- If `VerificationStatus` must be added as a new Prisma enum, add: (PENDING, IN_REVIEW, VERIFIED, REJECTED, SUSPENDED).

> WARNING: If `VerificationStatus` must be added as a new Prisma enum, raw SQL `ALTER TYPE` is required. Confirm with the Verification domain engineer whether this enum is shared or duplicated.

### Feature Flags Required
| Flag | Default | Notes |
|------|---------|-------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` | Primary gate |
| `ORG_VERIFICATION_LISTENER_ENABLED` | `false` | Allows enabling listener independently of write APIs |

### Backward Compatibility Notes
- The listener consumes from the existing EventBus. It does not produce new events in this milestone.
- If the Verification domain does not yet emit `verification.status_changed`, the listener is registered but effectively dormant — no error is thrown.
- The `updateVerificationStatus()` method uses an upsert-style update — idempotent by design.

### Testing Strategy
- Unit test listener: mock EventBus, dispatch test event, assert `organization.service.updateVerificationStatus()` called with correct args.
- Idempotency test: dispatch same event twice — assert DB state unchanged after second dispatch.
- Event ordering test: dispatch VERIFIED then REJECTED — assert final status is REJECTED. Dispatch REJECTED then VERIFIED (older timestamp) — assert final status is VERIFIED.
- Integration test: full stack with test EventBus emitter.

### Rollback Strategy
- `ORG_VERIFICATION_LISTENER_ENABLED=false` deregisters the listener.
- No schema changes — zero migration rollback risk.

---

## M7 — Cross-Domain Wiring

### Objective
Wire the Organization domain into the broader platform EventBus mesh. This milestone touches the Workforce, Booking, and Dispatch modules for the first time — with strictly additive changes only. Specifically: (1) Emit `org.member_joined`, `org.member_terminated`, `org.collaboration_established` from the Organization domain. (2) Consume `workforce.worker_available`, `booking.created` in new org-scoped listeners. (3) Ensure Dispatch module receives `org.member_joined` for availability pool updates.

> **Critical constraint:** The Booking, Dispatch, and Workforce service files must NOT be modified. Only their EventBus listener registration files may receive additive entries.

### Estimated Complexity
**High**

### Dependencies
**M6 must be complete** (Verification listener pattern established; EventBus integration tested).

### Files Affected

**New Files:**
```
server/src/modules/organization/emitters/org-member.emitter.ts
server/src/modules/organization/emitters/org-collaboration.emitter.ts
server/src/modules/organization/listeners/workforce-worker.listener.ts
server/src/modules/organization/listeners/booking-org-context.listener.ts
server/src/shared/eventbus/topics/organization.topics.ts
```

**Existing Files Touched (Additive Only):**
```
server/src/shared/eventbus/eventbus.ts            — register new org emitters and listeners
server/src/shared/eventbus/topics/index.ts        — export organization topics
server/src/modules/dispatch/dispatch.listeners.ts — register org.member_joined consumer (additive line only)
```

**Files That Must NOT Be Touched:**
```
server/src/modules/booking/booking.service.ts
server/src/modules/dispatch/dispatch.service.ts
server/src/modules/workforce/workforce.service.ts
server/src/modules/booking/booking.controller.ts
server/src/modules/dispatch/dispatch.controller.ts
server/src/modules/workforce/workforce.controller.ts
```

### Database Changes
- No new models or enums.

### Feature Flags Required
| Flag | Default | Notes |
|------|---------|-------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` | Primary gate |
| `ORG_EVENT_MESH_ENABLED` | `false` | Gates all emitters and cross-domain listeners |

### Backward Compatibility Notes
- Dispatch listener registration is additive — existing dispatch logic is not altered.
- EventBus topic registration is append-only — no existing topic names are changed.
- If `ORG_EVENT_MESH_ENABLED=false`, zero cross-domain events are produced or consumed.

### Testing Strategy
- Unit test each emitter: call trigger method, assert EventBus.emit called with correct topic and payload shape.
- Unit test each cross-domain listener: mock EventBus, verify correct org-side handler invoked.
- Integration test: membership creation -> assert `org.member_joined` event on bus.
- Integration test: collaboration acceptance -> assert `org.collaboration_established` event on bus.
- Regression: all existing Booking, Dispatch, Workforce integration tests must pass unchanged.

### Rollback Strategy
- `ORG_EVENT_MESH_ENABLED=false` silences all org emitters and deactivates all org listeners.
- The single additive line in `dispatch.listeners.ts` can be reverted in under 60 seconds.

---

## M8 — Hardening & Observability

### Objective
Harden the Organization domain for production. This includes: optimistic locking on OrganizationMembership to prevent concurrent termination/reactivation races; structured audit log for all state-changing operations; Prometheus metric counters and histograms for key operations; alert threshold definitions; structured error codes for all domain exceptions.

### Estimated Complexity
**Medium**

### Dependencies
**M7 must be complete** (full domain wired and functional end-to-end before hardening).

### Files Affected

**New Files:**
```
server/src/modules/organization/audit/org-audit.service.ts
server/src/modules/organization/audit/org-audit.service.spec.ts
server/src/modules/organization/metrics/org.metrics.ts
server/src/modules/organization/errors/org-error-codes.ts
server/src/shared/middleware/optimistic-lock.middleware.ts  (if not exists)
server/prisma/migrations/20260806_M8_org_audit_log/
```

**Existing Files Touched:**
```
server/src/modules/organization/organization.service.ts   — add audit log calls, optimistic lock checks
server/src/modules/organization/invitation/invitation.service.ts  — add audit calls, metric increments
server/src/modules/organization/membership/membership.service.ts  — add audit calls, optimistic lock on terminate
server/src/modules/organization/collaboration/collaboration.service.ts — add audit calls
server/src/modules/organization/shift/shift.service.ts    — add conflict detection metric
server/prisma/schema.prisma                               — add OrgAuditLog model
```

### Database Changes
- New model: `OrgAuditLog` — fields: id, organizationId, actorUserId, action `OrgAuditAction`, entityType String, entityId String, before Json?, after Json?, ipAddress String?, userAgent String?, createdAt
- **Index**: `@@index([organizationId, createdAt])` — for paginated audit log queries
- Enum addition: `OrgAuditAction` (ORG_CREATED, ORG_UPDATED, ORG_DELETED, BRANCH_CREATED, BRANCH_UPDATED, BRANCH_DELETED, MEMBER_INVITED, MEMBER_JOINED, MEMBER_TERMINATED, CAPABILITY_GRANTED, CAPABILITY_REVOKED, COLLABORATION_PROPOSED, COLLABORATION_ACCEPTED, COLLABORATION_REJECTED, SHIFT_CREATED, SHIFT_CANCELLED)
- Add `version Int @default(0)` (optimistic lock counter) to `OrganizationMembership` model

> WARNING: `OrgAuditAction` is a new enum. Raw SQL required before migration.

### Feature Flags Required
| Flag | Default | Notes |
|------|---------|-------|
| `ORGANIZATION_DOMAIN_ENABLED` | `false` | Primary gate |
| `ORG_AUDIT_LOG_ENABLED` | `true` | Default ON in M8; audit logging should be enabled in production |

### Backward Compatibility Notes
- `OrgAuditLog` is a new table. No existing modules write to it.
- Adding `version` to `OrganizationMembership` requires a migration with `@default(0)` — all existing rows get version 0. Safe.
- Prometheus metric registration is additive — no existing metrics are renamed.

### Testing Strategy
- Unit test `org-audit.service.ts`: verify correct action code logged for each operation, verify before/after snapshot captured.
- Unit test optimistic lock: concurrent update with stale version returns 409 `OPTIMISTIC_LOCK_CONFLICT`.
- Integration test: audit log entries appear after each state-changing HTTP operation.
- Load test: 50 concurrent membership termination requests — assert exactly one succeeds per membership, others get 409.

### Rollback Strategy
- `ORG_AUDIT_LOG_ENABLED=false` disables audit logging with no functional impact.
- `OrgAuditLog` table can be truncated or dropped without affecting any other table.


---

# Part 3 – Per-Milestone Checklists

---

## M0 — Foundation

### Developer Checklist
- [ ] Create `server/src/shared/constants/feature-flags.ts` with `ORGANIZATION_DOMAIN_ENABLED` constant
- [ ] Implement `server/src/shared/middleware/feature-flag.middleware.ts` — reads env var, returns 503 if disabled
- [ ] Create `server/src/shared/types/organization.types.ts` with base `OrganizationId`, `BranchId` branded types
- [ ] Add stub `Organization` model to `schema.prisma` (minimum viable fields for validate to pass)
- [ ] Add stub `Branch` model to `schema.prisma` with FK to `Organization`
- [ ] Create `server/src/modules/organization/organization.router.ts` — empty router, registers GET /health
- [ ] Create `organization.controller.ts` and `organization.service.ts` as stubs
- [ ] Mount org router in `app.ts` behind `featureFlagMiddleware('ORGANIZATION_DOMAIN_ENABLED')`
- [ ] Run `npx prisma validate` — must pass
- [ ] Run `npx prisma generate` — must pass
- [ ] Run `tsc --noEmit` — zero errors
- [ ] Commit with message: `feat(org): M0 foundation — stub models, feature flag, empty router`

### QA Checklist
- [ ] `GET /api/v1/orgs/health` with `ORGANIZATION_DOMAIN_ENABLED=false` -> 503 with JSON body `{ success: false, code: "SERVICE_DISABLED" }`
- [ ] `GET /api/v1/orgs/health` with `ORGANIZATION_DOMAIN_ENABLED=true` -> 200 with JSON body `{ success: true, data: { status: "ok" } }`
- [ ] All existing API routes (auth, booking, dispatch, etc.) continue to return correct responses — no regression
- [ ] `prisma studio` shows new Organization and Branch tables (empty)
- [ ] Server startup logs do not show any new errors

### Architecture Checklist
- [ ] Feature flag is read from environment variable, not hardcoded
- [ ] Feature flag middleware is reusable (accepts flag name as parameter)
- [ ] Stub models use Prisma `@id @default(cuid())` pattern consistent with existing models
- [ ] No business logic exists in stub controller or service
- [ ] Router file follows `router.ts -> controller.ts -> service.ts + schema.ts` module pattern per `AGENTS.md`
- [ ] API response shape matches `{ success: true, data: {}, message: "" }` format

---

## M1 — Organization & Branch CRUD

### Developer Checklist
- [ ] Finalize `Organization` Prisma model with all fields listed in Part 2 M1
- [ ] Finalize `Branch` Prisma model with all fields
- [ ] Execute raw SQL: `ALTER TYPE "OrgType" ADD VALUE IF NOT EXISTS '...'` for all OrgType enum values
- [ ] Run `npx prisma migrate dev --name "M1_org_branch_crud"`
- [ ] Implement `organization.service.ts`: `create`, `findById`, `findBySlug`, `update`, `softDelete`, `list`
- [ ] Implement `organization.controller.ts`: map HTTP verbs to service methods; thin controller per `AGENTS.md`
- [ ] Implement `organization.schema.ts`: Zod schemas for CreateOrganizationDto, UpdateOrganizationDto
- [ ] Implement `branch.service.ts`: `create`, `findById`, `update`, `softDelete`, `listByOrg`
- [ ] Implement `branch.controller.ts` and `branch.schema.ts`
- [ ] Mount branch sub-router at `/api/v1/orgs/:orgId/branches`
- [ ] Validate slug uniqueness in service layer (not just DB constraint)
- [ ] Implement soft delete: `deletedAt = new Date()`, filter `where: { deletedAt: null }` on all reads
- [ ] Run `tsc --noEmit` — zero errors
- [ ] Run full existing test suite — zero regressions

### QA Checklist
- [ ] `POST /api/v1/orgs` with valid payload -> 201 with created organization
- [ ] `POST /api/v1/orgs` with duplicate slug -> 409 with code `ORG_SLUG_TAKEN`
- [ ] `GET /api/v1/orgs/:id` for existing org -> 200 with org data
- [ ] `GET /api/v1/orgs/:id` for non-existent org -> 404 with code `ORG_NOT_FOUND`
- [ ] `PUT /api/v1/orgs/:id` with valid update payload -> 200 with updated org
- [ ] `DELETE /api/v1/orgs/:id` -> 200; subsequent GET returns 404
- [ ] `POST /api/v1/orgs/:orgId/branches` with valid payload -> 201
- [ ] `GET /api/v1/orgs/:orgId/branches` -> 200 with array of branches
- [ ] Soft-deleted branch does not appear in list
- [ ] Cannot create branch under soft-deleted org -> 404

### Architecture Checklist
- [ ] Controllers call exactly one service method per route handler; no business logic in controller
- [ ] Slug generation is deterministic and collision-resistant
- [ ] `deletedAt` filter applied consistently across ALL query methods
- [ ] FK from Branch to Organization uses `onDelete: Restrict` — org cannot be deleted if branches exist; soft delete path handles this
- [ ] All Zod schemas validate and strip unknown fields
- [ ] Response shape matches platform standard

---

## M2 — Invitation & Membership

### Developer Checklist
- [ ] Execute raw SQL for `InvitationState` and `OrgRole` enums
- [ ] Run `npx prisma migrate dev --name "M2_invitation_membership"`
- [ ] Implement `invitation.service.ts`: `issue`, `accept`, `reject`, `revoke`, `findById`, `listByOrg`, `listByUser`, `expireStale`
- [ ] Implement `membership.service.ts`: `create`, `terminate`, `findById`, `listByOrg`, `listByUser`, `isActiveMember`
- [ ] Add scheduled job or cron hook for expiring stale invitations
- [ ] Implement atomic transaction in `accept()`: update invitation status + create membership in single Prisma `$transaction`
- [ ] Implement unique constraint enforcement: catch Prisma `P2002` on membership create -> return `MEMBERSHIP_ALREADY_EXISTS`
- [ ] Implement `targetPhone` lookup: if `targetUserId` is null but phone matches a User, resolve to userId on issuance
- [ ] Wire sub-routers into `organization.router.ts`
- [ ] Run `tsc --noEmit` — zero errors

### QA Checklist
- [ ] `POST /api/v1/orgs/:orgId/invitations` with userId -> 201; invitation record in DB with status PENDING
- [ ] `POST /api/v1/orgs/:orgId/invitations` with phone -> 201 for unregistered user
- [ ] `PUT /api/v1/orgs/:orgId/invitations/:invId/accept` -> 200; membership record created; invitation status = ACCEPTED
- [ ] Re-accepting already accepted invitation -> 200 (idempotent, no duplicate membership)
- [ ] `PUT /api/v1/orgs/:orgId/invitations/:invId/reject` -> 200; no membership created
- [ ] Accepting expired invitation -> 422 with code `INVITATION_EXPIRED`
- [ ] Accepting revoked invitation -> 422 with code `INVITATION_REVOKED`
- [ ] Duplicate active membership attempt -> 409 with code `MEMBERSHIP_ALREADY_EXISTS`
- [ ] `DELETE /api/v1/orgs/:orgId/memberships/:membId` (terminate) -> 200; `terminatedAt` set in DB
- [ ] Terminated membership does not appear in active list

### Architecture Checklist
- [ ] Invitation acceptance is atomic: status update + membership creation in single Prisma `$transaction`
- [ ] Unique constraint `@@unique([organizationId, userId, isActive])` present in schema
- [ ] `isActiveMember()` used as pre-check before invitation issuance (cannot re-invite active member)
- [ ] Expiry check is timestamp-based, not status-based
- [ ] No EventBus events emitted in M2 (wired in M7 only)
- [ ] `OrgRole` assigned at invitation time; validated against allowed values

---

## M3 — Capability-Based RBAC

### Developer Checklist
- [ ] Create `server/src/shared/constants/org-role-capabilities.ts` — define `ROLE_CAPABILITY_MAP: Record<OrgRole, OrgCapability[]>`
- [ ] Execute raw SQL for `OrgCapability` enum
- [ ] Run `npx prisma migrate dev --name "M3_capability_grant"`
- [ ] Implement `capability-resolver.service.ts`:
  - [ ] `getEffectiveCapabilities(userId, orgId): Promise<OrgCapability[]>`
  - [ ] Fetch membership -> get role -> look up base capabilities from `ROLE_CAPABILITY_MAP`
  - [ ] Fetch active, non-expired, non-revoked `OrganizationCapabilityGrant` records for user+org
  - [ ] Union role capabilities + explicit grants -> deduplicated set
- [ ] Implement `org-capability.middleware.ts`:
  - [ ] Read `orgId` from `req.params`
  - [ ] Call `CapabilityResolver.getEffectiveCapabilities(req.user.id, orgId)`
  - [ ] If requested capability not in set -> 403 `INSUFFICIENT_ORG_CAPABILITY`
  - [ ] If `ORG_RBAC_ENABLED=false` -> pass-through
- [ ] Apply `requireOrgCapability('MANAGE_BRANCHES')` to Branch write routes
- [ ] Apply `requireOrgCapability('INVITE_WORKERS')` to invitation issuance route
- [ ] Apply `requireOrgCapability('TERMINATE_MEMBERS')` to membership termination route
- [ ] Apply `requireOrgCapability('MANAGE_CAPABILITIES')` to capability grant/revoke routes
- [ ] Implement `capability-grants.service.ts`: `grant`, `revoke`, `list`
- [ ] Run `tsc --noEmit` — zero errors

### QA Checklist
- [ ] OWNER role: all capability-guarded routes return expected responses
- [ ] OBSERVER role: all write routes return 403; all read routes return 200
- [ ] MEMBER with explicit `MANAGE_BRANCHES` grant: branch write routes return 200
- [ ] Expired grant: route returns 403 (not 200)
- [ ] Revoked grant: route returns 403
- [ ] `ORG_RBAC_ENABLED=false`: all routes pass through regardless of role
- [ ] `GET /api/v1/orgs/:orgId/capabilities` for current user -> 200 with effective capability array
- [ ] All M1 and M2 QA checks still pass when run as OWNER actor

### Architecture Checklist
- [ ] `CapabilityResolver` is a pure query service — no mutations, no side effects
- [ ] Default capability map is a compile-time constant — no DB seed required
- [ ] Capability check is performed AFTER authentication (JWT validated) and BEFORE business logic
- [ ] `orgId` is always taken from `req.params`, never from request body (IDOR prevention)
- [ ] Capability names follow VERB_NOUN convention consistently
- [ ] No capability check bypasses exist in controller or service layer

---

## M4 — Collaboration

### Developer Checklist
- [ ] Execute raw SQL for `CollaborationStatus` enum
- [ ] Run `npx prisma migrate dev --name "M4_collaboration"`
- [ ] Implement `collaboration.state-machine.ts`: `assertCollaborationTransition(from, to)` — throws `InvalidCollaborationTransitionError` for illegal transitions
- [ ] Implement `collaboration.service.ts`:
  - [ ] `propose(proposerOrgId, receiverOrgId, proposedById, dto)` — validate not self-proposal, check unique constraint
  - [ ] `accept(collaborationId, actorOrgId, actorUserId)` — assert actor is receiver, assert transition PROPOSED->ACCEPTED
  - [ ] `reject(collaborationId, actorOrgId, actorUserId)` — assert actor is receiver, assert transition PROPOSED->REJECTED
  - [ ] `withdraw(collaborationId, actorOrgId, actorUserId)` — assert actor is proposer, assert transition PROPOSED->WITHDRAWN
  - [ ] `findById`, `listByOrg`
- [ ] Apply `requireOrgCapability('INITIATE_COLLABORATION')` to proposal endpoint
- [ ] Implement expiry logic: collaborations past `expiresAt` auto-transition to EXPIRED via cron or lazy check
- [ ] Wire sub-router into `organization.router.ts`
- [ ] Run `tsc --noEmit` — zero errors

### QA Checklist
- [ ] `POST /api/v1/orgs/:orgId/collaborations` -> 201 with PROPOSED collaboration
- [ ] Self-proposal (proposerOrgId === receiverOrgId) -> 422 `COLLABORATION_SELF_PROPOSAL`
- [ ] Duplicate proposal between same pair -> 409 `COLLABORATION_ALREADY_EXISTS`
- [ ] Receiver accepts -> 200; status = ACCEPTED
- [ ] Receiver rejects -> 200; status = REJECTED
- [ ] Proposer withdraws -> 200; status = WITHDRAWN
- [ ] Receiver attempts to withdraw -> 403 `COLLABORATION_WRONG_ACTOR`
- [ ] Proposer attempts to accept -> 403 `COLLABORATION_WRONG_ACTOR`
- [ ] Accept after REJECTED -> 422 `INVALID_COLLABORATION_TRANSITION`
- [ ] Accept after expired -> 422 `COLLABORATION_EXPIRED`
- [ ] `INITIATE_COLLABORATION` capability required for proposal -> 403 if absent

### Architecture Checklist
- [ ] `assertCollaborationTransition` is the single gatekeeper for all status changes — no direct status overwrites in service
- [ ] `@@unique([proposerOrgId, receiverOrgId])` enforced at DB level, handled gracefully (P2002 -> 409)
- [ ] Actor identity (proposer vs receiver) verified in service layer, not just middleware
- [ ] Collaboration does not grant access to cross-org resources in M4 (that is M7's responsibility)
- [ ] State machine is stateless — takes current state as input, no DB reads inside `assertTransition`

---

## M5 — Project & Shift

### Developer Checklist
- [ ] Execute raw SQL for `ProjectStatus` and `ShiftStatus` enums
- [ ] Run `npx prisma migrate dev --name "M5_project_shift"`
- [ ] Implement `shift-conflict.detector.ts`:
  - [ ] `detectConflict(memberId, startTime, endTime, excludeShiftId?)`: query DB for overlapping SCHEDULED or IN_PROGRESS shifts for same member
  - [ ] Overlap condition: `startTime < existing.endTime AND endTime > existing.startTime`
- [ ] Implement `shift.service.ts`: `create` (run conflict detect first), `update` (re-run conflict detect), `cancel`, `findById`, `listByProject`, `listByMember`
- [ ] Implement `project.service.ts`: `create`, `update`, `cancel`, `complete`, `findById`, `listByOrg`
- [ ] Cascade: when project is CANCELLED, all SCHEDULED shifts under it -> CANCELLED
- [ ] Apply `requireOrgCapability('MANAGE_SHIFTS')` to shift write routes
- [ ] Apply `requireOrgCapability('MANAGE_PROJECTS')` to project write routes
- [ ] Wire sub-routers into `organization.router.ts`
- [ ] Do NOT touch `GigJob` model or Workforce service
- [ ] Run `tsc --noEmit` — zero errors

### QA Checklist
- [ ] `POST /api/v1/orgs/:orgId/projects` -> 201
- [ ] `POST /api/v1/orgs/:orgId/projects/:projectId/shifts` -> 201 for non-overlapping shift
- [ ] Creating overlapping shift for same member -> 409 `SHIFT_CONFLICT_DETECTED`
- [ ] Cancelling project -> all SCHEDULED shifts become CANCELLED
- [ ] `MANAGE_SHIFTS` required for shift create -> 403 if absent for OBSERVER
- [ ] `GET /api/v1/orgs/:orgId/projects/:projectId/shifts` -> 200 with shift list
- [ ] Shift for member from different org -> 422 `MEMBER_NOT_IN_ORG`
- [ ] Adjacent shifts (endTime of A = startTime of B) -> 201 (not a conflict)
- [ ] Cancelled shift excluded from conflict detection
- [ ] Performance: conflict detection with 1000 existing shifts completes within acceptable response time

### Architecture Checklist
- [ ] Conflict detection uses indexed query on `[assignedMemberId, startTime, endTime]`
- [ ] `SCHEDULED` and `IN_PROGRESS` are the only statuses that block new shift creation (not COMPLETED, CANCELLED)
- [ ] Project cascade cancellation is wrapped in a Prisma `$transaction`
- [ ] `GigJob` model is NOT imported or referenced anywhere in M5 files
- [ ] Shift boundary validation: `endTime > startTime` enforced at Zod schema level
- [ ] `branchId` on Shift must belong to the same `organizationId`

---

## M6 — Verification Integration

### Developer Checklist
- [ ] Review Verification domain event contract: confirm `verification.status_changed` event payload shape
- [ ] Implement `verification-status.listener.ts`:
  - [ ] Subscribe to `verification.status_changed` on EventBus
  - [ ] Filter for `entityType === 'organization'` or `entityType === 'branch'`
  - [ ] Call `organization.service.updateVerificationStatus(entityId, newStatus)` or branch equivalent
  - [ ] Implement idempotency: check current status; skip if already equal to newStatus
  - [ ] Implement timestamp ordering: skip if event timestamp is older than last update timestamp
- [ ] Add `updateVerificationStatus(orgId, status)` to `organization.service.ts`
- [ ] Add `updateBranchVerificationStatus(branchId, status)` to `branch.service.ts`
- [ ] Register listener in EventBus if `ORG_VERIFICATION_LISTENER_ENABLED=true`
- [ ] Run `tsc --noEmit` — zero errors

### QA Checklist
- [ ] Emit test `verification.status_changed` event with `entityType='organization'` -> org record `verificationStatus` updated
- [ ] Emit test event with `entityType='branch'` -> branch record updated
- [ ] Re-emit same event -> no change in DB (idempotent)
- [ ] Emit VERIFIED then REJECTED (by timestamp ordering) -> final status REJECTED
- [ ] Emit REJECTED then VERIFIED (older timestamp) -> status remains REJECTED
- [ ] `ORG_VERIFICATION_LISTENER_ENABLED=false` -> events ignored
- [ ] Unknown entityType in event -> silently ignored, no error thrown, error logged

### Architecture Checklist
- [ ] Listener is idempotent: safe to replay any event
- [ ] Listener respects event timestamp ordering, not arrival ordering
- [ ] Handler does not throw — all errors are caught, logged, and discarded
- [ ] Listener registration is gated behind `ORG_VERIFICATION_LISTENER_ENABLED` flag
- [ ] No new events are emitted in M6

---

## M7 — Cross-Domain Wiring

### Developer Checklist
- [ ] Define `organization.topics.ts`: export `ORG_MEMBER_JOINED`, `ORG_MEMBER_TERMINATED`, `ORG_COLLABORATION_ESTABLISHED` topic constants
- [ ] Implement `org-member.emitter.ts`: `emitMemberJoined(membership)`, `emitMemberTerminated(membership)`
- [ ] Implement `org-collaboration.emitter.ts`: `emitCollaborationEstablished(collaboration)`
- [ ] Call `emitMemberJoined` from `membership.service.create()` (M2 file, additive call)
- [ ] Call `emitMemberTerminated` from `membership.service.terminate()` (M2 file, additive call)
- [ ] Call `emitCollaborationEstablished` from `collaboration.service.accept()` (M4 file, additive call)
- [ ] Implement `workforce-worker.listener.ts`: subscribe to `workforce.worker_available`
- [ ] Implement `booking-org-context.listener.ts`: subscribe to `booking.created`
- [ ] Add consumer for `ORG_MEMBER_JOINED` in `dispatch.listeners.ts` (single additive line only)
- [ ] Gate all emitters and listeners behind `ORG_EVENT_MESH_ENABLED` flag
- [ ] Verify no modifications made to `booking.service.ts`, `dispatch.service.ts`, or `workforce.service.ts`
- [ ] Run full existing test suite — zero regressions
- [ ] Run `tsc --noEmit` — zero errors

### QA Checklist
- [ ] Membership creation -> `org.member_joined` event on EventBus (captured in test listener)
- [ ] Membership termination -> `org.member_terminated` event on bus
- [ ] Collaboration acceptance -> `org.collaboration_established` event on bus
- [ ] `ORG_EVENT_MESH_ENABLED=false` -> zero org events emitted, zero cross-domain listeners active
- [ ] Dispatch module receives and processes `org.member_joined` without errors
- [ ] All existing Booking integration tests pass (no regression)
- [ ] All existing Dispatch integration tests pass (no regression)
- [ ] All existing Workforce integration tests pass (no regression)
- [ ] EventBus consumer lag < 1s under normal load

### Architecture Checklist
- [ ] Topic names follow platform convention: `domain.event_name` snake_case
- [ ] Event payloads are typed with timestamp and correlationId
- [ ] Emitters do not await bus publish — fire-and-forget (async, logged on failure)
- [ ] No cross-domain service is directly imported into org module (only via EventBus)
- [ ] `dispatch.listeners.ts` change is a single line addition, confirmed by diff review
- [ ] Booking, Dispatch, Workforce service files are unchanged — verified by git diff

---

## M8 — Hardening & Observability

### Developer Checklist
- [ ] Execute raw SQL for `OrgAuditAction` enum
- [ ] Run `npx prisma migrate dev --name "M8_org_audit_hardening"`
- [ ] Add `version Int @default(0)` to `OrganizationMembership` in schema; run migration
- [ ] Implement `org-audit.service.ts`: `log(orgId, actorId, action, entityType, entityId, before?, after?)`
- [ ] Implement `org.metrics.ts`: register Prometheus counters: `org_invitations_issued_total`, `org_invitations_accepted_total`, `org_invitations_rejected_total`, `org_memberships_created_total`, `org_memberships_terminated_total`, `org_shifts_created_total`, `org_shift_conflicts_total`, `org_capability_checks_total`, `org_capability_check_failures_total`
- [ ] Implement Prometheus histograms: `org_capability_resolve_duration_seconds`, `org_conflict_detection_duration_seconds`
- [ ] Add audit log calls to all state-changing service methods
- [ ] Implement optimistic lock check in `membership.service.terminate()`: read current `version`, use `update where: { id, version }`, if 0 rows updated -> 409 `OPTIMISTIC_LOCK_CONFLICT`
- [ ] Implement `GET /api/v1/orgs/:orgId/audit-log` — paginated, requires `VIEW_AUDIT_LOG` capability
- [ ] Add structured error codes to `org-error-codes.ts` for all domain exceptions
- [ ] Define Prometheus alert rules file: `org-alerts.yml`
- [ ] Run `tsc --noEmit` — zero errors

### QA Checklist
- [ ] After `POST /api/v1/orgs` -> `GET /api/v1/orgs/:orgId/audit-log` shows `ORG_CREATED` entry
- [ ] After membership termination -> audit log shows `MEMBER_TERMINATED` with before/after snapshot
- [ ] Concurrent termination of same membership (optimistic lock test) -> one succeeds (200), all others get 409
- [ ] `GET /api/v1/orgs/:orgId/audit-log` without `VIEW_AUDIT_LOG` -> 403
- [ ] Prometheus `/metrics` endpoint exposes all new `org_*` counters
- [ ] Counter increments correctly after each operation
- [ ] Audit log entries include actorUserId, ipAddress, timestamp
- [ ] `ORG_AUDIT_LOG_ENABLED=false` -> service methods continue to work, no audit entries written

### Architecture Checklist
- [ ] Audit logging is non-blocking — failure to write audit log must NOT fail the primary operation (fire-and-forget with error logging)
- [ ] Optimistic lock uses DB-level `version` field — not application-level mutex
- [ ] Prometheus metrics registered at server startup, not per-request
- [ ] Audit log `before`/`after` fields contain sanitized JSON (no passwords, tokens, or raw PII)
- [ ] All domain error codes follow `SCREAMING_SNAKE_CASE` convention and are unique across the platform
- [ ] `VIEW_AUDIT_LOG` capability is restricted to OWNER and ADMIN roles in default capability map



---

# Part 4 - Migration Order

## Module Touch Sequence

The migration order across the codebase is designed to minimize interference with existing functionality. The guiding principle is: **shared infrastructure first, domain internals next, cross-domain wiring last**.

### Phase A - Touch FIRST (M0 only)

| Order | Module/File | Reason |
|-------|-------------|--------|
| 1 | `server/src/shared/constants/feature-flags.ts` | Feature flag constant must exist before anything else |
| 2 | `server/src/shared/middleware/feature-flag.middleware.ts` | Middleware must be available before router mount |
| 3 | `server/src/shared/types/organization.types.ts` | Branded types needed by stub module |
| 4 | `server/prisma/schema.prisma` | Stub models added; validate must pass before any service compiles |
| 5 | `server/src/app.ts` | Router mounted behind flag; single line addition at end of route registration block |

### Phase B - Domain Internal (M1 through M5)

These files are created or modified exclusively within `server/src/modules/organization/`. No other module directory is touched.

| Order | Module/File | Milestone |
|-------|-------------|-----------|
| 6 | `organization.service.ts` | M1 |
| 7 | `organization.controller.ts` | M1 |
| 8 | `organization.schema.ts` | M1 |
| 9 | `branch/` (all files) | M1 |
| 10 | `invitation/` (all files) | M2 |
| 11 | `membership/` (all files) | M2 |
| 12 | `rbac/` (all files) | M3 |
| 13 | `collaboration/` (all files) | M4 |
| 14 | `project/` (all files) | M5 |
| 15 | `shift/` (all files) | M5 |

### Phase C - Event Infrastructure (M6-M7)

| Order | Module/File | Milestone | Nature of Change |
|-------|-------------|-----------|-----------------|
| 16 | `listeners/verification-status.listener.ts` | M6 | New file - org module only |
| 17 | `shared/eventbus/topics/organization.topics.ts` | M7 | New file - additive |
| 18 | `shared/eventbus/topics/index.ts` | M7 | Additive re-export |
| 19 | `shared/eventbus/eventbus.ts` | M7 | Additive listener/emitter registration only |
| 20 | `organization/emitters/` (all files) | M7 | New files - org module only |
| 21 | `listeners/workforce-worker.listener.ts` | M7 | New file - org module only |
| 22 | `listeners/booking-org-context.listener.ts` | M7 | New file - org module only |
| 23 | `dispatch/dispatch.listeners.ts` | M7 | **Single additive line only** |

### Phase D - Hardening (M8)

| Order | Module/File | Milestone | Nature of Change |
|-------|-------------|-----------|-----------------|
| 24 | `organization/audit/org-audit.service.ts` | M8 | New file |
| 25 | `organization/metrics/org.metrics.ts` | M8 | New file |
| 26 | `organization/errors/org-error-codes.ts` | M8 | New file |
| 27 | All org service files | M8 | Additive: audit calls and metric increments |

---

## Modules That Must NOT Be Touched Until M7

The following module service and controller files are **locked** until M7. Any PR that modifies these files before M7 is complete must be blocked at code review:

| Module | Locked Files |
|--------|-------------|
| Booking | `booking.service.ts`, `booking.controller.ts`, `booking.router.ts` |
| Dispatch | `dispatch.service.ts`, `dispatch.controller.ts` |
| Workforce | `workforce.service.ts`, `workforce.controller.ts` |
| Auth | All auth module files |
| Payment | All payment module files |
| GigJob | All gig-job module files |

> **Exception:** `dispatch.listeners.ts` may receive a single additive line in M7. All other dispatch files remain locked.

---

## Explicit Sequencing Table

```
M0 -> M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7 -> M8
|      |      |      |      |      |      |      |      |
Fnd   CRUD  Invite RBAC  Collab Sched Verif Events Harden
```

No milestone may begin code review until the previous milestone's Definition of Done is signed off by the tech lead.


---

# Part 5 - Prisma Migration Order

> **Note on Enum Additions:** Per `AGENTS.md`, Prisma cannot add new enum values via standard migration. Each enum addition below requires a raw SQL `ALTER TYPE` executed against the database BEFORE running `npx prisma migrate dev`. This is mandatory and must be scripted into the deployment pipeline.

The Prisma schema migrations must be applied in the following strict order:

1. **Organization model** (M0 stub to M1 full) - Core entity; all other models reference it. Must be first.

2. **Branch model** (M0 stub to M1 full) - Depends on Organization FK. Cannot migrate before Organization.

3. **Department model** - Sub-entity of Organization. Must follow Branch (shares geographic scope). Migrate after Branch.

4. **Team model** - Sub-entity of Organization, may reference Branch. Must follow Department.

5. **OrganizationMembership model** - References Organization, Branch (optional), and User (existing). Must follow Organization and Branch. Unique constraint on `[organizationId, userId, isActive]` requires both FK targets to exist.

6. **Invitation model** - References Organization, Branch (optional), User (existing). Must follow OrganizationMembership (logically: membership is the result of invitation).

7. **Collaboration model** - References Organization twice (proposer + receiver). Must follow Organization. Must follow OrganizationMembership (actor identity for `proposedById` must be a member).

8. **OrganizationCapabilityGrant model** - References Organization, User (existing). Must follow OrganizationMembership (grants only make sense in membership context).

9. **Enum additions** - Applied via raw SQL `ALTER TYPE` before each migration that requires them. Order of enum migrations:
   - `OrgType` - required by M1 Organization migration
   - `InvitationState` - required by M2 Invitation migration
   - `OrgRole` - required by M2 OrganizationMembership migration
   - `VerificationStatus` - only if not already present in Verification domain schema
   - `CollaborationStatus` - required by M4 Collaboration migration
   - `ProjectStatus` - required by M5 Project migration
   - `ShiftStatus` - required by M5 Shift migration
   - `OrgCapability` - required by M3 OrganizationCapabilityGrant migration
   - `OrgAuditAction` - required by M8 OrgAuditLog migration

**Enum SQL template (repeat per enum):**
```sql
-- Run before prisma migrate dev
psql $DATABASE_URL -c "
  ALTER TYPE \"EnumName\" ADD VALUE IF NOT EXISTS 'VALUE_ONE';
  ALTER TYPE \"EnumName\" ADD VALUE IF NOT EXISTS 'VALUE_TWO';
"
```

> `ADD VALUE IF NOT EXISTS` is safe to re-run (idempotent). Always use this form.


---

# Part 6 - API Development Order

The implementation sequence follows a strict dependency chain. Each item must be complete and passing its unit tests before the next item begins.

1. **Organization creation** - The root entity. Until creation works end-to-end (including slug generation, owner assignment, and Prisma persistence), no subsequent API can be meaningfully developed or tested.

2. **Branch CRUD** - Branches are the next structural level. Required for invitation scoping (invitations can be branch-specific) and shift scheduling.

3. **Department CRUD** - Departments are organizational sub-divisions within a Branch. Required before Teams can be created (Teams are scoped to Departments).

4. **Team CRUD** - Teams are the leaf-level grouping of members. Required before membership assignment to a Team is possible.

5. **Invitation issuance** - The entry point to the membership funnel. Must be complete before acceptance/rejection makes sense.

6. **Invitation acceptance and rejection** - Depends on invitation issuance. The acceptance handler creates the `OrganizationMembership` record atomically.

7. **Membership listing and termination** - Depends on membership creation (which happens via invitation acceptance). Termination requires the `version` field for optimistic locking (added in M8, but termination endpoint itself lands in M2 without the lock; lock is retrofitted in M8).

8. **Capability resolution endpoint** - Depends on OrganizationMembership existing and OrgRole being assigned. The resolution endpoint exposes the effective capability set for the authenticated user within an org.

9. **Collaboration proposal and acceptance** - Depends on Organization existing (proposer + receiver both need to exist) and RBAC being in place (`INITIATE_COLLABORATION` capability guard). State machine must be implemented first.

10. **Verification status read** - A simple read endpoint exposing the current `verificationStatus` of an Organization or Branch. The write path is event-driven (M6 listener). The read endpoint is added last as it is purely informational and depends on the listener being wired.


---

# Part 7 - Risk Register

| Milestone | Risk | Impact | Probability | Mitigation |
|-----------|------|--------|-------------|------------|
| **M0** | Feature flag misconfiguration exposes incomplete routes to production traffic | H | M | Default `ORGANIZATION_DOMAIN_ENABLED=false` in all environments; CI asserts flag default is false; staging deploy checklist includes flag verification; Kubernetes/PM2 env var audit before each deploy |
| **M1** | Prisma enum addition (`OrgType`) causes migration lock on PostgreSQL | H | M | Use `ADD VALUE IF NOT EXISTS` in raw SQL; execute ALTER TYPE before `prisma migrate dev`; document in deployment runbook; test migration on a clone of production DB in staging; never run migration during peak traffic |
| **M2** | Race condition between two concurrent invitation acceptance requests creates duplicate active `OrganizationMembership` records | H | M | DB-level `@@unique([organizationId, userId, isActive])` constraint as last line of defence; application-level: wrap accept in Prisma `$transaction`; catch `P2002` Prisma error and return 409 response; optimistic lock added in M8; load test with concurrent accepts in CI |
| **M3** | `CapabilityResolver` complexity leads to incorrect authorization - either over-granting or under-granting permissions | H | L | Exhaustive unit test matrix covering all role/grant combinations; separate `ROLE_CAPABILITY_MAP` constant makes defaults auditable; code review requires two approvers for resolver changes; integration test suite runs as each OrgRole actor; `ORG_RBAC_ENABLED=false` flag provides instant rollback |
| **M4** | Collaboration dual opt-in deadlock: concurrent accept and withdraw arrive simultaneously, leaving collaboration in inconsistent state | M | L | State machine `assertCollaborationTransition()` called inside Prisma `$transaction` with `SELECT FOR UPDATE` semantics; only one transition wins; loser receives 409; test with concurrent requests in integration suite |
| **M5** | Shift scheduling conflict detection conflicts with existing `GigJob` model timing expectations - org shifts may silently double-book Workforce capacity | H | M | `GigJob` model NOT referenced in M5; conflict detection is org-internal only; cross-domain availability enforcement deferred to M7; document explicitly in shift creation response that org shifts and GigJobs are separate until M7 wiring; architect review required before M7 |
| **M6** | Verification domain event ordering issues: `verification.status_changed` events arrive out of order, causing `verificationStatus` to regress | M | M | Listener compares event timestamp against `organization.updatedAt`; newer event always wins; idempotency check skips events with matching current status; structured logging captures every event arrival with timestamp for post-incident analysis |
| **M7** | EventBus listener registration order affects Workforce dispatch - if org listener registers after dispatch listener on same topic, dispatch may act on stale availability state | H | L | EventBus subscription is stateless per-event (not ordered); test registration order independence; integration test: emit `org.member_joined` and verify dispatch consumer receives it regardless of registration order; `ORG_EVENT_MESH_ENABLED=false` flag disables all org emitters/listeners atomically without affecting existing subscriptions |
| **M8** | Missing or incomplete audit log entries create compliance gaps - state-changing operations occur without a corresponding `OrgAuditLog` row | M | M | Audit log calls added in every service method that mutates state; `ORG_AUDIT_LOG_ENABLED=true` default in M8; integration test verifies audit entry exists after each mutation endpoint; audit log write is non-blocking; weekly audit completeness check query in observability runbook |


---

# Part 8 - Release Strategy

---

## Development Environment

- **Feature flag default:** `ORGANIZATION_DOMAIN_ENABLED=false` in all `.env` files and `.env.example`
- Every developer working on the Organization Domain must explicitly set `ORGANIZATION_DOMAIN_ENABLED=true` in their local `.env.local` - it is not enabled by default even in development
- Sub-flags (`ORG_INVITATION_ENABLED`, `ORG_RBAC_ENABLED`, `ORG_COLLABORATION_ENABLED`, `ORG_SCHEDULING_ENABLED`, `ORG_VERIFICATION_LISTENER_ENABLED`, `ORG_EVENT_MESH_ENABLED`, `ORG_AUDIT_LOG_ENABLED`) follow the same default-false pattern, except `ORG_AUDIT_LOG_ENABLED` which defaults to `true` from M8 onward
- Each milestone's feature flag(s) are added to `.env.example` with explicit comments explaining their purpose and default
- PR template includes a checkbox: "I have verified this PR does not enable org flags in CI without explicit test purpose"

---

## Staging Environment

1. **Pre-deploy checklist:**
   - Verify `ORGANIZATION_DOMAIN_ENABLED=false` on staging before applying M0 migration
   - Apply Prisma migrations in milestone order (see Part 5)
   - Execute raw SQL ALTER TYPE statements in order before each migration
   - Run `npx prisma validate` and `npx prisma generate` after each migration
   - Confirm server starts successfully: `npm run build && node dist/server.js`

2. **Enabling for test:**
   - Set `ORGANIZATION_DOMAIN_ENABLED=true` on staging
   - Enable sub-flags one milestone at a time, in milestone order
   - Run the full E2E test suite after each flag enable
   - Verify no regressions on existing endpoints: Booking, Auth, Dispatch, Workforce, Payment

3. **Backward compatibility verification:**
   - Run existing integration test suite with `ORGANIZATION_DOMAIN_ENABLED=true` - all existing tests must pass
   - Execute contract tests for all existing API modules - response shapes must be unchanged
   - Verify Prisma foreign key additions (if any cross-domain FKs are added) do not cause query plan regressions

4. **Staging sign-off criteria:**
   - All 9 milestone checklists (QA section) pass on staging
   - Zero regression failures on existing module tests
   - Prisma Studio confirms all new tables populated correctly by E2E flows
   - Prometheus `/metrics` endpoint shows org metrics after M8 enabling

---

## Production Rollout

Production rollout is **phased** to minimize blast radius:

### Phase 1 - Read-Only APIs (Week 1)
- Enable `ORGANIZATION_DOMAIN_ENABLED=true` in production
- Keep all sub-flags at `false`
- Only `GET /api/v1/orgs/health` and `GET /api/v1/orgs/:id` (read) are reachable
- Monitor error rate for 24 hours: target less than 0.1% 5xx rate on org routes
- Rollback trigger: any 5xx rate greater than 1% within first hour

### Phase 2 - Write APIs (Week 2)
- Enable `ORGANIZATION_DOMAIN_ENABLED=true` (already on) plus `ORG_INVITATION_ENABLED=true`
- Allow organization creation and invitation issuance
- Limit to internal test organizations initially
- Monitor: invitation acceptance rate, membership creation errors, DB query latency
- Rollback trigger: membership creation error rate greater than 5%

### Phase 3 - RBAC and Collaboration (Week 3)
- Enable `ORG_RBAC_ENABLED=true` and `ORG_COLLABORATION_ENABLED=true`
- Full write capability for authorized users
- Monitor: capability check failure rate (should be less than 5% after user education), collaboration proposal volume

### Phase 4 - Event Mesh and Scheduling (Week 4)
- Enable `ORG_SCHEDULING_ENABLED=true` and `ORG_EVENT_MESH_ENABLED=true`
- Monitor: EventBus consumer lag, dispatch pool refresh latency, shift conflict detection response time

### Phase 5 - Hardening Active (Week 4, after Phase 4 stable)
- Enable `ORG_AUDIT_LOG_ENABLED=true` (if not already default-on)
- Confirm audit log entries are being created at the expected rate
- Activate Prometheus alert rules from `org-alerts.yml`

---

## Rollback Procedure

### Flag-Based Rollback (Preferred - No Downtime)
```bash
# Disable all org features instantly
export ORGANIZATION_DOMAIN_ENABLED=false
# Restart server (PM2)
pm2 restart api
# All /api/v1/orgs routes now return 503; all other routes unaffected
```

### Prisma Rollback (Schema Rollback - Only If Data Loss Is Acceptable)

> WARNING: This procedure destroys all Organization domain data. Only execute if the schema change itself is the cause of the incident and flag-based rollback is insufficient.

```bash
# 1. Identify the migration to roll back to
npx prisma migrate status

# 2. Revert the migration manually (Prisma does not support automatic down-migrations)
# Execute the inverse SQL (DROP TABLE, DROP TYPE, DROP INDEX, etc.)
# against a staging replica FIRST to validate the inverse script

# 3. Mark migration as rolled back in Prisma's _prisma_migrations table
# DELETE FROM "_prisma_migrations" WHERE migration_name = '...';

# 4. Verify schema state
npx prisma validate

# 5. Restart server
pm2 restart api
```

**Constraint:** No destructive schema changes (DROP COLUMN on existing tables, DROP TYPE for existing enums, etc.) are permitted in any Organization domain migration. All org migrations must be purely additive or limited to new tables and new enums.

---

## Monitoring

The following key metrics must be tracked from Phase 2 onward:

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Invitation acceptance rate | org_invitations_accepted_total / org_invitations_issued_total | Less than 30% over 1-hour window |
| Membership creation errors | org_memberships_created_total (status=error) | More than 5 errors in 5 minutes |
| EventBus consumer lag | eventbus_consumer_lag_seconds (consumer=org.*) | More than 10 seconds sustained |
| Capability check failure rate | org_capability_check_failures_total / org_capability_checks_total | More than 20% over 15-minute window |
| Shift conflict detection latency | org_conflict_detection_duration_seconds p99 | More than 500ms |
| Org route 5xx rate | HTTP response code distribution for /api/v1/orgs/* | More than 1% |
| Audit log write failure rate | org_audit_log_write_failures_total | More than 0 (any failure is notable) |
| Optimistic lock conflict rate | org_optimistic_lock_conflicts_total | More than 10 in 1 minute (indicates contention) |


---

# Part 9 - Definition of Done

Each milestone's Definition of Done (DoD) must be verified and signed off by both the implementing engineer and the tech lead before the next milestone begins. "Signed off" means a written comment on the milestone's pull request confirming each item.

---

## M0 - Foundation: Definition of Done

- [ ] **Developer Checklist:** All M0 developer checklist items marked complete (see Part 3)
- [ ] **QA Checklist:** All M0 QA checklist items verified passing (see Part 3)
- [ ] **Architecture Checklist:** All M0 architecture checklist items confirmed (see Part 3)
- [ ] **TypeScript:** `tsc --noEmit` runs with zero errors on the full server codebase
- [ ] **Existing Tests:** All existing test suites (auth, booking, dispatch, workforce, payment) pass without modification
- [ ] **Prisma:** `npx prisma validate` passes with Organization and Branch stub models present
- [ ] **Build:** `npm run build` produces a working dist with no compilation errors
- [ ] **Feature Flag - OFF State:** Server starts with `ORGANIZATION_DOMAIN_ENABLED=false`; `GET /api/v1/orgs/health` returns 503; all other routes unaffected
- [ ] **Feature Flag - ON State:** Server starts with `ORGANIZATION_DOMAIN_ENABLED=true`; `GET /api/v1/orgs/health` returns 200

---

## M1 - Organization and Branch CRUD: Definition of Done

- [ ] **Developer Checklist:** All M1 developer checklist items marked complete
- [ ] **QA Checklist:** All M1 QA checklist items verified passing
- [ ] **Architecture Checklist:** All M1 architecture checklist items confirmed
- [ ] **TypeScript:** `tsc --noEmit` zero errors
- [ ] **Existing Tests:** Zero regressions in all pre-existing test suites
- [ ] **Prisma:** `npx prisma validate` passes with finalized Organization and Branch models
- [ ] **Build:** `npm run build` succeeds
- [ ] **Feature Flag - OFF State:** All org routes return 503 when flag is false; no Organization or Branch data is accessible
- [ ] **Feature Flag - ON State:** Full CRUD cycle for Organization and Branch confirmed via integration tests
- [ ] **Contract Tests:** `POST /api/v1/orgs` response shape matches `{ success: true, data: { id, name, slug, ... }, message: "" }`
- [ ] **Soft Delete:** Soft-deleted organizations and branches excluded from all list and get queries

---

## M2 - Invitation and Membership: Definition of Done

- [ ] **Developer Checklist:** All M2 developer checklist items marked complete
- [ ] **QA Checklist:** All M2 QA checklist items verified passing
- [ ] **Architecture Checklist:** All M2 architecture checklist items confirmed
- [ ] **TypeScript:** `tsc --noEmit` zero errors
- [ ] **Existing Tests:** Zero regressions
- [ ] **Prisma:** `npx prisma validate` passes with Invitation and OrganizationMembership models
- [ ] **Build:** `npm run build` succeeds
- [ ] **Feature Flag - OFF State:** Invitation and membership routes return 503 or are inaccessible
- [ ] **Feature Flag - ON State:** Full invitation lifecycle (issue -> accept/reject -> membership) confirmed
- [ ] **Sub-Flag:** `ORG_INVITATION_ENABLED=false` disables invitation routes while org read routes remain accessible
- [ ] **Atomicity:** Acceptance transaction confirmed atomic via test (simulated failure mid-transaction leaves no partial state)
- [ ] **Race Condition Guard:** Concurrent acceptance test (2 simultaneous requests) results in exactly 1 membership and 1 error response

---

## M3 - Capability-Based RBAC: Definition of Done

- [ ] **Developer Checklist:** All M3 developer checklist items marked complete
- [ ] **QA Checklist:** All M3 QA checklist items verified passing
- [ ] **Architecture Checklist:** All M3 architecture checklist items confirmed
- [ ] **TypeScript:** `tsc --noEmit` zero errors
- [ ] **Existing Tests:** Zero regressions (M1 and M2 tests must pass with RBAC ON as OWNER actor)
- [ ] **Prisma:** `npx prisma validate` passes with OrganizationCapabilityGrant model
- [ ] **Build:** `npm run build` succeeds
- [ ] **Feature Flag - OFF State:** `ORG_RBAC_ENABLED=false` causes all capability middleware to pass-through
- [ ] **Feature Flag - ON State:** Correct 403 responses for insufficient capability; correct 200 for sufficient capability
- [ ] **Capability Resolver Unit Tests:** All role/grant combinations tested and passing (minimum 20 test cases)
- [ ] **No Bypass:** Code review confirms no route exists that bypasses `requireOrgCapability` for write operations

---

## M4 - Collaboration: Definition of Done

- [ ] **Developer Checklist:** All M4 developer checklist items marked complete
- [ ] **QA Checklist:** All M4 QA checklist items verified passing
- [ ] **Architecture Checklist:** All M4 architecture checklist items confirmed
- [ ] **TypeScript:** `tsc --noEmit` zero errors
- [ ] **Existing Tests:** Zero regressions
- [ ] **Prisma:** `npx prisma validate` passes with Collaboration model
- [ ] **Build:** `npm run build` succeeds
- [ ] **Feature Flag - OFF State:** `ORG_COLLABORATION_ENABLED=false` disables all collaboration routes
- [ ] **Feature Flag - ON State:** Full collaboration lifecycle confirmed
- [ ] **State Machine:** All valid and invalid transitions tested; state machine is the single mutation gatekeeper
- [ ] **Concurrent Deadlock Test:** Simultaneous accept + withdraw -> one wins (200), one loses (409)

---

## M5 - Project and Shift: Definition of Done

- [ ] **Developer Checklist:** All M5 developer checklist items marked complete
- [ ] **QA Checklist:** All M5 QA checklist items verified passing
- [ ] **Architecture Checklist:** All M5 architecture checklist items confirmed
- [ ] **TypeScript:** `tsc --noEmit` zero errors
- [ ] **Existing Tests:** Zero regressions; `GigJob` tests unaffected
- [ ] **Prisma:** `npx prisma validate` passes with Project and Shift models
- [ ] **Build:** `npm run build` succeeds
- [ ] **Feature Flag - OFF State:** `ORG_SCHEDULING_ENABLED=false` disables project and shift routes
- [ ] **Feature Flag - ON State:** Full project + shift lifecycle confirmed
- [ ] **Conflict Detection:** Overlapping shift creation returns 409; adjacent shift creation returns 201
- [ ] **GigJob Isolation:** Code review confirms zero imports of GigJob model or Workforce service in M5 files
- [ ] **Performance:** Conflict detection query under 100ms with 1000 existing shift records

---

## M6 - Verification Integration: Definition of Done

- [ ] **Developer Checklist:** All M6 developer checklist items marked complete
- [ ] **QA Checklist:** All M6 QA checklist items verified passing
- [ ] **Architecture Checklist:** All M6 architecture checklist items confirmed
- [ ] **TypeScript:** `tsc --noEmit` zero errors
- [ ] **Existing Tests:** Zero regressions
- [ ] **Prisma:** `npx prisma validate` passes (no new models; VerificationStatus enum confirmed)
- [ ] **Build:** `npm run build` succeeds
- [ ] **Feature Flag - OFF State:** `ORG_VERIFICATION_LISTENER_ENABLED=false` - listener not registered; events have no effect
- [ ] **Feature Flag - ON State:** Test event received -> org `verificationStatus` updated correctly
- [ ] **Idempotency:** Replaying same event produces no DB change after first application
- [ ] **Timestamp Ordering:** Out-of-order events processed correctly (older event does not overwrite newer state)
- [ ] **Error Resilience:** Unknown event payload -> logged, not thrown; consumer does not crash

---

## M7 - Cross-Domain Wiring: Definition of Done

- [ ] **Developer Checklist:** All M7 developer checklist items marked complete
- [ ] **QA Checklist:** All M7 QA checklist items verified passing
- [ ] **Architecture Checklist:** All M7 architecture checklist items confirmed
- [ ] **TypeScript:** `tsc --noEmit` zero errors
- [ ] **Existing Tests:** Zero regressions - Booking, Dispatch, Workforce test suites all pass
- [ ] **Prisma:** `npx prisma validate` passes (no new models in M7)
- [ ] **Build:** `npm run build` succeeds
- [ ] **Feature Flag - OFF State:** `ORG_EVENT_MESH_ENABLED=false` -> zero org events emitted, zero cross-domain listeners active; all existing event flows unaffected
- [ ] **Feature Flag - ON State:** All three org events confirmed on bus after trigger actions
- [ ] **Locked Files:** `git diff HEAD~1` confirms zero modifications to `booking.service.ts`, `dispatch.service.ts`, `workforce.service.ts`, `booking.controller.ts`, `dispatch.controller.ts`, `workforce.controller.ts`
- [ ] **Dispatch Listener:** `dispatch.listeners.ts` change is a single additive line; confirmed by diff review and second-engineer sign-off

---

## M8 - Hardening and Observability: Definition of Done

- [ ] **Developer Checklist:** All M8 developer checklist items marked complete
- [ ] **QA Checklist:** All M8 QA checklist items verified passing
- [ ] **Architecture Checklist:** All M8 architecture checklist items confirmed
- [ ] **TypeScript:** `tsc --noEmit` zero errors
- [ ] **Existing Tests:** Zero regressions across entire test suite
- [ ] **Prisma:** `npx prisma validate` passes with OrgAuditLog model and `version` field on OrganizationMembership
- [ ] **Build:** `npm run build` succeeds
- [ ] **Feature Flag - OFF State:** `ORG_AUDIT_LOG_ENABLED=false` -> service operations succeed; no audit entries written
- [ ] **Feature Flag - ON State:** Audit entries created for every state-changing operation; `VIEW_AUDIT_LOG` endpoint returns paginated results
- [ ] **Optimistic Lock:** Load test (50 concurrent membership terminations) -> exactly 1 success per membership, rest return 409
- [ ] **Prometheus:** All `org_*` metrics visible at `/metrics` endpoint; counters increment correctly
- [ ] **Alert Rules:** `org-alerts.yml` loaded by Prometheus; alert conditions verified to fire under simulated threshold breach
- [ ] **Audit Sanitization:** Audit log entries reviewed to confirm no raw tokens, passwords, or unmasked PII in `before`/`after` JSON fields
- [ ] **Production Readiness:** Tech lead and security reviewer sign off on M8 PR before any production flag enablement

---

*End of Document - Organization Implementation Plan v1.0*

---

**Document Control:**

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-08-06 | Engineering Team | Initial release |
