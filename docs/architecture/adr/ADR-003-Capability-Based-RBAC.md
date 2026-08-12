# ADR-003: Capability-Based RBAC

**Status**: Accepted
**Date**: 2026-08-06
**Deciders**: Architecture Committee

---

## Context

The Organization domain requires a flexible access control model. The existing platform uses a flat `UserRole` enum (`CUSTOMER`, `DRIVER`, `ADMIN`, `FLEET_OWNER`, `WORKER`) enforced via `requireRole()` middleware. This is sufficient for platform-level access but cannot express the granular, organization-scoped permissions required for managing internal hierarchies (e.g., "can this Admin invite workers but not delete branches?").

The question was: should Organization use the existing flat `UserRole` enum with additional role values, or introduce a capability-based system?

---

## Decision

**The Organization Domain uses a Capability-Based Role System (RBAC) internally, independent of the platform-level `UserRole` enum.**

Each Organization Membership is assigned a `Role` (Primary Owner, Admin, Supervisor, Employee). Each `Role` is associated with a set of `Capabilities` (granular named actions). Authorization decisions within the Organization domain are resolved by the `CapabilityResolver` domain service, not by the HTTP middleware `requireRole()`.

---

## Rationale

1. **Platform Roles are Identity-Level, not Org-Level**: `UserRole.FLEET_OWNER` describes a person's relationship to the *platform*. `OrgRole.SUPERVISOR` describes their relationship to a *specific Organization*. These are different axes of authority.
2. **Granularity**: The flat enum system cannot express "Admin can invite but not delete". Capabilities can.
3. **Flexibility Without Complexity**: Using a fixed set of Roles (not infinite custom roles) keeps the permission model bounded and auditable, while Capabilities within each role still provide meaningful granularity.
4. **Isolation**: By keeping RBAC internal to the Organization domain, we avoid polluting the `shared/middleware/auth.middleware.ts` with Organization-specific concepts.

---

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Extend `UserRole` with org-specific values | The `UserRole` enum is a platform-level identity concern. Adding `ORG_ADMIN` to it would bleed domain concepts into the Identity layer. |
| Full ACL (Access Control Lists) per resource | Prohibitive complexity for a modular monolith at this stage. Every resource would need its own permission matrix entries. |
| No granular permissions, use Role only | A Supervisor who cannot invite but can schedule shifts cannot be expressed with roles alone. |

---

## Design

The `TRANSFER_OWNERSHIP` capability is **permanently hardcoded** to `PRIMARY_OWNER` role only inside the `CapabilityResolver` domain service. It is never configurable, never stored as a database grant, and can never be delegated. This is a security invariant, not a business rule.

---

## Consequences

- **Positive**: Granular, auditable access control that scales with business complexity.
- **Positive**: The `CapabilityResolver` is a pure domain service with no infrastructure dependencies — easily unit-tested.
- **Negative**: Two parallel authorization systems exist in the codebase. Developers must understand which layer applies: HTTP middleware for platform-level routes, `CapabilityResolver` for intra-organization actions.
- **Negative**: If future requirements demand custom roles (not just custom capability sets), this ADR must be revisited.
