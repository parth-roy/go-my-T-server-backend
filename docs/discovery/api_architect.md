# API Architecture Discovery Report: Organizations and Workforce
**Date:** 2026-08-06
**Scope:** `src/modules` (`*.controller.ts`, `*.router.ts`, `*.schema.ts`)

## 1. Overview
This report details the implementation of concepts related to Organization, Company, Enterprise, Contractor, Vendor, Branch, Department, Team, Project, Shift, Worker, Ownership, Membership, Role, Permission, Invitation, Collaboration, Employment, and Verification within the backend API modules.

---

## 2. Concepts Found & Analysis

### 2.1. Enterprise & Organization (Company, Contractor, Vendor)
- **Exists:** Yes, primarily represented via `usageType` (Business Usage) for users, and through "Fleet Owners" functioning as transport companies. 
- **Location:** `user/user.schema.ts`, `fleet-owner/fleet-owner.schema.ts`, `fleet-owner/fleet-owner.router.ts`.
- **APIs:** 
  - `POST /fleet-owners/register` (Registers an organizational fleet owner).
  - `POST /api/v1/bookings/:id/bids` (Enterprise Live Bidding for contractors/vendors).
- **Services/DB:** `User` table (`usageType: 'Business Usage'`), `FleetOwner` profile table.
- **Enums:** `usageType: ['Business Usage', 'Personal Usage', 'House Shifting Usage']`
- **Status:** Production-ready. Partially implemented Enterprise features for Live Bidding.
- **Missing:** Explicit "Branch" or "Department" models do not exist in the codebase.

### 2.2. Team, Collaboration & Membership
- **Exists:** Yes, for Enterprise usage (Business users).
- **Location:** `user/user.controller.ts`, `user/user.router.ts`, `user/user.schema.ts`.
- **APIs:** 
  - `GET /api/v1/users/me/team`
  - `POST /api/v1/users/me/team` (Add Team Member)
  - `PATCH /api/v1/users/me/team/:id`
  - `DELETE /api/v1/users/me/team/:id`
- **Roles within Team:** `ADMIN`, `MANAGER`, `VIEWER`.
- **Status:** Production-ready.

### 2.3. Worker & Employment (Contractors, Shifts)
- **Exists:** Yes, implemented as `Workforce` and `Gigs` (Shift/Project work).
- **Location:** `workforce/workforce.router.ts`, `workforce/workforce.admin.controller.ts`, `gig/gig.router.ts`, `gig/gig.schema.ts`.
- **APIs:**
  - `GET /api/v1/workforce/jobs/active`
  - `GET /api/v1/workforce/jobs/available`
  - `POST /api/v1/gig/customer` (Customer creates a shift/project)
  - `POST /api/v1/gig/:id/accept` (Worker accepts gig)
  - `GET /api/v1/admin/workforce` (Admin management)
- **Concepts Map:** 
  - *Worker*: `UserRole.WORKER`
  - *Project/Shift*: `Gig`
  - *Employment/Contractor*: Fleet Drivers owned by Fleet Owners (`/fleet-owners/drivers`).
- **Enums:** Gig Skills (`HELPER`, `LOADER`, `ELECTRICIAN`, etc.).
- **Status:** Production-ready. 

### 2.4. Ownership
- **Exists:** Yes, in the context of Fleet Owners managing trucks and drivers.
- **Location:** `fleet-owner/fleet-owner.controller.ts`.
- **APIs:** 
  - `POST /api/v1/fleet-owners/trucks`
  - `PATCH /api/v1/fleet-owners/trucks/:truckId/assign-driver`
- **Status:** Production-ready.

### 2.5. Roles & Permissions
- **Exists:** Yes, enforced via JWT middleware.
- **Location:** Routers across all modules (`workforce.router.ts`, `gig.router.ts`, `marketplace.router.ts`, etc.).
- **Implementation:** `requireRole(UserRole.WORKER)`, `requireRole(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.FLEET_OWNER)`.
- **Enums:** `UserRole` (`ADMIN`, `CUSTOMER`, `DRIVER`, `FLEET_OWNER`, `WORKER`).
- **Status:** Fully integrated.

### 2.6. Verification
- **Exists:** Yes, extensive automated and manual verification systems.
- **Location:** `ulip/ulip.controller.ts`, `ulip/ulip.router.ts`, `workforce/workforce.admin.controller.ts`.
- **APIs:** 
  - `POST /api/v1/ulip/sarathi/verify` (Driving License via BullMQ worker)
  - `POST /api/v1/ulip/vahan/verify` (Vehicle RC)
  - `POST /api/v1/ulip/fastag/verify`
  - `POST /api/v1/ulip/echallan/verify`
  - `POST /api/v1/ulip/digilocker/init` (KYC Aadhaar & PAN)
  - `POST /api/v1/admin/workforce/:id/revoke-verification` (Admin manual override)
- **Status:** Advanced implementation using async message queues (`ulipVerificationQueue`).

---

## 3. Detected Issues & Artifacts

### 3.1. Mock Logic / Fake implementations
- **Payment Mocking (Dev Only):** Found in `payment/payment.controller.ts` (Line 362). There is a `mockPaymentSuccess` endpoint exposed via `POST /api/v1/payments/mock-success`. The code correctly blocks execution in production (`if (process.env.NODE_ENV === 'production') throw AppError.forbidden(...)`), generating mock transaction refs `MOCK_TXN_` for testing workflow statuses without real money.

### 3.2. Dead Code / Unused Models
- **No explicit Branch / Department schema:** The organization concepts are flattened. If an Enterprise wants multiple branches, it currently appears they must operate out of the team members' structures or standard addresses.

### 3.3. TODOs & Commented Features
- **Manual Verification Fallbacks:** In `workforce.admin.controller.ts` (Line 119), `revokeVerification` sets documents to "pending" to be re-evaluated later.
- **Enterprise Live Bidding:** Marked explicitly in `booking.controller.ts` but heavily overlaps with standard booking logic. Looks to be an experimental/future-growth area to capture large enterprise contracts.

### 3.4. Future Placeholders
- **Training Module:** `training.workforce.controller.ts` contains `getCourses` and `updateProgress` endpoints, establishing a skeletal footprint for future worker upskilling and certification tracking. It lacks heavy business logic validation, indicating it is likely a newer or partially implemented capability.

---
**Summary:** The architecture favors flattening organizations into `Team Members` and `Fleet Owners` rather than building hierarchical RBAC trees with Departments/Branches. Verification is heavily automated via external integrations (ULIP / Digilocker) using job queues.
