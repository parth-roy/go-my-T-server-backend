# Principal Software Architect Discovery Report

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


---

# Prisma Database Architecture: Organizations & Workforce

## Overview
An exhaustive analysis of `schema.prisma` and the backend codebase (`src/modules/*`) reveals a highly detailed ecosystem for Vendors (`FleetOwner`) and Gig Workers (`Worker`). Conversely, Enterprise/Team structures (`TeamMember`) are only partially implemented.

Below is the detailed breakdown of all requested concepts:

---

## 1. Enterprise & Team Collaboration (Organization / Company / Team / Role / Permission)
- **Concepts Discovered:** Enterprise Customers, Team Members, Roles.
- **Database Models:** `TeamMember`, `User` (with `UserRole.CUSTOMER`).
- **Enums:** Roles are hardcoded string literals in the schema (`"ADMIN"`, `"MANAGER"`, `"VIEWER"`).
- **Module Location:** `src/modules/user/user.service.ts`
- **Production Readiness:** **Partially Implemented / Mock Feature**.
- **Analysis:** 
  - The `TeamMember` model allows an enterprise customer (the `ownerId`) to create a roster of team members.
  - **Missing Feature:** There is **no authentication or login flow** implemented for `TeamMember`. They have no password fields and no integration with the `auth` module. Currently, they function purely as a contact directory or metadata list for the primary customer account. They cannot act collaboratively or autonomously on the platform.

## 2. Fleet & Vendor Management (Vendor / Contractor / Ownership / Membership)
- **Concepts Discovered:** Fleet Owner (Vendor Company), Fleet Driver (Membership), Fleet Truck (Ownership).
- **Database Models:** `FleetOwner`, `FleetDriver`, `FleetTruck`, `TruckAssignment`, `FleetTruckUsage`, `FleetWallet`, `FleetWalletTransaction`, `FleetEarning`, `FleetMaintenance`, `FleetFuelLog`, `FleetTruckDocument`, `WithdrawalRequest`.
- **Enums:** `UserRole.FLEET_OWNER`, `WithdrawalEntityType.FLEET`.
- **Module Location:** `src/modules/fleet-owner`, `src/modules/fleet-wallet`.
- **Production Readiness:** **Production Ready (Highly Developed)**.
- **Analysis:** 
  - Fleet owners act as contractors/vendors. They can manage vehicles and expenses (fuel logs, maintenance).
  - **Invitation / Membership:** Fleet owners do not create driver accounts. Instead, they "invite" or associate existing registered `Driver` accounts to their fleet via phone number (`addFleetDriver` in `fleet-owner.service.ts`).
  - **Ownership:** Payouts and earnings are tracked rigidly, incorporating RazorpayX via `bankVerified` and `razorpayxContactId` fields.

## 3. Workforce & Labor (Worker / Gig Worker / Employment / Shift)
- **Concepts Discovered:** Gig Workers, Laborers (Loading/Unloading), Shifts/Availability, Gamification, Training.
- **Database Models:** `Worker`, `WorkerDocument`, `WorkerWallet`, `WorkerWalletTransaction`, `JobAssignment`, `Badge`, `WorkerBadge`, `TrainingCourse`, `WorkerTrainingProgress`.
- **Enums:** `UserRole.WORKER`, `WorkerStatus`, `WorkerJobStatus`, `LaborType` (LOADING, UNLOADING, BOTH), `WorkerWalletReason`, `BadgeTier`, `BadgeMetric`, `CourseLevel`, `CourseStatus`.
- **Module Location:** `src/modules/workforce`, `src/modules/dispatch`, `src/modules/gamification`, `src/modules/training`.
- **Production Readiness:** **Production Ready (Standalone Ecosystem)**.
- **Analysis:** 
  - Workers have their own distinct mobile app flow (OTP login, wallet, SOS, live tracking).
  - **Dispatch Logic:** Handled in `dispatch.service.ts`. The system uses Haversine distance and `preferredTypes` to push job alerts via Socket.io and FCM to nearby workers (up to 10 workers within a 30km radius).
  - Gamification (badges, points) and training progression are fully functional and persist to the database.

## 4. Standalone Gig Economy (Project / Tasks)
- **Concepts Discovered:** Isolated fixed-task jobs independent of vehicle bookings.
- **Database Models:** `GigJob`, `GigAssignment`, `GigPricingConfig`.
- **Enums:** `GigJobStatus` (PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED).
- **Module Location:** `src/modules/gig`.
- **Production Readiness:** **Production Ready**.
- **Analysis:** 
  - Exists as a parallel ecosystem to standard `Booking` logic. Evaluates nearest workers via distance constraints and assigns specific tasks (e.g., "HELPER", "FURNITURE_MOVER").

## 5. Verification & Compliance
- **Concepts Discovered:** Government ID Verification, KYC, Legal Audit Trails.
- **Database Models:** `VerificationLog`.
- **Enums:** `UlipVerifStatus` (SARATHI/VAHAN), `DigiKycStatus` (Digilocker Aadhaar/PAN).
- **Module Location:** `src/modules/ulip`.
- **Production Readiness:** **Production Ready**.
- **Analysis:** 
  - `Worker` and `Driver` onboarding enforce strict KYC.
  - `VerificationLog` is used specifically to store raw JSON responses from government APIs. A schema comment explicitly denotes this as a **"legal proof of what the government returned. Required for compliance, dispute resolution, and auditing."**

---

## 6. Undiscovered Concepts
The following terms were searched for but **do not exist** as distinct models or modules in the codebase:
- `Branch`, `Department`, `Project`, `Shift` (availability is toggled via `WorkerStatus.AVAILABLE`, rather than explicit time-blocked shifts).

---

## 7. Code Anomalies (Dead Code, Mock Logic, Unused Fields)
- **Mock Feature (TeamMember):** As stated, `TeamMember` has no auth loop, making it a mock UI feature for collaborative enterprise dashboards.
- **Legacy Field (GigJob.gigType):** The `gigType` field in `GigJob` is marked as a *"legacy free-text kept for old records"*, actively superseded by `gigCategory`.
- **Mock Payment (DriverSubscription):** The `paymentMethod` field includes a mock fallback comment: `// 'razorpay' | 'upi' | 'mock'`.
- **Mock Pricing Estimation (Gig Service):** In `gig.service.ts`, `estimateGigFare` returns a static/calculated payload without persisting to the DB, explicitly noted as: *"Estimate only. Actual fare computed at booking time."*
- **Loose Types (GigPricingConfig):** In `gig.service.ts`, pricing config is queried via a loose type cast `(prisma as any).gigPricingConfig` which indicates a slight schema generation mismatch in the dev environment.


---

# Backend Architecture Discovery: Organizations & Workforce

## 1. Enterprise & Teams (Organization, Branch, Department, Team, Collaboration)
*   **Existence**: Yes, partially implemented as **Enterprise Teams**.
*   **Location**: `src/modules/user/user.service.ts` (under `TEAM MEMBERS (ENTERPRISE)` section).
*   **Module Owner**: `user` module.
*   **Database Models**: `TeamMember` (Links to `User` via `ownerId`).
*   **Attributes**: `name`, `email`, `phone`, `role` (e.g., ADMIN, MANAGER, VIEWER), `isActive`.
*   **APIs**: `getTeamMembers`, `addTeamMember`, `updateTeamMember`, `deleteTeamMember`.
*   **Production Readiness**: **Partial**. It supports basic CRUD and prevents duplicate phones (`TEAM_DUPLICATE`), but lacks advanced hierarchy (Departments/Branches/Nested Teams).
*   **Hidden/Duplicate Concepts**: No separate `Enterprise` or `Organization` models; it relies on the base `User` as the "Owner".

## 2. Fleet Companies & Vendors (Company, Vendor, Contractor, Fleet Owner, Membership, Invitation)
*   **Existence**: Yes, robustly implemented as **Fleet Owners**.
*   **Location**: `src/modules/fleet-owner/fleet-owner.service.ts`, `src/modules/fleet/fleet.service.ts`.
*   **Module Owner**: `fleet-owner` and `fleet` modules.
*   **Database Models**: `FleetOwner` (has `companyName`, `gstin`, `pan`), `FleetDriver` (Junction table linking `FleetOwner` and `Driver` for membership).
*   **Concepts Used**:
    *   **Membership & Invitation**: Fleet Owners can invite drivers (`fleet-owner.service.ts`). An FCM notification is sent: `"Fleet Invitation"`.
    *   **Collaboration**: Drivers linked via `FleetDriver` (with `isActive` flag) can be dispatched by the Fleet Owner for jobs.
*   **Production Readiness**: **Ready**. Complete with wallet integration (`FleetWallet`), banking details for payouts, and active driver management.

## 3. Gig Workers & Shifts (Worker, Gig, Shift, Job Assignment)
*   **Existence**: Yes, fully implemented via **Workforce / Gigs**.
*   **Location**: `src/modules/workforce/workforce.service.ts`, `src/modules/gig/gig.service.ts`.
*   **Module Owner**: `workforce` and `gig` modules.
*   **Database Models**: `Worker`, `WorkerDocument`, `WorkerWallet`, `GigJob`, `GigAssignment`, `WorkerTrainingProgress`, `WorkerBadge`.
*   **Concepts Used**:
    *   **Worker**: Represents independent laborers. Tracks `maxWeightKg`, `preferredTypes`, `acceptanceRate`.
    *   **Project / Shift**: Modeled as `GigJob`. Has `workersNeeded`, `perWorkerRate`, `durationHours`.
    *   **Job Assignment**: `GigAssignment` tracks status (`PENDING_ACCEPTANCE`, `ACCEPTED`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`).
*   **Production Readiness**: **Ready**. Extensive features including real-time SOS alerts, pricing calculation (`GigPricingConfig`), spatial calculation (`getNearestWorkerDistanceKm`), and wallet payouts via RazorpayX.

## 4. Roles, Permissions & Verification
*   **Roles & Permissions**:
    *   **Enums**: `UserRole` (`CUSTOMER`, `DRIVER`, `FLEET_OWNER`, `ADMIN`, `WORKER`).
    *   **Usage**: Heavily enforced across modules. For example, `marketplace.service.ts` has strict actor-based permissions (e.g., only CUSTOMER can accept bids, only DRIVERS/FLEET_OWNERS can bid).
*   **Verification**:
    *   **Location**: `src/modules/ulip/ulip.service.ts`, `src/modules/fleet/fleet.service.ts`, `fleet/sarathi.service.ts`, `fleet/vahan.service.ts`.
    *   **Logic**: Exhaustive government API integration via ULIP for VAHAN (RC), SARATHI (DL), and DigiLocker (Aadhaar/PAN).
    *   **Enums**: `DocumentStatus` (PENDING, VERIFIED, REJECTED), `UlipVerifStatus` (PENDING, VERIFIED, FAILED).
    *   **Production Readiness**: **Ready**, but relies heavily on mock flags for local development.

---

## Rigorous Code Detection Findings

### 1. Mock Logic & Stubs
*   **ULIP & Gov APIs**: Extensive mock logic across `ulip.service.ts` and `fleet.service.ts`. Controlled by `env.MOCK_ULIP === 'true'`. Returns dummy data like `"MOCK DRIVER NAME"`, `"mock_auth_code"`, and skips actual VAHAN/SARATHI calls.
*   **Demo Accounts**: Found in `workforce.service.ts` (`DEMO_ACCOUNTS`) hardcoded for Apple Reviewers (`'9999999999'` with static OTP `'123456'`).
*   **Payments**: `subscription.service.ts` contains mock payment logic (`paymentMethod: paymentReference ? 'razorpay' : 'mock'`). Comments explicitly state: *"In Phase 1 (mock payment), this creates the subscription immediately."*

### 2. TODOs & Future Placeholders
*   **Dead-Letter Queues**: `booking.service.ts` line 1042: `// TODO: Push to a dead-letter queue for manual reconciliation`.
*   **Spatial Queries**: `gig.service.ts` line 161 has a placeholder for future enhancement: `// Return all PENDING gigs - radius filter can be added with PostGIS in future`. Currently falls back to a brute-force distance calculation `getNearestWorkerDistanceKm`.
*   **Gamification**: `gamification.service.ts` mentions `// Assuming we add onTimeRate to Worker eventually, for now mock as 100%`.

### 3. Duplicate Concepts & Stale Comments
*   **Badges**: `workforce.service.ts` contains a comment `// BADGES (mock - no DB tables yet)` near the `getBadges` function. However, the database schema **does** contain `Badge` and `WorkerBadge` models, indicating the comment is stale or the feature is partially migrated from mock to DB.

### 4. Hidden / Experimental Features
*   **Admin Verification Override**: `fleet.service.ts` contains a hidden feature allowing admins to manually override driver/vehicle verification (`P3-4: Manually override a driver's verification status (ADMIN ONLY)`), useful when ULIP APIs are down.
*   **Worker SOS Functionality**: Found in `workforce.service.ts`. Emits a real-time `sos_alert` to an `admin` socket room with lat/lng coordinates and a Google Maps link.


---

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


---

# TypeScript Expert Discovery Report: Organizations & Workforce

## 🔍 Scope of Analysis
- **Target Directories:** `src/shared/` (Middlewares, Types, Utils, Background Workers, Sockets, Eventbus)
- **Global Type Definitions:** `prisma/schema.prisma` (Source of truth for generated TS types/enums) & `src/shared/types/express.d.ts`.
- **Search Domains:** Organization, Company, Enterprise, Contractor, Vendor, Branch, Department, Team, Project, Shift, Worker, Ownership, Membership, Role, Permission, Invitation, Collaboration, Employment, Verification.

---

## 1. Concept Discoveries

### 🏢 Organization / Enterprise / Company
- **Exists:** Partially Implemented.
- **Location:** `prisma/schema.prisma`, `src/shared/middleware/auth.middleware.ts`
- **Details:** 
  - There is no standalone `Organization` or `Company` table. 
  - Instead, the concept is represented by the `UserRole.ENTERPRISE` enum.
  - Both `FleetOwner` and `User` models contain a loose `companyName (String?)` field.
  - A pseudo-organizational structure exists via the `TeamMember` model, which links users to an `ownerId` under an `EnterpriseTeamMembers` relation.
- **Production Readiness:** Basic data representation exists, but lacks deep organizational hierarchy types (Branch, Department).

### 👥 Team / Membership / Role / Ownership
- **Exists:** Yes.
- **Location:** `prisma/schema.prisma`, `src/shared/middleware/auth.middleware.ts`, `src/shared/types/express.d.ts`
- **Details:**
  - **Ownership:** Modeled via `ownerId` in the `TeamMember` model.
  - **Membership:** Exists conceptually as `TeamMember` and via the `fleetMemberships` relation for `FleetDriver`.
  - **Role:** Highly utilized. Prisma defines a global `UserRole` enum (`WORKER`, `CUSTOMER`, `FLEET_OWNER`, `ENTERPRISE`, `ADMIN`).
  - **Middleware:** `src/shared/middleware/auth.middleware.ts` uses `requireRole(...roles: UserRole[])` for endpoint authorization.
- **Production Readiness:** Roles are production-ready. However, `TeamMember.role` is typed as a loose `String @default("VIEWER")` rather than a strictly enforced Prisma Enum.

### 👷 Worker / Workforce
- **Exists:** Yes (Extensively).
- **Location:** `prisma/schema.prisma`, `src/shared/socket/socket.instance.ts`
- **Details:**
  - Dedicated `Worker` model tracking capacity, gamification, and skills.
  - Sockets: `emitToWorkerRoom(workerId, event, data)` in `socket.instance.ts` handles private, targeted push events directly to workers.
- **Enums:** `WorkerStatus`, `WorkerJobStatus`, `WorkerWalletReason`.
- **Production Readiness:** Fully implemented and integrated with realtime socket gateways.

### ✅ Verification
- **Exists:** Yes.
- **Location:** `src/shared/queue/workers/ulip.worker.ts`, `prisma/schema.prisma`
- **Details:**
  - Extensive queue-based verification for drivers and vehicles (SARATHI, VAHAN, FASTAG, ECHALLAN).
  - Background processes update the `VerificationLog` model and push WebSocket updates to drivers.
- **Enums:** `UlipVerifStatus` (VERIFIED, FAILED, MANUAL_REVIEW).
- **Production Readiness:** High. Robust async architecture using BullMQ to handle government API flakiness.

### ❌ Missing Concepts
The following concepts **DO NOT** exist in the shared codebase or global types:
- **Contractor, Vendor, Branch, Department, Project, Collaboration, Employment.**
- **Shift:** Appears only in notification bodies and usage type strings (e.g., "House Shifting Usage"), not as an organizational data structure.
- **Invitation:** Referenced vaguely in service notifications (`"Fleet Invitation"`), but lacks dedicated shared interfaces or schema types.

---

## 2. Tech Debt, TODOs, & Anomalies

### 🚩 Type/Enum Misalignments & Duplicate Types
1. **Express Request Type vs Prisma Enum:**
   - In `src/shared/types/express.d.ts`, `Request.user.role` is typed as `string`.
   - In `src/shared/middleware/auth.middleware.ts`, the `JwtPayload` correctly types `role` as the `UserRole` enum.
   - **Impact:** This discrepancy circumvents TypeScript's enum safety in controllers checking `req.user.role`.

2. **Loose String Typing for Team Roles:**
   - As noted, `TeamMember.role` in `schema.prisma` is a raw `String`. It lacks a defined enum (e.g., `TeamRole { ADMIN, MANAGER, VIEWER }`), which is a missed opportunity for strict type safety.

### 🛠️ TODOs & Mock Logic
- **`src/shared/queue/workers/otp.worker.ts`:**
  - Contains a direct TODO: `// TODO Phase 3b: Replace this with real MSG91 call`
  - Currently executes **Mock Logic** via `console.log` (`[MSG91-STUB] Sending OTP...`).

### 🤐 Commented Features & Suppressed Errors
- **`src/shared/middleware/auth.middleware.ts`:**
  - The `optionalAuth` middleware contains an empty catch block with a comment: `// Invalid token — continue without user (optional auth)`. While functionally intentional, it silently swallows potential JWT parsing errors.

### 🗑️ Unused / Dead Code
- No drastically unused interfaces were found in `src/shared`. The event bus (`AppEvents`) and queue interfaces (`UlipJobData`) are actively consumed by their respective systems.

