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
