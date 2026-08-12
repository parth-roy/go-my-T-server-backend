# ADR-002: One Active Employment Rule

**Status**: Accepted
**Date**: 2026-08-06
**Deciders**: Architecture Committee

---

## Context

A Worker on the Parther platform can be either an Independent Worker (working autonomously through the marketplace) or an Employee of a specific Organization. The question arose: should a Worker be allowed to hold Employment relationships with multiple Organizations simultaneously?

---

## Decision

**A Worker can hold exactly one active Employment relationship at any given time.**

If a Worker is employed by Organization A and receives an Invitation from Organization B, they must resign or be terminated from Organization A before the Invitation from B can be accepted. Upon leaving any Organization, the Worker immediately reverts to Independent Worker status.

---

## Rationale

1. **Legal Liability Clarity**: If a Worker causes an incident on a load, it must be unambiguously clear which Organization (if any) is responsible for their deployment. Dual employment creates legal ambiguity.
2. **Shift Scheduling Integrity**: If a Worker belongs to two Organizations simultaneously, their shift schedule could be double-booked by two separate Supervisors, leading to unresolvable conflicts.
3. **Dispatch Correctness**: The Dispatch Engine assigns loads based on Worker availability. A Worker with two organizational affiliations would receive conflicting availability signals.
4. **Platform Simplicity**: Implementing access control for a Worker operating under two Capability sets simultaneously would require a role resolution system of prohibitive complexity.

---

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Allow multiple passive memberships | Passive memberships still create capability ambiguity and scheduling conflicts. |
| Allow multiple memberships with one "primary" | Defining what "primary" means in a legal/billing context introduces unresolvable edge cases. |
| No enforcement, leave to client apps | Client-side enforcement is insufficient for a financial-grade platform. A database constraint is mandatory. |

---

## Enforcement Mechanism

This rule is enforced at two levels:
1. **Application Layer**: `ExclusiveEmploymentPolicy` checks `MembershipRepository.findActiveByUserId()` before accepting any Invitation.
2. **Database Layer**: A unique constraint on `(userId, status: ACTIVE)` in the `OrganizationMembership` table acts as a backstop against race conditions.

---

## Consequences

- **Positive**: Unambiguous legal responsibility, clean dispatch signals, simple Capability resolution.
- **Positive**: A unique database constraint makes this invariant bulletproof against concurrent requests.
- **Negative**: A Worker wanting to switch organizations must explicitly resign first, adding friction. This is an intentional and accepted UX trade-off.
- **Negative**: Future "contractor who serves multiple clients" use cases cannot be modeled without revisiting this ADR.
