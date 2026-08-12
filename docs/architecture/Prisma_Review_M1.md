# Prisma Schema Review - M1 (Organization Foundation)

This document defines the minimal, strictly required database schema for **Milestone M1 (Organization Foundation)**. It exclusively supports Organization Creation, Primary Ownership, Verification tracking, and Soft Deletes. All other features (Branches, Teams, Shifts, etc.) are deferred to future milestones.

---

## 1. Schema Additions

### `Organization` Model
```prisma
model Organization {
  id                 String               @id @default(uuid())
  name               String
  legalName          String?
  gstin              String?
  panNumber          String?
  
  // Verification
  isVerified         Boolean              @default(false)
  verificationStatus OrgVerifStatus       @default(PENDING) // Enum: PENDING, VERIFIED, REJECTED
  
  // Audit & Soft Delete
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  deletedAt          DateTime?
  
  // Relations
  memberships        OrganizationMembership[]

  @@map("organizations")
}

enum OrgVerifStatus {
  PENDING
  VERIFIED
  REJECTED
}
```

### `OrganizationMembership` Model
```prisma
model OrganizationMembership {
  id               String       @id @default(uuid())
  organizationId   String
  userId           String
  
  // Ownership tracking
  isPrimaryOwner   Boolean      @default(false)
  isActive         Boolean      @default(true)
  
  // Audit & Soft Delete
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  deletedAt        DateTime?

  // Relations
  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  // A user can only have one active membership per organization
  @@unique([organizationId, userId])
  @@index([userId])
  @@index([organizationId])
  @@map("organization_memberships")
}
```

---

## 2. Modifications to Existing Models

### `User` Model
```prisma
model User {
  // ... existing fields ...
  
  // Add reverse relation (Prisma-level only, no DB schema changes to the `users` table)
  organizationMemberships OrganizationMembership[]
}
```
**Justification**: Prisma requires opposite relation fields for 1-to-N relationships. Adding this field to `User` generates no new columns in the underlying SQL `users` table. It purely informs the Prisma client of the linkage, allowing nested queries like `prisma.user.findUnique({ include: { organizationMemberships: true } })`.

---

## 3. Database Constraints

### Indexes
1. `OrganizationMembership(userId)`: Optimizes queries fetching a user's active organizations on login/token generation.
2. `OrganizationMembership(organizationId)`: Optimizes fetching all members belonging to a specific organization.

### Unique Constraints
1. `OrganizationMembership([organizationId, userId])`: A user cannot have multiple simultaneous duplicate memberships in the exact same organization.

### Foreign Keys & Cascade Rules
1. `OrganizationMembership.organizationId` -> `Organization.id` (`ON DELETE CASCADE`)
2. `OrganizationMembership.userId` -> `User.id` (`ON DELETE CASCADE`)
   - *Reasoning*: If an organization is hard-deleted or a user account is wiped due to GDPR/deletion requests, their membership join records must be purged automatically at the database level to prevent orphaned records.

---

## 4. Migration Notes & Strategy

- **Approach**: Purely additive migration. 
- **Backwards Compatibility**: 100%. Existing systems (Gig, Driver, Booking) have zero knowledge of these tables and will not be impacted. The legacy `TeamMember` table remains untouched.
- **Rollback Strategy**: Since these tables are wholly decoupled, reverting is as simple as dropping the `organizations` and `organization_memberships` tables.

---

## 5. Potential Risks

1. **Soft Delete vs Unique Constraint Collision**: If an `OrganizationMembership` is soft-deleted (`deletedAt` is set) and the same user is invited again, the database `@@unique([organizationId, userId])` constraint will throw a violation.
   *Mitigation*: M2 (Invitations) application logic must be designed to either hard-delete rejected/left memberships, or "restore" the existing soft-deleted record instead of attempting an `INSERT`.
2. **Primary Owner Integrity**: The schema does not strictly enforce "Exactly one Primary Owner per Organization" at the database level (as SQL lacks cross-row constraints without triggers). 
   *Mitigation*: This invariant must be strictly enforced via application-level transactional boundaries during Organization Creation.
