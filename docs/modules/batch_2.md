# Logistic Platform Backend - Modules Documentation (Batch 2)

This document provides exhaustive analysis of the `driver-wallet`, `fleet`, `fleet-owner`, `fleet-wallet`, `gamification`, and `gig` modules located in `D:\Projects\Parther_Technologies\logistic\server\src\modules`.

---

## 1. Module: `driver-wallet`

### 1.1 Purpose
The `driver-wallet` module handles all financial transactions, settlements, and ledger records for independent drivers operating on the platform. It calculates platform commissions, tracks due amounts from cash trips, supports online commission payments to the platform, and facilitates driver payout withdrawals.

### 1.2 Responsibilities
- Track real-time driver wallet balances.
- Process earnings from completed trips (differentiating between cash and online payments).
- Monitor and deduct platform commissions.
- Enforce soft alerts and hard block thresholds for drivers with high negative balances (unpaid commissions from cash trips).
- Facilitate commission payment orders through Razorpay.
- Handle driver withdrawal requests using RazorpayX payouts.
- Support administrative cash collection records (when drivers pay cash commissions directly at the office).

### 1.3 Public Services
- `ensureDriverWallet(driverId)`: Initializes a wallet for a driver if one does not exist.
- `settleTripEarnings(input)`: Calculates net earnings and platform commission from a booking, adjusting balances based on payment mode (CASH vs. ONLINE).
- `createCommissionPaymentOrder(driverId)`: Creates a Razorpay order to pay outstanding platform commissions.
- `verifyCommissionPayment(driverId, ...)`: Validates the Razorpay signature and credits the driver's wallet to clear debt.
- `getDriverWallet(driverId)`, `getDriverTransactionHistory(driverId, ...)`: Fetch wallet details and pagination.
- `requestWithdrawal(driverId, amount)`: Initiates a payout from the platform to the driver's bank account.
- `recordCashCollection(adminId, data)`: Records an offline cash collection and offsets the driver's negative balance.
- `auditCommissionDebts(notifyService)`: A CRON-triggered service to notify or suspend drivers exceeding debt thresholds.

### 1.4 Controllers
- `getWallet`, `getTransactions`: Wallet reads.
- `createCommissionOrder`, `verifyCommissionPayment`: Debt clearance routes via Razorpay.
- `requestWithdrawal`: Payout requests.
- `adminRecordCashCollection`, `adminListDriverWallets`, `adminListWithdrawals`, `adminCompleteWithdrawalManually`, `adminRetryWithdrawal`: Administrative operations for wallet overrides and payout fallbacks.

### 1.5 Repositories
Does not use a separate repository class; interacts directly with Prisma ORM inside the service and controllers.

### 1.6 DTOs (Data Transfer Objects)
Defined mostly through in-line TypeScript interfaces and schemas. Key inputs include:
- `TripSettlementInput`
- `Withdrawal request body` (amount)
- `Razorpay verification payload` (order_id, payment_id, signature)

### 1.7 Entities
- **DriverWallet**: Ledger state per driver (balance, commission due, deadline).
- **DriverWalletTransaction**: Immutable audit log of individual credits and debits.
- **DriverEarning**: Read-only log of what was earned per booking.
- **WithdrawalRequest**: State machine for processing driver payouts.
- **CashCollectionRecord**: Audit trail for office cash handovers.

### 1.8 Events
- Triggers notifications via the `notifyService` injected into `auditCommissionDebts` to warn drivers about negative balances.

### 1.9 Dependencies on other modules
- `@shared/db/prisma`: Database access.
- `@shared/payments/outbound-payment.policy`: Payment feature flags and policy asserts.
- `razorpay`: External SDK for processing payments and payouts.

### 1.10 Database Models Used
`DriverWallet`, `DriverWalletTransaction`, `DriverEarning`, `WithdrawalRequest`, `CashCollectionRecord`, `Driver`, `User`.

### 1.11 Which module owns the business logic?
**`driver-wallet` (Specifically `driver-wallet.service.ts`)** owns the business logic for calculating driver earnings, deducting commissions, tracking debt, and orchestrating withdrawals. Controllers serve as thin wrappers.

---

## 2. Module: `fleet`

### 2.1 Purpose
The `fleet` module is responsible for the foundational onboarding, registration, and government-backed verification of independent drivers and their vehicles.

### 2.2 Responsibilities
- Register and maintain Driver profiles linked to User accounts.
- Register and maintain Vehicle details.
- Facilitate government verification of Driving Licenses (DL) via ULIP SARATHI.
- Facilitate government verification of Vehicle Registration Certificates (RC) via ULIP VAHAN.
- Maintain immutable, legally compliant audit trails (`VerificationLog`) for every government API call.
- Provide dashboard aggregation data (today/weekly earnings and trends) for the driver app.

### 2.3 Public Services
- `registerDriver(userId, input)`: Creates or updates a driver profile.
- `getMyDriverProfile(userId)`: Returns profile along with computed real-time metrics (earnings, trends).
- `registerVehicle(userId, input)`: Attaches a vehicle to a driver.
- `verifyDriverLicense(userId, input)`: Verifies DL against ULIP. Supports a MOCK mode for development.
- `verifyVehicleRc(userId, input)`: Verifies RC against ULIP.

*(Internal Services: `sarathi.service.ts` and `vahan.service.ts` handle external ULIP HTTP communication, isolated from business rules).*

### 2.4 Controllers
*(Found in `fleet.controller.ts`)*
- `registerDriverProfile`, `getDriverProfile`
- `registerDriverVehicle`
- `verifyDriverDL`, `verifyDriverRC`

### 2.5 Repositories
Interacts directly with Prisma ORM.

### 2.6 DTOs
Validation provided via Zod schemas in `fleet.schema.ts`:
- `RegisterDriverInput`
- `RegisterVehicleInput`
- `VerifyLicenseInput`
- `VerifyVehicleRcInput`

### 2.7 Entities
- **Driver**: The individual operating the vehicle.
- **Vehicle**: The physical asset.
- **VerificationLog**: Immutable audit trail for ULIP API requests.

### 2.8 Events
No domain events emitted directly (status changes happen inline).

### 2.9 Dependencies on other modules
- `@shared/db/prisma`
- Sub-services within its own folder (`sarathi.service`, `vahan.service`).

### 2.10 Database Models Used
`Driver`, `User`, `Vehicle`, `VerificationLog`, `DriverWallet`, `DriverWalletTransaction`, `Booking`.

### 2.11 Which module owns the business logic?
**`fleet` (Specifically `fleet.service.ts`)** orchestrates the validation states, dashboard analytics, and profile linkages. The raw API interactions belong to `sarathi.service` and `vahan.service`.

---

## 3. Module: `fleet-owner`

### 3.1 Purpose
The `fleet-owner` module supports B2B operations for companies that own multiple trucks and employ multiple drivers on the platform. It provides fleet management, truck assignments, and aggregated financial oversight.

### 3.2 Responsibilities
- Register Fleet Owner profiles (B2B identity).
- Provide a high-level fleet dashboard summarizing active trucks, live trips, and today's earnings.
- Manage a registry of fleet-owned trucks (`FleetTruck`).
- Manage a roster of employed drivers (`FleetDriver`).
- Assign and map drivers to specific fleet trucks.
- Oversee truck insurance and permit expiry details.

### 3.3 Public Services
- `registerFleetOwner(userId, input)`, `getMyFleetOwnerProfile(userId)`
- `getFleetDashboard(userId)`: Aggregates active trips, earnings, and fleet size.
- `addFleetTruck(userId, input)`, `listFleetTrucks(userId)`, `updateFleetTruck(...)`
- `setCurrentTruckDriver(userId, truckId, input)`: Maps a fleet driver to a specific truck.
- `addFleetDriver(userId, input)`: Adds an existing platform driver into the owner's fleet.

### 3.4 Controllers
*(Found in `fleet-owner.controller.ts`)*
Handles standard CRUD and dashboard route handlers corresponding to the services above.

### 3.5 Repositories
Interacts directly with Prisma ORM.

### 3.6 DTOs
Validation provided via Zod schemas in `fleet-owner.schema.ts`:
- `RegisterFleetOwnerInput`
- `AddFleetTruckInput`
- `UpdateFleetTruckInput`
- `AddFleetDriverInput`
- `SetTruckDriverInput`

### 3.7 Entities
- **FleetOwner**: Corporate entity profile.
- **FleetTruck**: Truck asset owned by the fleet (distinct from an independent driver's `Vehicle`).
- **FleetDriver**: Junction entity tracking the employment relationship between a FleetOwner and a platform Driver.

### 3.8 Events
Relies on `@modules/notifications/notification.service` to potentially alert drivers of assignments (imported in service).

### 3.9 Dependencies on other modules
- `@modules/booking/booking.transition`: For querying active truck assignments related to live bookings.
- `@modules/notifications/notification.service`

### 3.10 Database Models Used
`FleetOwner`, `FleetTruck`, `FleetDriver`, `FleetWallet`, `FleetEarning`, `TruckAssignment`, `Booking`, `User`, `Driver`.

### 3.11 Which module owns the business logic?
**`fleet-owner` (`fleet-owner.service.ts`)** owns the business logic for managing fleet assets and viewing aggregated fleet states.

---

## 4. Module: `fleet-wallet`

### 4.1 Purpose
The `fleet-wallet` module manages the financial ledger for Fleet Owners. It handles aggregate earnings from all trucks, digital salary transfers to drivers, and payouts.

### 4.2 Responsibilities
- Maintain Fleet Owner wallet balances.
- Support fleet withdrawals via RazorpayX.
- Facilitate internal digital transfers (salary payments) from a Fleet Wallet to an employed Driver's Wallet.
- Log offline cash salaries for auditing purposes without altering digital wallet balances.

### 4.3 Public Services
- `getFleetWallet(fleetOwnerId)`, `getFleetTransactionHistory(...)`
- `requestFleetWithdrawal(fleetOwnerId, amount)`: Initiates an outbound payout.
- `transferToDriver(fleetOwnerId, driverId, amount, note)`: Atomically debits the fleet wallet and credits the target driver's wallet.
- `recordOfflineDriverSalary(fleetOwnerId, driverId, amount, note)`: Audits physical cash payouts outside the platform.

### 4.4 Controllers
*(Found in `fleet-wallet.controller.ts`)*
Routes for fetching the wallet, requesting withdrawals, transferring salaries, and recording offline salaries.

### 4.5 Repositories
Interacts directly with Prisma ORM.

### 4.6 DTOs
Handled via standard Express `req.body` typings within the controller.

### 4.7 Entities
- **FleetWallet**: Primary ledger for the fleet owner.
- **FleetWalletTransaction**: Immutable audit log of fleet financial activities.

### 4.8 Events
None emitted directly.

### 4.9 Dependencies on other modules
- `@modules/driver-wallet/driver-wallet.service`: Imports `processWithdrawalViaRazorpayX` to handle the actual Razorpay payout logic.
- `@shared/payments/outbound-payment.policy`: Payment policies.

### 4.10 Database Models Used
`FleetWallet`, `FleetWalletTransaction`, `FleetOwner`, `WithdrawalRequest`, `FleetDriver`, `DriverWallet`, `DriverWalletTransaction`, `CashCollectionRecord`.

### 4.11 Which module owns the business logic?
**`fleet-wallet` (`fleet-wallet.service.ts`)** owns the business logic for fleet-level financial movements and driver salary distributions.

---

## 5. Module: `gamification`

### 5.1 Purpose
The `gamification` module tracks and rewards on-demand "Gig Workers" based on their performance, incentivizing platform engagement through badges, points, and tiers.

### 5.2 Responsibilities
- Evaluate worker metrics (e.g., total jobs, rating, earnings).
- Unlock dynamically defined badges based on target thresholds.
- Award gamification points and calculate tier brackets (Bronze, Silver, Gold, Platinum, Diamond).
- Serve formatted gamification progress to the workforce mobile API.

### 5.3 Public Services
- `evaluateWorkerMetrics(workerId)`: Iterates through all active system badges, checks worker progress against metrics, unlocks new badges, increments points, and recalculates the overall tier.
- `getBadgesForWorker(workerId)`: Formats earned and locked badges for frontend consumption.

### 5.4 Controllers
Not directly present in this directory (likely exposed via workforce/gig controllers or a standalone gamification router elsewhere).

### 5.5 Repositories
Interacts directly with Prisma ORM.

### 5.6 DTOs
None defined explicitly in this module (operates on Prisma schemas).

### 5.7 Entities
- **Badge**: The metadata and target metrics for an achievable goal.
- **WorkerBadge**: The join table tracking a worker's progress and earned state for a specific badge.

### 5.8 Events
None. Updates are synchronous database operations.

### 5.9 Dependencies on other modules
- `@shared/db/prisma`
- Depends heavily on the `Worker` model data aggregated from other modules.

### 5.10 Database Models Used
`Worker`, `WorkerBadge`, `Badge`.

### 5.11 Which module owns the business logic?
**`gamification` (`gamification.service.ts`)** completely owns the rules mapping metrics to points, badges, and tiers.

---

## 6. Module: `gig`

### 6.1 Purpose
The `gig` module manages on-demand, temporary "Gig Jobs" (e.g., loading/unloading helpers). It orchestrates job creation, dynamic pricing, and workforce dispatching.

### 6.2 Responsibilities
- Dynamically estimate and calculate job fares using platform configuration (surges, commission rates, and dynamic travel fees based on worker distance).
- Match jobs to the nearest available workers using geospatial calculations.
- Broadcast new jobs to the workforce via WebSockets.
- Manage job lifecycle and worker assignment acceptances.

### 6.3 Public Services
- `estimateGigFare(input)`: Provides a real-time fare preview without saving to the database.
- `createGig(customerId, data)`: Calculates final fare, persists the `GigJob`, and broadcasts to nearby workers.
- `getCustomerGigs`, `getNearbyGigs`, `getGigById`, `getAllGigs`: Various query projections.
- `acceptGig(workerUserId, gigId)`: Allows a worker to claim a job; manages assignment capacity and promotes the gig to `ASSIGNED` when full.

### 6.4 Controllers
*(Found in `gig.controller.ts`)*
- `estimateFare`, `createGigJob`
- `listMyGigs`, `listAvailableGigs`, `getGigDetails`, `adminListGigs`
- `acceptGigJob`

### 6.5 Repositories
Interacts directly with Prisma ORM.

### 6.6 DTOs
- `GigFareRequest` (Internal fare calculator input)
- Zod schemas in `gig.schema.ts` (e.g., `EstimateFareInput`, `CreateGigInput`).

### 6.7 Entities
- **GigJob**: The primary entity representing the customer's request.
- **GigAssignment**: Junction tracking which worker(s) accepted the job.
- **GigPricingConfig**: Global variables affecting calculations (surge, rates).

### 6.8 Events
- **Socket.IO (`/workforce`)**: Emits `new_gig_job` events to broadcast open requests instantly to the driver/worker app.

### 6.9 Dependencies on other modules
- `gig.pricing.ts`: Internal domain pricing calculator.
- Sockets (via global socket instance accessor).

### 6.10 Database Models Used
`GigJob`, `Worker`, `GigPricingConfig`, `GigAssignment`.

### 6.11 Which module owns the business logic?
**`gig` (`gig.service.ts` and `gig.pricing.ts`)** strictly owns the algorithms for geographic matching, fare calculations, and multi-worker assignment thresholds.
