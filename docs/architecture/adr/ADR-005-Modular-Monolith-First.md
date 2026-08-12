# ADR-005: Modular Monolith First

**Status**: Accepted
**Date**: 2026-08-06
**Deciders**: Architecture Committee

---

## Context

When designing the Organization Domain, the committee debated whether to extract it as a standalone microservice from day one, given its distinct bounded context boundary. The existing platform is a Node.js/TypeScript modular monolith deployed on a single droplet. The team is small, and the platform has not yet reached production certification.

---

## Decision

**The Organization Domain is implemented as a module inside the existing modular monolith. Microservices extraction is explicitly deferred.**

The domain will be structured with clean internal layering (`domain/`, `application/`, `infrastructure/`, `presentation/`) that creates a natural seam for future extraction, but will be physically co-located in the same process as all other modules.

---

## Rationale

1. **Team Size**: A microservices architecture requires dedicated infrastructure (API gateway, service discovery, distributed tracing, separate CI/CD pipelines). The current engineering team size does not justify this overhead.
2. **Production Readiness**: The 2026-07-11 security audit identified 9 Critical and 24 High risks across the existing monolith. Introducing a separate microservice while the monolith is not production-certified would add operational complexity without business value.
3. **Shared Infrastructure Costs**: At current traffic volumes, a separate Organization microservice would share the same Postgres database anyway (distributed databases introduce consistency challenges the team is not yet equipped to handle).
4. **Natural Seams Preserved**: The Organization module is being built with internal layering identical to what a microservice would require. If extraction becomes necessary, the migration path is well-defined in the Technical Blueprint (Organization_Technical_Blueprint_v1.0.md).
5. **Incremental Value Delivery**: A modular monolith allows the Organization feature to be shipped incrementally milestone by milestone, with each milestone producing a working backend. A greenfield microservice would require all infrastructure to be ready before anything can be deployed.

---

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Extract as microservice from day one | Operational overhead unjustified at current team size and traffic. |
| Embed Organization logic in existing `user` module | Violates bounded context principle. Makes future extraction prohibitively expensive. |
| Build as a separate serverless function | Adds cold-start latency to Organization APIs. Stateful domain logic (aggregates, policies) does not map well to serverless execution models. |

---

## Future Extraction Criteria

This decision should be revisited when ANY of the following conditions are met:
1. Organization-related API traffic accounts for more than 30% of total platform load.
2. The team grows to a point where two teams actively maintain the Organization and Booking domains simultaneously, causing merge conflicts.
3. Compliance requirements mandate that Organization PII (business registrations, tax IDs) be stored in a physically isolated datastore.
4. The platform achieves production certification and a dedicated DevOps capacity exists.

---

## Consequences

- **Positive**: Fast time-to-market. No new infrastructure required. Shared database transaction support for cross-domain writes during migration.
- **Positive**: Clean module boundaries enforce the same discipline as microservices without the operational cost.
- **Negative**: A poorly disciplined engineer could bypass the module boundary and import Organization services directly into Booking or Fleet. Architectural linting (e.g., `eslint-plugin-import` rules) should be configured to prevent this.
- **Negative**: A future microservice extraction will require implementing a proper distributed event bus (e.g., Kafka or RabbitMQ) to replace the current in-process `TypedEventEmitter`.
