# ADR-004: Event-Driven Organization Verification

**Status**: Accepted
**Date**: 2026-08-06
**Deciders**: Architecture Committee

---

## Context

An Organization must pass verification (KYB — Know Your Business) before it can dispatch Workers to platform-level loads. Verification involves calling government APIs (ULIP, DigiLocker) which are slow, asynchronous, and unreliable. The question was: should Organization verification be synchronous (blocking the creation API until government APIs respond), or asynchronous (fire-and-forget, result delivered via event)?

---

## Decision

**Organization Verification is fully event-driven and asynchronous.**

When an Organization submits its documents, the system returns immediately with a `PENDING_REVIEW` status. The `Verification` Domain processes the documents asynchronously (via BullMQ workers). When verification completes, it publishes a `VerificationPassed` or `VerificationRevoked` event on the platform EventBus. The `OrganizationVerificationService` in the Organization domain consumes this event and transitions the Organization's `VerificationStatus` accordingly.

---

## Rationale

1. **ULIP API Characteristics**: Government APIs (VAHAN, DigiLocker, SARATHI) are gated behind IP whitelisting, can take seconds to minutes, and frequently return 5xx errors. A synchronous call would hold HTTP connections open and degrade API reliability.
2. **Domain Separation**: The Verification domain is an independent bounded context (per Platform Domain Map v1.0). The Organization domain must not import or call Verification services directly. Events are the correct integration mechanism.
3. **Resilience**: If the Verification domain is temporarily unavailable, Organization creation still succeeds. Verification will complete when the queue drains.
4. **Auditability**: Every state transition (Pending → Verified, Verified → Revoked) is driven by a discrete, logged, replay-capable event rather than a silent database update.

---

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Synchronous API call at Organization creation | ULIP APIs are too slow and unreliable. Would cause timeouts and poor UX. |
| Polling: Organization polls Verification status | Polling creates unnecessary load and does not scale. Events are more efficient. |
| Manual admin verification only | Insufficient for a platform aiming for automated compliance. Manual is a fallback, not the primary path. |

---

## Event Contract

| Event | Publisher | Consumer |
|---|---|---|
| `OrganizationDocumentsSubmitted` | Organization Domain | Verification Domain |
| `VerificationPassed` | Verification Domain | Organization Domain |
| `VerificationRevoked` | Verification Domain | Organization Domain, Booking Domain, Dispatch Domain |

---

## Consequences

- **Positive**: Resilient, non-blocking Organization onboarding. The API responds in milliseconds regardless of government API performance.
- **Positive**: Verification failures and revocations automatically propagate to all dependent domains (Booking, Dispatch) via the EventBus without Organization needing to know about them.
- **Negative**: There is a window (Pending → Verified) where an Organization exists but cannot dispatch loads. The client application must handle and communicate this "verification in progress" state clearly.
- **Negative**: Event consumer ordering matters. `VerificationRevoked` consumed by Dispatch before Organization has processed it could create a brief state inconsistency window. Consumers must be idempotent.
