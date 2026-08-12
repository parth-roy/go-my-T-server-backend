# Organization Technical Blueprint v1.0

> **Status**: Approved for Incremental Implementation
> **Source of Truth**: Organization Domain Specification v1.0, Organization Domain Architecture v1.0, Platform Domain Map v1.0
> **Target**: Existing Node.js + TypeScript + Express Modular Monolith

---

## Preamble

The existing backend follows a flat, file-per-concern pattern inside each module directory:
`<module>.router.ts` → `<module>.controller.ts` → `<module>.service.ts` + `<module>.schema.ts`

The Organization Domain is more complex than any existing module. It requires a **layered internal structure** without breaking the conventions of the surrounding codebase. The strategy is to introduce subdirectory layering *inside* the `organization` module directory, visible only to that module's consumers, without altering any existing module's contract.

---

## 1. Module Structure

```
server/src/modules/organization/
│
├── domain/                         # Pure business logic. No infrastructure imports.
│   ├── aggregates/
│   │   ├── organization.aggregate.ts
│   │   ├── invitation.aggregate.ts
│   │   └── collaboration.aggregate.ts
│   ├── entities/
│   │   ├── branch.entity.ts
│   │   ├── department.entity.ts
│   │   ├── team.entity.ts
│   │   ├── membership.entity.ts
│   │   ├── shift.entity.ts
│   │   └── project.entity.ts
│   ├── value-objects/
│   │   ├── capability.vo.ts
│   │   ├── org-role.vo.ts
│   │   └── business-registration.vo.ts
│   ├── events/
│   │   └── organization.events.ts
│   ├── policies/
│   │   ├── single-primary-owner.policy.ts
│   │   └── exclusive-employment.policy.ts
│   └── services/
│       ├── capability-resolver.domain-service.ts
│       └── ownership-transfer.domain-service.ts
│
├── application/                    # Use cases. Orchestrates domain + infrastructure.
│   ├── commands/
│   │   ├── create-organization.command.ts
│   │   ├── invite-member.command.ts
│   │   ├── accept-invitation.command.ts
│   │   ├── terminate-membership.command.ts
│   │   └── transfer-ownership.command.ts
│   ├── queries/
│   │   ├── get-organization.query.ts
│   │   └── list-members.query.ts
│   └── services/
│       ├── organization.app-service.ts
│       ├── membership.app-service.ts
│       ├── invitation.app-service.ts
│       └── collaboration.app-service.ts
│
├── infrastructure/                 # Prisma, external APIs, EventBus wiring.
│   ├── repositories/
│   │   ├── organization.repository.ts
│   │   ├── membership.repository.ts
│   │   └── invitation.repository.ts
│   └── event-listeners/
│       └── organization.listeners.ts
│
├── presentation/                   # Express Controllers + Router + Schemas (Zod/Joi)
│   ├── organization.controller.ts
│   ├── organization.router.ts
│   └── organization.schema.ts
│
└── organization.module.ts          # Module bootstrap and DI wiring
```

### Responsibilities Per Layer
- **domain/**: The truest representation of business rules. Has zero dependencies on Prisma, Express, or any infrastructure library. Entities enforce invariants internally.
- **application/**: Thin orchestrators. They receive Commands/Queries, call Domain Services and Aggregate methods, interact with Repositories, and publish Domain Events.
- **infrastructure/**: Adapters between the domain and the outside world. Prisma is called only here. EventBus listeners live here.
- **presentation/**: Express route registration and request/response shaping. Calls Application Services only. No business logic.

---

## 2. Internal Layers

### Domain Layer
Owns all invariants, business rules, aggregate roots, value objects, and domain events. It is the only layer allowed to enforce the `SinglePrimaryOwnerPolicy` or `ExclusiveEmploymentPolicy`.

### Application Layer
The entry point for all use cases. It opens and closes database transactions. It resolves application-level authorization (e.g., "does the calling user have `INVITE_WORKER` capability?"). It does NOT make business decisions — it delegates to Domain Services and Aggregate methods.

### Infrastructure Layer
Translates between the domain's pure language and the database's relational model. A `MembershipRepository` knows how to persist a `Membership` entity to Prisma but returns it as a pure domain object to the Application layer. Also owns event listener registration on the global `EventBus`.

### Presentation Layer
Validates the HTTP shape of the request (field presence, type checking) via Zod schemas. Extracts `req.user` from middleware. Calls Application Services. Returns `{ success: true, data: {}, message: "" }` following the existing platform API contract.

### Shared
The Organization module may contribute to the platform-level **Shared Kernel** the following: `OrganizationId` (typed UUID), `CapabilityEnum` (for use by Workforce and Fleet ACLs). Nothing else is permitted in Shared.

---

## 3. Aggregate Implementation

### Organization Aggregate Root

| Concern | Detail |
|---|---|
| **Commands** | `CreateOrganization`, `AddBranch`, `AddDepartment`, `AddTeam`, `ActivateMembership`, `TerminateMembership`, `UpdateVerificationStatus` |
| **Queries** | `GetOrganizationById`, `GetMembersByOrganization`, `GetOrganizationCapabilities` |
| **Repository** | `OrganizationRepository` — persists and reconstitutes the full aggregate with branches, memberships, and teams. |
| **Factory** | `OrganizationFactory` — constructs a valid new Organization, ensuring a valid Primary Owner reference is provided at creation time. |
| **Policies** | `SinglePrimaryOwnerPolicy` — runs synchronously before any ownership mutation. `VerificationGatePolicy` — blocks Shift assignment if Org is `UNVERIFIED`. |
| **Events Published** | `OrganizationCreated`, `OrganizationVerified`, `OrganizationSuspended`, `WorkerEmployed`, `WorkerReleased` |

### Invitation Aggregate Root

| Concern | Detail |
|---|---|
| **Commands** | `IssueInvitation`, `AcceptInvitation`, `RejectInvitation`, `ExpireInvitation` |
| **Queries** | `GetPendingInvitationsByUser`, `GetInvitationById` |
| **Repository** | `InvitationRepository` |
| **Factory** | `InvitationFactory` — sets TTL (e.g., 72h) and generates a secure token at creation time. |
| **Policies** | `InvitationExpiryPolicy` — ensures acceptance is rejected after TTL. `ExclusiveEmploymentPolicy` — checked at acceptance before creating Membership. |
| **Events Published** | `InvitationIssued`, `InvitationAccepted`, `InvitationRejected`, `InvitationExpired` |

### Collaboration Aggregate Root

| Concern | Detail |
|---|---|
| **Commands** | `ProposeCollaboration`, `AcceptCollaboration`, `RejectCollaboration`, `SewerCollaboration` |
| **Queries** | `GetActiveCollaborationsByOrg`, `GetCollaborationById` |
| **Repository** | `CollaborationRepository` |
| **Factory** | `CollaborationFactory` — requires both Organization references to be valid and `VERIFIED`. |
| **Policies** | `MutualConsentPolicy` — ensures `CollaborationFormed` event is only published when *both* organizations have confirmed. |
| **Events Published** | `CollaborationProposed`, `CollaborationFormed`, `CollaborationSevered` |

---

## 4. Repository Interfaces

### OrganizationRepository
Reconstitutes the full Organization aggregate from persistence. Provides methods to find by ID, find by owner user ID, save the full aggregate (including structural sub-entities), and list organizations with pagination and filtering.

### MembershipRepository
Manages the Employment binding between a user and an Organization. Must support finding the *active* membership for a given user ID (enforcing the exclusive employment business rule) without materializing the full Organization aggregate — a deliberate performance optimization.

### InvitationRepository
Manages pending invitations. Supports querying by target phone number and issuing Organization. Must include a method to bulk-expire invitations past their TTL, designed to be called by a background cleanup job.

### CollaborationRepository
Tracks B2B collaboration agreements. Supports querying active collaborations for a given Organization, and must efficiently validate whether two Organizations already have an active agreement before allowing a duplicate proposal.

---

## 5. Application Services

### OrganizationAppService
- **Responsibilities**: Handles organization creation, structural mutations (add/remove branch, department, team), and verification status updates triggered by the Verification Domain's events.
- **Transactions**: Wraps all structural mutations in a single Prisma transaction to prevent partial writes (e.g., a branch being created without a required department link).

### MembershipAppService
- **Responsibilities**: Handles termination and promotion flows. Before executing a role promotion, it invokes the `CapabilityResolver` domain service to validate the calling Admin has the `PROMOTE_MEMBER` capability.
- **Transactions**: Ownership transfers are double-atomic: the demotion of the current owner and promotion of the new one must succeed or both must fail. This is the most critical transaction in the domain.

### InvitationAppService
- **Responsibilities**: Orchestrates the full invitation flow. On acceptance, it first checks `ExclusiveEmploymentPolicy` (via `MembershipRepository.findActiveByUserId`), then calls the Organization aggregate to create a Membership, then publishes `WorkerEmployed`.
- **Transactions**: Invitation state change (Pending → Accepted) and Membership creation must be atomic.

### CollaborationAppService
- **Responsibilities**: Manages the dual opt-in flow for B2B collaboration proposals.
- **Transactions**: `CollaborationFormed` event is only published after the database state is committed, preventing phantom collaboration agreements.

---

## 6. Domain Services

### CapabilityResolver
- **Ownership**: Domain Layer.
- **Responsibility**: Given a `Membership` entity and a requested `CapabilityEnum` action, traverses the role hierarchy to return a boolean. This logic must NOT live in a controller or middleware because it may need to consider inherited organizational capabilities.

### OwnershipTransferService
- **Ownership**: Domain Layer.
- **Responsibility**: Validates that the target member is an active member of the same Organization, then atomically reassigns the `PRIMARY_OWNER` role. Enforces the invariant that zero or two Primary Owners can never exist even for a single millisecond.

### OrganizationVerificationService
- **Ownership**: Domain Layer (boundary with Infrastructure).
- **Responsibility**: Consumes a `VerificationPassed` or `VerificationRevoked` event from the Verification domain and translates it into the Organization's own `VerificationStatus` transitions. Applies the `VerificationGatePolicy` side effects.

---

## 7. Domain Events

### Event Design Rules
- All Domain Events carry a `eventId` (UUID), `occurredAt` (timestamp), and the issuing `organizationId`.
- Events are published *after* the database transaction is committed, never before. This prevents ghost events for failed transactions.
- The existing `TypedEventEmitter` in `shared/eventbus/` is the event bus. The Organization module wires its listeners in `infrastructure/event-listeners/organization.listeners.ts`.

### Event Catalog

| Event | Publisher | Consumers | Idempotency | Retry |
|---|---|---|---|---|
| `OrganizationCreated` | OrgAppService | Verification | By `organizationId`; safe to replay | Yes, idempotent |
| `OrganizationVerified` | OrgVerificationService | Booking/Dispatch | By `organizationId + verifiedAt` | Yes |
| `WorkerEmployed` | InvitationAppService | Workforce, Tracking | By `membershipId` | Yes |
| `WorkerReleased` | MembershipAppService | Workforce, Dispatch | By `membershipId + releasedAt` | Yes |
| `CollaborationFormed` | CollaborationAppService | Projects | By `collaborationId` | Yes |
| `InvitationIssued` | InvitationAppService | Notifications | By `invitationId` | Yes |

### Ordering Consideration
`WorkerEmployed` must always be published *after* `InvitationAccepted`. Event consumers in the Workforce domain must never process `WorkerReleased` before `WorkerEmployed`. Consumers should be designed to be idempotent and handle out-of-order delivery via a local `processedEvents` deduplication set keyed on `eventId`.

---

## 8. API Ownership

The Organization module owns the following API surface areas. No other module may expose endpoints that mutate Organization state directly.

- Organization CRUD (create, read, update, archive).
- Branch management (create, update, delete branch within an organization).
- Department management (create, update, delete department within a branch).
- Team management (create, update, delete team within a department).
- Membership management (list members, promote, demote, terminate).
- Invitation lifecycle (issue invitation, view pending invitations, cancel invitation).
- Collaboration management (propose, accept, reject, sever).
- Organization verification status read (the Verification Domain *writes* status; Organization exposes the read).

---

## 9. Authorization Points

### At Presentation Layer (Middleware)
- `authenticate` middleware confirms a valid JWT. Applied to all Organization routes.
- `requireRole(ADMIN, FLEET_OWNER, CUSTOMER)` middleware gates entry — Workers cannot access organizational management routes.

### At Application Layer (Capability Checks)
- Before any structural mutation (add branch, remove team), the Application Service invokes `CapabilityResolver.resolve(membership, 'MANAGE_STRUCTURE')`.
- Before issuing an Invitation, resolve `INVITE_WORKER`.
- Before transfer of ownership, resolve `TRANSFER_OWNERSHIP`.

### At Domain Layer (Invariant Enforcement)
- The `SinglePrimaryOwnerPolicy` is enforced inside the Organization Aggregate Root before applying any role mutation.
- The `ExclusiveEmploymentPolicy` is enforced inside the Invitation Aggregate before transitioning to `ACCEPTED`.

### Ownership Validation
- All write operations validate that `req.user.id` matches either the `Organization.primaryOwnerId` or a Membership with sufficient Capabilities. This check occurs at the Application layer, not the Presentation layer.

---

## 10. Validation Strategy

### Technical Validation (Presentation Layer)
Zod schemas validate the structural correctness of incoming API requests: required fields, type correctness, string length limits. This is the first line of defense and does not touch the database.

### Business Validation (Application + Domain Layer)
Business rules are enforced at the Application and Domain layers:
- Does this user already have an active employment? (`MembershipRepository.findActiveByUserId`)
- Is this Organization currently `VERIFIED`? (Domain Policy check on Aggregate state)
- Does an invitation token exist and is unexpired? (Invitation Aggregate state machine)

### Cross-Domain Validation
Certain checks require consulting another domain:
- Before accepting an invitation, the system must verify the target user exists in the Identity domain. This is done by the Application Service querying the `UserRepository` (not by importing the `user.service.ts` directly — use the Shared Kernel user ID type only).
- Before allowing a Collaboration involving a Booking dispatch, the Booking domain's event consumer validates the Collaboration state independently — never by calling back into the Organization application service.

---

## 11. Migration Strategy

### Existing Assets to REUSE (do not modify)
| Existing Asset | How It Is Reused |
|---|---|
| `prisma/schema.prisma` → `User` model | Organization Members reference the existing `User.id` as a foreign key. The User model is NOT extended. |
| `shared/middleware/auth.middleware.ts` | All Organization routes use the same `authenticate` and `requireRole` middleware without modification. |
| `shared/eventbus/` | The `TypedEventEmitter` is the event bus. New Organization events are registered here by adding new event type signatures. |
| `shared/errors/AppError.ts` | All domain validation failures throw the same `AppError` classes (`.forbidden()`, `.badRequest()`). |
| `shared/db/` | The Prisma singleton is consumed by the new `infrastructure/repositories/`. |

### Existing Modules to EXTEND (additive only)
| Existing Module | Extension Required |
|---|---|
| `shared/eventbus/listeners.ts` | Register new Organization event listeners (`WorkerEmployed → Workforce`, `CollaborationFormed → Booking`). Additive only. |
| `src/database/seed-pricing.ts` | Add a seed for default Organization `Capability` definitions if they are stored in DB. |

### New Database Models Required (additive migrations only)
| New Model | Purpose |
|---|---|
| `Organization` | Root entity for the structural hierarchy |
| `Branch` | Geographical subdivision |
| `Department` | Functional subdivision |
| `Team` | Worker grouping |
| `OrganizationMembership` | Employment binding (User ↔ Organization) |
| `Invitation` | Time-bound join request |
| `Collaboration` | B2B agreement between two Organizations |
| `OrganizationCapabilityGrant` | Explicit capability assignments per Membership |

### Migration Rules
- All new models are **additive**. No existing columns or tables are modified.
- The existing `TeamMember` model (currently inside the `user` module as a partial/mocked implementation) must be evaluated for deprecation via a *separate, low-risk migration* — not as part of the Organization module introduction.
- All Prisma migrations must be gated behind a `ORGANIZATION_DOMAIN_ENABLED` feature flag at the application layer until the full domain is tested.

---

## 12. Risks

### Implementation Risks
| Risk | Description | Mitigation |
|---|---|---|
| **Domain Complexity** | The Organization aggregate has deep nested state (Branch → Department → Team). Reconstituting the full aggregate on every write is expensive. | Implement a `ShallowOrganizationRepository` that loads only the top-level aggregate without child entities for read-heavy paths. |
| **`TeamMember` Conflict** | The existing `TeamMember` model inside the `user` module has overlapping semantics with `OrganizationMembership`. | Deprecate `TeamMember` in a Phase 2 migration once Organization Membership is feature-complete. Do NOT attempt simultaneous refactor. |

### Scaling Risks
| Risk | Description | Mitigation |
|---|---|---|
| **Read Fan-out** | Fetching an organization with its full hierarchy (branches, departments, teams, members) can generate expensive JOIN queries. | Introduce a materialized view or a dedicated read model for the organizational hierarchy, separate from the aggregate's write model. |
| **Invitation TTL Scanning** | A cron job to expire invitations can create lock contention on large invitation tables. | Migrate the `ExpireInvitations` cleanup job to BullMQ so it runs with distributed locking. |

### Concurrency Risks
| Risk | Description | Mitigation |
|---|---|---|
| **Dual Primary Owner Race** | If two admin requests attempt to transfer ownership simultaneously, both could pass the validation check before the first one commits. | Apply an optimistic lock (version field) on the Organization aggregate row, or use a database-level `SELECT FOR UPDATE` inside the ownership transfer transaction. |
| **Duplicate Employment** | A worker accepting two invitations simultaneously (network retry scenario) could create two active Memberships. | Apply a unique database constraint on `(userId, status: ACTIVE)` in `OrganizationMembership` as a backstop behind the application-level policy. |

### Security Risks
| Risk | Description | Mitigation |
|---|---|---|
| **Invitation Token Brute Force** | If invitation tokens are short numeric codes, they are vulnerable to enumeration attacks. | Generate invitation tokens as full 256-bit cryptographic secrets (UUID v4 or HMAC). Rate-limit invitation acceptance attempts per IP. |
| **IDOR on Membership Routes** | An authenticated user could attempt to access or mutate another organization's membership by manipulating IDs. | All Application Service methods must validate `req.user.id` against the Organization's membership roster before executing. This must be enforced at the Application layer, not just by route guards. |
| **Capability Escalation** | An Organization Admin could try to grant themselves `TRANSFER_OWNERSHIP` capability if the Capability grant system is not properly gated. | The `TRANSFER_OWNERSHIP` capability must be permanently hardcoded as `PRIMARY_OWNER`-only in the `CapabilityResolver` domain service, never configurable. |

### Migration Risks
| Risk | Description | Mitigation |
|---|---|---|
| **Prisma Enum Additions** | Adding new enums to Prisma (e.g., `OrganizationVerificationStatus`) requires raw SQL `ALTER TYPE` before the migration runs. | Follow the documented migration procedure in `AGENTS.md` for enum additions. |
| **Feature Flag Bypass** | A misconfigured feature flag could expose an incomplete Organization API to production traffic. | Apply the `ORGANIZATION_DOMAIN_ENABLED` flag both at the route registration level and at the application service entry points. |
