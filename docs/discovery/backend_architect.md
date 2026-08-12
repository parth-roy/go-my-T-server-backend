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
