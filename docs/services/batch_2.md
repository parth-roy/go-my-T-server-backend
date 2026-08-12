# Backend Service Documentation - Batch 2

## 1. `fleet/fleet.service.ts`
**Responsibilities:** 
Manages the core business logic for fleet profiles and verification. Handles driver profile registration, vehicle registration, and driver online/offline status management. Integrates with ULIP SARATHI for Driving License (DL) verification and ULIP VAHAN for Registration Certificate (RC) verification. It ensures a legal audit trail by writing to `VerificationLog` for every government API call and updates the driver/vehicle verification statuses based on ULIP results.

**Methods:**
- `registerDriver(userId, input)`: Creates or updates a Driver profile linked to an existing User. Ensures a User has only one Driver profile.
- `getMyDriverProfile(userId)`: Returns the driver profile for the authenticated user along with computed dashboard metrics (earnings, trip statistics, and trends).
- `registerVehicle(userId, input)`: Registers a vehicle for a driver or updates the existing one. Ensures vehicle registration numbers are unique across drivers.
- `verifyDriverLicense(userId, input)`: Verifies the driver's DL via ULIP SARATHI. Logs the raw response and updates the verification status. Supports a mock mode for development.
- `verifyVehicleRc(userId, input)`: Verifies the vehicle's RC via ULIP VAHAN. Logs the raw response, updates the RC verification status, and marks the user's profile as complete upon success. Supports mock mode.
- `updateDriverStatus(userId, input)`: Toggles the driver's availability status (ONLINE/OFFLINE). Ensures the driver is document-verified before going online.
- `adminOverrideVerification(adminId, driverId, notes)`: Allows an admin to manually override a driver's verification status and logs the action.

**External calls:**
None directly, but invokes `verifyDriverWithSarathi` and `verifyVehicleWithVahan` which internally make external HTTP requests to ULIP APIs.

**Internal dependencies:**
- `@shared/db/prisma`
- `@shared/errors/AppError`
- `@config/env`
- `@shared/logger`
- `sarathi.service` (`verifyDriverWithSarathi`)
- `vahan.service` (`verifyVehicleWithVahan`)

**Business rules:**
- A User can only have one Driver profile and one Vehicle.
- Vehicle registration numbers must be unique.
- Drivers cannot go ONLINE unless their documents are verified.
- Drivers cannot manually set their status to ON_TRIP or BREAK.
- Government API responses are never exposed directly to the client.
- Mock mode (`MOCK_ULIP=true`) bypasses the actual government API during development.
- Verification logs are immutable for legal audit trails.

**Database writes:**
- `user` (update)
- `driver` (create, update)
- `vehicle` (create, update)
- `verificationLog` (create)

**Database reads:**
- `user`
- `driver`
- `vehicle`
- `driverWallet`
- `driverWalletTransaction`
- `booking`
- `verificationLog`

**Cross-module communication:**
Calls `sarathi.service.ts` and `vahan.service.ts` within the same module for ULIP integrations.

---

## 2. `fleet/sarathi.service.ts`
**Responsibilities:** 
Handles ULIP SARATHI Driving License Verification (AUTHAPI/03). Verifies a driver's DL and permit against MoRTH's SARATHI database.

**Methods:**
- `validateDobFormat(dob)`: Validates that the date of birth string follows the strict `yyyy-mm-dd` format.
- `verifyDriverWithSarathi(input)`: Makes the HTTP request to the ULIP SARATHI API, handles data formatting, and parses the response to determine if the driver is verified or not found.

**External calls:**
- HTTP POST (`axios`) to the ULIP API gateway (`AUTHAPI/03`).

**Internal dependencies:**
- `ulipAuth.service` (`getUlipToken`, `getUlipBaseUrl`)
- `@shared/logger`

**Business rules:**
- DOB must strictly be `yyyy-mm-dd` to avoid silent failures on the SARATHI end.
- DL numbers are formatted automatically to insert a space if they follow a specific 15-character pattern.
- Only mandatory fields (dlnumber, dob) are sent in the API request body to prevent strict regex rejections from the ULIP gateway.
- Handles two different response shapes from ULIP (standard success and DL not found).

**Database writes:**
None directly.

**Database reads:**
None directly.

**Cross-module communication:**
Relies on `ulipAuth.service.ts` to retrieve the authentication token and base URL.

---

## 3. `fleet/ulipAuth.service.ts`
**Responsibilities:** 
Acts as a Singleton manager for ULIP JWT authentication tokens. Logs into ULIP using backend credentials, caches the JWT in memory (primary) and Redis (secondary), and handles auto-refreshing the token before its 30-minute expiry window.

**Methods:**
- `getUlipToken()`: Returns a valid ULIP JWT token from the in-memory cache, Redis cache, or initiates a fresh login.
- `_refreshUlipToken()`: Forces a fresh ULIP login, updates the memory cache, and updates Redis.
- `getUlipBaseUrl()`: Returns the appropriate ULIP base URL based on the environment (staging vs. production).

**External calls:**
- HTTP POST (`axios`) to the ULIP API (`/user/login`). Uses a custom HTTPS agent to bypass SSL verification due to government server certificate issues.

**Internal dependencies:**
- `@config/env`
- `@config/redis`
- `@shared/logger`

**Business rules:**
- Credentials (username, password) are strictly read from environment variables and never exposed.
- Implements a caching hierarchy: Memory -> Redis -> API.
- Refreshes the token 2 minutes before the 30-minute expiry to ensure no overlapping expired requests.
- Gracefully degrades if Redis is unavailable.

**Database writes:**
- Redis (`set` token with TTL).

**Database reads:**
- Redis (`get` token).

**Cross-module communication:**
Provides tokens for `sarathi.service` and `vahan.service`.

---

## 4. `fleet/vahan.service.ts`
**Responsibilities:** 
Handles ULIP VAHAN Vehicle Verification (AUTHAPI/02). Verifies a vehicle's Registration Certificate (RC) details against MoRTH's VAHAN database.

**Methods:**
- `verifyVehicleWithVahan(input)`: Formats the vehicle details, constructs the request payload, makes the HTTP POST to the ULIP VAHAN API, and parses the response.

**External calls:**
- HTTP POST (`axios`) to the ULIP API gateway (`AUTHAPI/02`).

**Internal dependencies:**
- `ulipAuth.service` (`getUlipToken`, `getUlipBaseUrl`)
- `@shared/logger`

**Business rules:**
- Vehicle registration number is sanitized (converted to UPPERCASE and spaces/hyphens removed) as required by the ULIP spec.
- Optional fields (ownerName, chassisNumber, engineNumber) are included in the payload only if provided by the user.

**Database writes:**
None directly.

**Database reads:**
None directly.

**Cross-module communication:**
Relies on `ulipAuth.service.ts` to retrieve the authentication token and base URL.

---

## 5. `fleet-owner/fleet-owner.service.ts`
**Responsibilities:** 
Business logic for Fleet Owner operations. Manages fleet owner registration, fleet trucks (add, list, update), fleet drivers (add, list, remove), assigns truck and driver to confirmed bookings, and retrieves fleet dashboard metrics and earnings.

**Methods:**
- `registerFleetOwner(userId, input)`: Registers a user as a Fleet Owner and provisions a `FleetWallet`.
- `getMyFleetOwnerProfile(userId)`: Returns the authenticated fleet owner's profile and relation counts.
- `getFleetDashboard(userId)`: Returns a summarized dashboard for the fleet owner, including active trips, today's earnings, and recent assignments.
- `addFleetTruck(userId, input)`: Registers a new truck under the fleet owner.
- `listFleetTrucks(userId)`: Returns a list of trucks owned by the fleet.
- `updateFleetTruck(userId, truckId, input)`: Updates truck details (including insurance, fitness expiries).
- `setCurrentTruckDriver(userId, truckId, input)`: Assigns a fleet driver to a specific truck.
- `addFleetDriver(userId, input)`: Adds an existing registered driver to the fleet using their phone number. Sends an FCM notification to the driver.
- `listFleetDrivers(userId)`: Lists drivers actively part of the fleet.
- `removeFleetDriver(userId, fleetDriverId)`: Deactivates a driver's membership in the fleet.
- `listPendingBookings(userId, query)`: Retrieves unassigned, CONFIRMED bookings that the fleet can dispatch. Filters by vehicle type.
- `assignTruckToBooking(userId, input)`: Executes an atomic assignment of a fleet truck and driver to a CONFIRMED booking. Validates conditions, creates assignment records, and updates the booking status to `DRIVER_ASSIGNED`.
- `getFleetEarnings(userId, query)`: Fetches paginated earnings history and aggregates totals.

**External calls:**
None directly.

**Internal dependencies:**
- `@shared/db/prisma`
- `@modules/booking/booking.transition` (assertTransition)
- `@shared/errors/AppError`
- `@shared/logger`
- `@modules/notifications/notification.service` (sendToDevice)

**Business rules:**
- Fleet owners can only add drivers who are already registered as drivers in the system.
- A truck cannot be assigned to a booking if it is already on an active trip.
- A driver must be active, document-verified, and their status must be `AVAILABLE` to be assigned to a trip.
- A fleet owner can only dispatch a private bid booking if they won the bid and must use the exact truck committed during the bid.
- Dispatch logic is highly transactional to prevent race conditions during assignments.
- `FleetTruckUsage` record is created to track which truck was used for an assignment.

**Database writes:**
- `user` (update role)
- `fleetOwner` (create)
- `fleetWallet` (create)
- `fleetTruck` (create, update)
- `fleetDriver` (create, update)
- `truckAssignment` (create)
- `booking` (update)
- `driver` (update status to ON_TRIP)
- `fleetTruckUsage` (create)

**Database reads:**
- `fleetOwner`
- `fleetTruck`
- `fleetDriver`
- `user`
- `driver`
- `booking`
- `truckAssignment`
- `fleetEarning`
- `bidAward`

**Cross-module communication:**
- Integrates with the Booking module by importing state transition logic (`assertTransition`).
- Integrates with Notifications module (`notificationService`) to push FCM notifications to drivers when they are added to a fleet or assigned a trip.

---

## 6. `fleet-wallet/fleet-wallet.service.ts`
**Responsibilities:** 
Manages the fleet owner's wallet operations, including viewing balances and transaction history, requesting withdrawals via RazorpayX, performing digital salary transfers to drivers, and auditing offline cash salary payments.

**Methods:**
- `getFleetWallet(fleetOwnerId)`: Upserts and retrieves the fleet owner's wallet with recent transactions.
- `getFleetTransactionHistory(fleetOwnerId, page, limit)`: Retrieves paginated wallet transaction history.
- `requestFleetWithdrawal(fleetOwnerId, amount)`: Validates rules and initiates a withdrawal request. Reduces the wallet balance and triggers RazorpayX integration.
- `transferToDriver(fleetOwnerId, driverId, amount, note)`: Performs a digital funds transfer from the fleet wallet to a driver's wallet.
- `recordOfflineDriverSalary(fleetOwnerId, driverId, amount, note)`: Audits physical cash payouts to a driver without modifying digital wallet balances.

**External calls:**
None directly inside this file, but invokes `processWithdrawalViaRazorpayX` which interfaces with Razorpay API.

**Internal dependencies:**
- `@shared/db/prisma`
- `@shared/errors/AppError`
- `@shared/logger`
- `@shared/payments/outbound-payment.policy` (assertMultiPartyTransfersEnabled, assertRazorpayXPayoutsEnabled)
- `@modules/driver-wallet/driver-wallet.service` (processWithdrawalViaRazorpayX)

**Business rules:**
- Withdrawals must exceed the configured `MIN_WITHDRAWAL_AMOUNT`.
- Fleet owner must have bank account details populated before requesting a withdrawal.
- A fleet owner can only have one pending withdrawal request at a time.
- Fleet-to-driver transfers mandate that the driver actively belongs to the specific fleet.
- Offline cash salary records an audit log (`CashCollectionRecord`) but ensures no double-accounting in the digital wallet.

**Database writes:**
- `fleetWallet` (create, update)
- `fleetWalletTransaction` (create)
- `withdrawalRequest` (create)
- `driverWallet` (create, update)
- `driverWalletTransaction` (create)
- `cashCollectionRecord` (create)

**Database reads:**
- `fleetWallet`
- `fleetOwner`
- `user`
- `withdrawalRequest`
- `fleetDriver`
- `driverWallet`

**Cross-module communication:**
- Reads payment policies from `@shared/payments`.
- Calls `processWithdrawalViaRazorpayX` from the `driver-wallet` module to handle the outbound payment.

---

## 7. `gamification/gamification.service.ts`
**Responsibilities:** 
Evaluates and maintains gamification metrics for workforce members (drivers/workers). Responsible for dynamically updating badge progress, unlocking badges, awarding points, and recalculating user tiers (Bronze, Silver, Gold, Platinum, Diamond).

**Methods:**
- `evaluateWorkerMetrics(workerId)`: Iterates through all active badges, calculates progress based on worker stats (jobs, rating, acceptance rate, earnings), creates/updates `WorkerBadge` relations, accumulates points, and updates the worker's tier.
- `getBadgesForWorker(workerId)`: Forces an evaluation and retrieves a formatted response of earned and locked badges for the client application.

**External calls:**
None.

**Internal dependencies:**
- `@shared/db/prisma`
- `@prisma/client` (BadgeTier, BadgeMetric)

**Business rules:**
- Badges use defined metrics: `TOTAL_JOBS`, `RATING`, `ACCEPTANCE_RATE`, `ON_TIME_RATE`, `TOTAL_EARNINGS`.
- Badge points are only added to `totalPoints` when a badge transitions to an earned state (`isEarned: true`).
- User tiers are strictly threshold-based based on total points:
  - 0 - 199: BRONZE
  - 200 - 499: SILVER
  - 500 - 999: GOLD
  - 1000 - 2499: PLATINUM
  - 2500+: DIAMOND

**Database writes:**
- `workerBadge` (create, update)
- `worker` (update points and tier)

**Database reads:**
- `worker`
- `badge`
- `workerBadge`

**Cross-module communication:**
No explicit imports from other modules. This service acts purely on the schema models (`worker`, `workerBadge`) which are assumed to have their statistics updated by other modules prior to evaluation.
