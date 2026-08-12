# ADR-001: Organization is a Bounded Context

**Status**: Accepted
**Date**: 2026-08-06
**Deciders**: Architecture Committee (Principal Architect, DDD Expert, Enterprise Architect, Modular Monolith Architect, Technical Writer)

---

## Context

The Parther Logistics platform's backend is a modular monolith serving multiple user roles: Customer, Driver, Fleet Owner, Worker, and Admin. As the platform grows to serve B2B enterprise clients, a structural way to group, manage, and govern business entities is needed. The question was: should "Organization" be a feature inside an existing module (e.g., `user` or `fleet-owner`), or should it be its own isolated Bounded Context?

---

## Decision

**Organization is defined as its own Bounded Context.**

The Organization module owns all concepts related to business entity structure (Branches, Departments, Teams), employment contracts (Memberships), invitations, and inter-organization collaborations. No other module is permitted to mutate Organization state directly.

---

## Rationale

1. **Distinct Language**: The vocabulary within the Organization domain ("Primary Owner", "Capability", "Collaboration") does not map cleanly onto the vocabulary of any existing module. Forcing it into `user` or `fleet-owner` would pollute those bounded contexts with alien concepts.
2. **Independent Lifecycle**: An Organization can exist, be verified, and be suspended entirely independently of whether it has an active Booking or a live vehicle. Its state machine is orthogonal to the logistics engine.
3. **Future Extraction**: Defining it as a Bounded Context now means it can be physically extracted into a microservice in the future without touching other modules. If it were embedded inside `user`, extraction would be extremely costly.
4. **Ownership Clarity**: Platform Domain Map v1.0 mandates that "which domain owns which capability?" has a single, unambiguous answer. Having Organization embedded in another domain creates dual ownership ambiguity.

---

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Add Organization fields to the `User` model | User is an Identity concept. Merging B2B hierarchy into User creates a God Model. |
| Extend `fleet-owner` module | Fleet Owner is a specific logistics concept. Not all Organizations own fleets. |
| Create a generic `company` field on User | Insufficient for modeling Branches, Departments, and Membership lifecycles. |

---

## Consequences

- **Positive**: Clean separation of concerns. Organization changes do not risk breaking Booking or Fleet logic.
- **Positive**: A dedicated team can own and evolve the Organization module independently.
- **Negative**: New surface area for cross-domain event wiring. Consumers of `WorkerEmployed` and `CollaborationFormed` events must be correctly registered.
- **Negative**: Initial implementation complexity is higher than adding fields to an existing model.
