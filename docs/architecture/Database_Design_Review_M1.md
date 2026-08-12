# Database Design Review: Organization M1 Schema

This review evaluates the proposed `Prisma_Review_M1.md` schema against future scalability, technical debt, and database integrity requirements, avoiding any business or domain logic redesign.

---

## 1. Enum vs Boolean Fields
**Finding**: There is state redundancy and lack of future scalability in the current boolean fields.
- **`Organization.isVerified` AND `Organization.verificationStatus`**: These are redundant. If `verificationStatus` is `VERIFIED`, `isVerified` is implied. The boolean field introduces the risk of split-brain state (e.g., `isVerified = true` but `verificationStatus = REJECTED`).
  *Recommendation*: Drop `isVerified`. Rely entirely on `verificationStatus` enum.
- **`OrganizationMembership.isActive`**: A simple boolean is insufficient for M2 (Invitations & Lifecycle). A membership state machine typically flows through: `INVITED`, `ACTIVE`, `SUSPENDED`, `TERMINATED`.
  *Recommendation*: Replace `isActive` with a `MembershipStatus` enum.

## 2. Future Scalability
**Finding**: The `isPrimaryOwner` boolean is currently embedded in the membership.
- M3 will introduce Capability-based RBAC. Having `isPrimaryOwner` as a hardcoded boolean risks conflicting with future dynamic role grants.
  *Recommendation*: Keep `isPrimaryOwner` for M1 to satisfy the immediate "Single Primary Owner" invariant, but acknowledge it will serve as the "root" anchor that bypasses standard RBAC checks in M3.

## 3. Soft Delete Strategy & 4. Partial Unique Indexes
**Finding**: Critical database integrity flaw regarding soft deletes.
- The `deletedAt` field combined with the `@@unique([organizationId, userId])` constraint will cause catastrophic failures. Prisma/PostgreSQL `@@unique` does not natively filter out soft-deleted rows. If User A leaves an Org (gets soft-deleted), and is later re-invited, the `INSERT` will fail due to the unique constraint on `[organizationId, userId]`.
- Prisma does not natively support partial unique indexes (e.g., `UNIQUE WHERE deletedAt IS NULL`).
  *Recommendation*: To resolve this without manual raw SQL migrations:
  1. Remove `deletedAt` from `OrganizationMembership` and rely strictly on a `TERMINATED` enum state, OR
  2. Maintain `deletedAt` but change the constraint to `@@unique([organizationId, userId, deletedAt])`. Since PostgreSQL treats `NULL != NULL`, this allows a single active row (where `deletedAt` is default, perhaps `epoch 0` if not using null) or handles it via application-level upserts. 
  *Safest path for Prisma*: Drop `deletedAt` on the join table. Use a `MembershipStatus` enum (e.g., `TERMINATED`) instead of soft deleting the row.

## 5. Transaction Boundaries
**Finding**: The "exactly one Primary Owner" constraint cannot be modeled in pure SQL schema without complex triggers.
  *Recommendation*: M1 application layer MUST wrap `Organization` creation and `OrganizationMembership` creation in a single Prisma `$transaction`. If the transaction fails, neither is created. Ownership transfers in M3 will require a strict transaction to toggle `isPrimaryOwner` atomically between two rows.

## 6. Naming Conventions
**Finding**: Naming is generally solid and consistent with the existing `User` and `FleetOwner` models.
- *Recommendation*: Ensure `OrgVerifStatus` is consistent with the existing `UlipVerifStatus` and `DigiKycStatus` patterns found in the `schema.prisma`. Using `PENDING`, `VERIFIED`, `REJECTED` perfectly aligns with existing paradigms.

## 7. Auditability
**Finding**: The schema tracks *when* (`createdAt`, `updatedAt`) but not *who*.
- In enterprise domains, knowing who deleted an organization, who verified it, or who terminated a membership is a strict compliance requirement.
  *Recommendation*: Add `createdBy` and `updatedBy` (referencing `User.id`) to `Organization`. For verification, adding `verifiedBy` and `verifiedAt` is highly recommended to track which admin approved the business.

## 8. Query Performance
**Finding**: Indexing is mostly correct but misses business-critical lookups.
- `@@index([userId])` and `@@index([organizationId])` on the membership table are correct and essential.
- *Recommendation*: Add a search index on `Organization.gstin` and `Organization.panNumber`. These will be frequently queried to prevent duplicate business registrations (e.g., preventing two users from registering the same company).

## 9. Future M2 Compatibility (Invitations)
**Finding**: M2 relies heavily on knowing how a membership originated.
- When an invite is accepted in M2, the system will convert an Invitation into a Membership.
  *Recommendation*: While not strictly required for M1, adding an optional `joinedAt` `DateTime` field will distinguish between when the record was created (e.g., during the invite phase) vs when the user actually accepted and became active.

## 10. Migration Safety
**Finding**: The additive approach is 100% safe.
- *Recommendation*: The reverse relation added to the `User` model (`organizationMemberships`) is Prisma-level only and requires zero downtime or lock-waits on the `users` table during the Postgres migration. Proceed with confidence.

---

## Executive Summary of Recommendations for M1 Schema:

1. **Remove** `Organization.isVerified` (Redundant with `verificationStatus`).
2. **Replace** `OrganizationMembership.isActive` with `MembershipStatus` Enum to support future M2 states.
3. **Drop** `deletedAt` on `OrganizationMembership` and rely on `MembershipStatus = TERMINATED` to avoid Prisma unique constraint collisions upon re-invitation.
4. **Add** `verifiedAt` and `verifiedBy` to `Organization` for compliance auditing.
5. **Add** `@@unique` constraints or standard indexes to `Organization.gstin` and `Organization.panNumber` to prevent duplicate corporate signups.
