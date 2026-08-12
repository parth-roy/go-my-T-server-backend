# Domain Driven Design (DDD) Discovery: Organization & Workforce

## 1. Domain Overview
The analysis focused on discovering concepts related to Organization, Company, Enterprise, Contractor, Vendor, Branch, Department, Team, Project, Shift, Worker, Ownership, Membership, Role, Permission, Invitation, Collaboration, Employment, and Verification.

## 2. Concept Mapping & Locations

### 2.1 Organizations, Enterprise & Company
- **Does it exist?** Yes, but not as standalone aggregates. 
- **Where is it located?** `src/modules/user/user.service.ts` and `src/modules/fleet-owner/fleet-owner.service.ts`.
- **Implementation Status:** Partially implemented.
- **Details:** 
  - **Enterprise**: Represented simply as a `User` with a `usageType` (e.g., `'Business Usage'`). Enterprise logic is heavily coupled into the `user` module as `TeamMembers`. It is not a distinct domain model.
  - **Company**: Implemented merely as a `companyName` string field on the `FleetOwner` and `Lead` models. 
  - **Contractor / Vendor**: No explicit abstractions exist. They are implicitly treated as `FleetOwner` or `Driver`.
  - **Branch / Department / Project**: **Not Implemented.** Unused concepts.
  - **Shift**: **Not Implemented.** Only appears as static text in notifications (`"Stay hydrated on long shifts"` in `workforce.service.ts`).

### 2.2 Workforce & Workers
- **Does it exist?** Yes.
- **Where is it located?** `src/modules/workforce/`
- **Implementation Status:** Production ready.
- **Details:** Well encapsulated in its own domain. Contains abstractions like `Worker`, `WorkerDocument`, `WorkerBadge`, `WorkerWallet`, `WorkerWalletTransaction`, and `WorkerTrainingProgress`. Connects seamlessly to a `User` via the `UserRole.WORKER`.

### 2.3 Team, Membership & Collaboration
- **Does it exist?** Yes.
- **Where is it located?** `src/modules/user/user.controller.ts` & `user.service.ts`
- **Implementation Status:** Production ready but suffers from **Domain Leak**.
- **Details:** Modeled via the `TeamMember` database table. A `TeamMember` is owned by an "Enterprise" (a `User` referenced via `ownerId`). All logic for CRUD operations on team members is leaked into the generic `user` module rather than a dedicated `team` or `organization` module.

### 2.4 Roles & Permissions
- **Does it exist?** Yes.
- **Where is it located?** Schema enums, `user.schema.ts`, middleware.
- **Implementation Status:** Production ready.
- **Details:** 
  - **System Roles:** Managed via `UserRole` enum (`CUSTOMER`, `DRIVER`, `FLEET_OWNER`, `ADMIN`, `WORKER`).
  - **Team Roles:** Handled via a loose string field on `TeamMember` restricted by Zod validation to `'ADMIN'`, `'MANAGER'`, `'VIEWER'`.
  - **Permissions:** No granular permission models or tables exist. Security is purely role-based via the `requireRole` middleware.

### 2.5 Verification & Employment
- **Does it exist?** Yes.
- **Where is it located?** `src/modules/ulip/` and `src/modules/fleet/`
- **Implementation Status:** Production ready.
- **Details:** 
  - **Verification:** Strongly backed by the `VerificationLog` model for audit trails. Handled across `ulip` (Unified Logistics Interface Platform for Digilocker, FASTag) and `fleet` (VAHAN, SARATHI verifications). 
  - **Employment / Invitation:** Represented loosely. For instance, when a driver is added to a fleet, a notification is dispatched (`"...has added you to their fleet"`), acting as an implicit invitation.

## 3. Architectural Violations & Recommendations

1. **Domain Leaks:** 
   - `TeamMember` logic is tightly coupled into the `user` module. It should be refactored into an `organization` or `team` module to respect aggregate boundaries.
   - Verification logic is split across `ulip`, `fleet`, and `workforce`.
2. **Duplicate/Disconnected Concepts:** 
   - "Enterprise" and "Fleet Owner" are completely separate representations of organizations. An Enterprise uses `TeamMember`, whereas a Fleet Owner uses `companyName` and `FleetDriver`. These parallel corporate abstractions are disconnected and do not share a common `Organization` base model.
3. **Unused / Mocked Logic:**
   - Some verification layers have mocked development logic (`[DEV MODE] Driving license mock-verified`).
4. **Missing Concepts:**
   - Branch, Department, Project, and Shift do not exist in the codebase. Granular permissions (RBAC beyond basic Roles) are also absent.
