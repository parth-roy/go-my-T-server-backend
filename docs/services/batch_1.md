# Backend Services Documentation - Batch 1

This document provides an exhaustive analysis of the following backend services in the `modules` directory:
- `admin.service.ts`
- `announcement.service.ts`
- `auth.service.ts`
- `booking.service.ts`
- `contact.service.ts`
- `dispatch.service.ts`
- `driver-wallet.service.ts`

---

## 1. Admin Service (`admin/admin.service.ts`)

### Responsibilities
Handles all administrative operations including admin authentication, dashboard statistics generation, user/driver/fleet management, administrative booking actions (assignment, cancellation, refunds), and financial reporting.

### Methods
- `issueTokenPair`: Generates JWT access token (15m expiry) and random UUID refresh token.
- `storeRefreshToken`: Saves refresh token to the database with a 30-day expiry.
- `loginAdmin`: Verifies admin credentials via Argon2 and returns authentication tokens.
- `refreshAdminToken`: Validates and rotates the refresh token.
- `logoutAdmin`: Deletes the provided refresh token from the database.
- `getAdminProfile`: Retrieves the admin's profile information.
- `forgotPassword`: Generates a password reset token and sends an email. Fails silently if email doesn't exist to prevent enumeration.
- `resetPassword`: Validates the reset token, updates the password, and revokes all active sessions.
- `getDashboardStats`: Aggregates today's active bookings, drivers online, unassigned bookings, open tickets, revenue, and new registrations.
- `getRevenueTrend`: Groups completed booking revenue by day for a specified period (default 30 days).
- `getDashboardAlerts`: Fetches counts for pending document reviews, expiring fleet documents, payment failures, and expiring subscriptions.
- `getBookings`: Lists bookings with filtering (status, vehicle type, payment) and pagination.
- `getBookingById`: Retrieves detailed booking information including stops, history, earnings, and pricing audit logs.
- `adminAssignDriver`: Administratively assigns a driver to a `CONFIRMED` booking and sends an FCM notification.
- `adminCancelBooking`: Cancels a booking via the system method, triggering state transitions and event bus notifications.
- `adminRefundBooking`: Refunds a `PAID` booking amount directly into the customer's wallet and creates a transaction record.
- `getUsers`: Lists users with filtering (role, active status, search) and pagination.
- `getUserById`: Retrieves detailed user profile including linked entities (wallet, driver, fleet, bookings).
- `toggleUserStatus`: Activates or deactivates a user. If deactivated, force logs out all active sessions.
- `forceLogoutAllSessions`: Deletes all refresh tokens for a specific user ID.
- `adminWalletCredit`: Credits a customer wallet with a specified amount and logs the transaction.
- `adminWorkerWalletCredit`: Credits a worker wallet with a specified amount and logs the transaction.
- `getDrivers`: Lists drivers with search/filters. Calculates a dynamic `complianceScore` based on document and verification statuses.
- `getDriverById`: Retrieves detailed driver profile including vehicle, documents, subscription, and earnings.
- `updateDocumentStatus`: Approves or rejects a driver document.
- `setDriverDocVerified`: Updates overall driver verification status. Sets status to `OFFLINE` if verified, updates user profile completion, and sends an FCM success notification.
- `getDriverVerificationLogs`: Retrieves third-party verification API logs for a driver.
- `getFleetOwners`: Lists fleet owners. Calculates a dynamic `complianceScore` based on the owner's verification and the document statuses of their trucks.
- `getFleetOwnerById`: Retrieves detailed fleet owner profile including trucks, drivers, and wallet.
- `toggleFleetOwnerStatus`: Activates or deactivates a fleet owner. Force logs out if deactivated.
- `getFleetTrucks`: Lists fleet trucks with search and pagination.
- `getExpiringFleetTrucks`: Retrieves trucks whose insurance, fitness, PUC, or permit expires within a given threshold (default 30 days).
- `getRevenueOverview`: Aggregates total revenue, platform commission, active subscriptions, and refunds for a given date range.
- `getDriverEarnings`: Lists driver earnings with filtering and pagination.

### External Calls
- `argon2`: For password hashing and verification.
- `jsonwebtoken`: For signing JWTs.
- `crypto`: For UUID generation.

### Internal Dependencies
- `prisma`: Database interactions.
- `logger`: Application logging.
- `email.service` (`sendPasswordResetEmail`): Sending password reset emails.
- `notification.service`: Sending push notifications via FCM.
- `booking.service` (`cancelBookingBySystem`, `assertTransition`): System booking cancellation and state validation.

### Business Rules
- Admin login restricted strictly to `UserRole.ADMIN` with `isActive: true`.
- Password reset tokens expire in 1 hour. Changing password revokes all existing sessions.
- `adminAssignDriver` requires the booking to be `CONFIRMED` and the driver to be `AVAILABLE`.
- Bookings cannot be cancelled if they are already `COMPLETED` or `CANCELLED`.
- Refunds are only processed if the `paymentStatus` is `PAID`.
- Deactivating any user or fleet owner instantly revokes all active sessions for security.
- Driver compliance score out of 100 based on DL (30), Doc Verify (40), User Active (10), RC Verify (20).
- Fleet compliance score combines owner verification with average truck document validity.

### Database Writes
- `refreshToken`: `create`, `delete`, `deleteMany`
- `user`: `update` (password hash, reset tokens, isActive, profileComplete)
- `booking`: `update` (driverId, status, paymentStatus)
- `walletTransaction`: `create`
- `wallet`: `create`, `update`
- `workerWalletTransaction`: `create`
- `workerWallet`: `create`, `update`
- `driverDocument`: `update`
- `driver`: `update` (isDocVerified, status)
- `fleetOwner`: `update` (isVerified, isActive)

### Database Reads
- `user`: `findFirst`, `findUnique`, `count`, `findMany`
- `refreshToken`: `findUnique`
- `booking`: `count`, `aggregate`, `findMany`, `findUnique`
- `driver`: `count`, `findUnique`, `findMany`
- `supportTicket`: `count`
- `driverDocument`: `count`, `findFirst`
- `fleetTruck`: `count`, `findMany`
- `driverSubscription`: `count`
- `pricingAuditLog`: `findFirst`
- `wallet`: `findUnique`
- `workerWallet`: `findUnique`
- `verificationLog`: `findMany`
- `fleetOwner`: `count`, `findMany`, `findUnique`
- `driverEarning`: `aggregate`
- `walletTransaction`: `aggregate`

### Cross-module Communication
- Triggers logic in `booking.service`.
- Calls `notification.service` and `email.service`.

---

## 2. Announcement Service (`announcement/announcement.service.ts`)

### Responsibilities
Manages system-wide announcements and broadcasts them to users based on their roles.

### Methods
- `getActiveAnnouncements`: Fetches active announcements that match the time window (`startsAt`, `endsAt`) and target role (`ALL_USERS`, `ALL`, or specific role).
- `createAnnouncement`: Creates a new announcement and emits an event to trigger push notifications to the relevant FCM topics.

### External Calls
- None.

### Internal Dependencies
- `prisma`: Database interactions.
- `eventBus`: Emitting system events.

### Business Rules
- Announcements must be explicitly active (`isActive: true`).
- Time-based visibility ensures announcements only show between `startsAt` and `endsAt`. Null values imply open-ended bounds.

### Database Writes
- `announcement`: `create`

### Database Reads
- `announcement`: `findMany`

### Cross-module Communication
- Emits `announcement.created` on the `eventBus`. The notification service listens to this to dispatch Firebase topic messages.

---

## 3. Auth Service (`auth/auth.service.ts`)

### Responsibilities
Handles OTP-based user authentication, token issuance, token refresh/rotation, FCM token management, and bypassing logic for Apple/Google app review demo accounts.

### Methods
- `storeOtp`: Dual-writes the generated OTP to Redis and an in-memory map.
- `getOtp`: Retrieves OTP from Redis, with a fallback to in-memory in non-production.
- `deleteOtp`: Removes the OTP from both stores to ensure one-time use.
- `storeFcmToken` / `getStoredFcmToken`: Temporarily caches FCM tokens in Redis during the OTP flow before the user record exists.
- `sendOtpViaPush`: Sends a data-only FCM push message containing the OTP to the user's device.
- `sendOtp`: Main entry point. Generates a 6-digit OTP, handles demo account bypass, determines the FCM token, stores data, and triggers the push notification.
- `verifyOtp`: Validates the OTP. Handles static OTP for demo accounts. Validates user active status. Auto-provisions driver/fleet profiles for demo accounts to prevent 404s. Issues JWTs.
- `refreshTokens`: Validates the refresh token (and expiry/user active status), rotates the token (deletes old, creates new), and returns the new pair.
- `logout`: Idempotently deletes the refresh token.
- `issueTokenPair`: Signs a 15-minute JWT and generates a 30-day UUID/JWT refresh token stored in DB.
- `getMe`: Returns the authenticated user's profile and relevant onboarding state (e.g., driver DL/vehicle status).

### External Calls
- `jsonwebtoken`: Signing and decoding JWTs.
- `crypto`: Generating random 6-digit integers.
- `firebase`: (`getMessaging().send`) Sending data-only push notifications.

### Internal Dependencies
- `prisma`: Database interactions.
- `redis`: OTP and FCM token caching.
- `logger`: Application logging.
- `eventBus`: Emitting user registration events.

### Business Rules
- **Demo Accounts:** Specific hardcoded phone numbers skip Redis entirely and accept a static OTP (`123456`), auto-provisioning profiles for App Store reviewers.
- **Dual-write Resilience:** OTPs and FCM tokens are written to both Redis and in-memory. In non-production, if Redis fails, the in-memory fallback prevents auth failures.
- **Data-only FCM:** Uses data-only Firebase messages (no `notification` key) because standard notification messages are swallowed by the OS in the foreground. The mobile app handles data-only messages to show consistent heads-up notifications.
- **Deactivation Check:** Prevents login for deactivated users or fleet owners.
- **Token Rotation:** Every refresh token usage deletes the old token and issues a new one.

### Database Writes
- `user`: `upsert` (Creates new users or updates FCM token on login)
- `driver`: `upsert` (Only for demo accounts)
- `fleetOwner`: `upsert` (Only for demo accounts)
- `refreshToken`: `create`, `delete`, `deleteMany`

### Database Reads
- `user`: `findUnique`
- `refreshToken`: `findUnique`

### Cross-module Communication
- Emits `user.registered` on the `eventBus` when a brand new user completes OTP verification.

---

## 4. Booking Service (`booking/booking.service.ts`)

### Responsibilities
The core booking engine. Handles creating, retrieving, listing, confirming, cancelling, and rating bookings. Contains strict state transition logic and coordinates pricing, dispatching, and wallet refunds.

### Methods
- `generateBookingNumber`: Generates a unique `BK` prefixed ID.
- `getDriverBooking`: Helper to verify a booking is assigned to the requesting driver.
- `createBooking`: Validates service area, compares client fare with server fare, checks vehicle capacity, checks driver availability (conditionally bypassed), handles booking number collisions, creates `DRAFT` booking, and links the `PricingAuditLog`.
- `listBookings`: Role-based listing (Customer sees theirs, Driver sees theirs) with pagination. Includes driver payout details.
- `getBooking`: Role-based detailed retrieval. Allows drivers/fleet owners to view unassigned `INSTANT` `CONFIRMED` bookings as opportunities.
- `confirmBooking`: Transitions from `DRAFT` to `CONFIRMED`. Sets up `BidWindow` if applicable. Emits dispatch event.
- `cancelBooking`: Handles complex cancellation logic. Validates permissions (Customer/Assigned Driver). Blocks cancellation if bid payment is pending. Withdraws bids, resets assigned driver/worker status to `AVAILABLE`. Auto-refunds wallet payments asynchronously.
- `cancelBookingBySystem`: Wrapper for system-initiated cancellations.
- `rateBooking`: Appends a customer rating and note to a `COMPLETED` booking.
- `getDriverActiveBooking`: Retrieves the current ongoing booking for a driver.
- `markDriverArriving`: Transitions to `DRIVER_ARRIVING`, auto-generates OTP if missing, notifies the customer.

### External Calls
- None directly in this file (Mapbox calls abstracted to `serviceability.service`).

### Internal Dependencies
- `prisma`: Database interactions.
- `eventBus`: Emitting core domain events.
- `notification.service`: Push notifications.
- `inapp.notification.service`: Database notifications.
- `pricing.service`: Server-side fare estimation.
- `serviceability.service`: Validating coordinates against service areas.
- `wallet.service`: Processing automated refunds.
- `marketplace.service`: Withdrawing bids on cancellation.
- `booking.transition`: State machine validation (`assertTransition`).

### Business Rules
- Restricted/hazardous goods cannot use the standard booking flow.
- Pickup and Dropoff locations cannot be identical (< 50 meters).
- Both coordinates must fall within configured service areas.
- Declared goods weight cannot exceed the selected vehicle's capacity.
- **Security:** Client-supplied fare must be within 10% of the server-calculated fare to prevent tampering.
- **State Machine:** Cancellations strictly checked against current state. `PRIVATE_BID` bookings cannot be cancelled if an award is pending payment.
- **Resource Freeing:** Cancelling a booking instantly reverts the assigned driver and assigned laborers back to `AVAILABLE` status.
- **Auto Refund:** If cancelled and paid via `WALLET`, refunds are initiated immediately (fire-and-forget).
- Ratings only permitted on `COMPLETED` bookings.

### Database Writes
- `booking`: `create`, `update`, `updateMany`
- `pricingAuditLog`: `update`
- `bidWindow`: `create`, `updateMany`
- `marketplaceBid`: `updateMany`
- `driver`: `updateMany`
- `jobAssignment`: `updateMany`
- `worker`: `updateMany`

### Database Reads
- `driver`: `count`, `findUnique`
- `booking`: `create` (retry loop), `findMany`, `count`, `findUnique`, `findFirst`
- `pricingAuditLog`: `findMany`, `findFirst`
- `fleetOwner`: `findUnique`
- `bidAward`: `findFirst`
- `jobAssignment`: `findMany`
- `user`: `findUnique`

### Cross-module Communication
- Relies heavily on `pricingService.estimateFare`.
- Emits `booking.confirmed` which is listened to by the Dispatch Engine.
- Emits `booking.cancelled` which triggers push notifications.
- Triggers `refundToWallet` asynchronously.

---

## 5. Contact Service (`contact/contact.service.ts`)

### Responsibilities
Manages standard web form "Contact Us" submissions.

### Methods
- `createContactMessage`: Saves a new message.
- `getContactMessages`: Retrieves messages sorted by creation date.
- `updateContactMessageStatus`: Updates resolution status.

### External Calls
- None.

### Internal Dependencies
- `prisma`: Database interactions.

### Business Rules
- Simple CRUD wrapper.

### Database Writes
- `webContactMessage`: `create`, `update`

### Database Reads
- `webContactMessage`: `findMany`

### Cross-module Communication
- None.

---

## 6. Dispatch Service (`dispatch/dispatch.service.ts`)

### Responsibilities
Listens for confirmed bookings and locates nearby available drivers and laborers. Sends dispatch notifications, handles declines, and auto-cancels if no resources are found.

### Methods
- `haversineKm`: Math function to calculate straight-line distance between two coordinates.
- `dispatchBooking`: Finds up to 5 verified, available drivers within a 50km radius matching the vehicle type. Sends FCM pushes. Dispatches to fleet owners with matching trucks.
- `notifyFleetOwners`: Looks up fleet owners with matching truck types and pushes notifications.
- `notifyNoDriverFound`: Increments `declineCount`. If `< 10`, notifies customer and re-schedules dispatch. If `>= 10`, auto-cancels the booking.
- `handleDriverDecline`: When a driver explicitly declines, schedules an immediate re-dispatch (delay 5s).
- `dispatchWorkers`: Finds up to 10 verified, available workers within 30km based on labor type preferences. Creates `JobAssignment` records (using `upsert` for idempotency) and notifies them via FCM and WebSockets.

### External Calls
- None.

### Internal Dependencies
- `prisma`: Database interactions.
- `logger`: Application logging.
- `notification.service`: FCM Push.
- `inapp.notification.service`: Database alerts.
- `booking.service` (`cancelBookingBySystem`): Cancelling unfulfilled bookings.
- `socket.instance` (`emitToWorkerRoom`): Real-time websocket events to workers.

### Business Rules
- Dispatch only triggers for `CONFIRMED` bookings.
- Maximum 10 dispatch rounds (declines/timeouts) before the system auto-cancels the booking.
- **Driver Ranking:** Ranks by distance. Tiebreaker: if distance differs by less than 2km, the driver with the higher rating wins. Max 5 drivers notified.
- **Worker Ranking:** Same logic, but max 30km radius and max 10 workers notified.
- **Worker Payouts:** Splits the total `laborCharge` by the number of slots needed. Defaults to Rs. 150 if not specified.
- Uses `upsert` when creating Worker `JobAssignments` so re-dispatches reset previously declined workers back to `PENDING_ACCEPTANCE`.

### Database Writes
- `booking`: `update` (incrementing declineCount)
- `jobAssignment`: `upsert`, `update`

### Database Reads
- `booking`: `findUnique`
- `driver`: `findMany`
- `fleetOwner`: `findMany`
- `user`: `findUnique`
- `worker`: `findMany`

### Cross-module Communication
- Interacts heavily with `notification.service` and WebSocket channels.
- Triggers booking cancellation.

---

## 7. Driver Wallet Service (`driver-wallet/driver-wallet.service.ts`)

### Responsibilities
Manages driver, worker, and fleet wallets. Handles trip settlements (calculating platform commissions), commission debt monitoring, commission payments via Razorpay, and automated withdrawal requests via RazorpayX.

### Methods
- `ensureDriverWallet`: Auto-creates a wallet record if missing.
- `creditDriverWallet` / `debitDriverWallet`: Atomic wallet balance updates that automatically log a `driverWalletTransaction`.
- `settleTripEarnings`: Calculates 20% platform commission. 
  - **Cash:** Deducts commission from driver wallet (can go negative), sets a 24-hour debt deadline.
  - **Online:** Credits net earning to driver wallet, auto-offsets any existing commission debt. Updates fleet wallet if applicable.
- `createCommissionPaymentOrder`: Generates a Razorpay order for drivers to clear negative balances.
- `verifyCommissionPayment`: Verifies Razorpay HMAC signature, credits the wallet, clears the commission debt, and reactivates blocked drivers.
- `getDriverWallet` / `getDriverTransactionHistory`: Fetches wallet state and paginated transaction history.
- `requestWithdrawal`: Validates minimum balance (Rs 50) and bank details. Debits wallet immediately (reserving funds) and creates a `WithdrawalRequest`. Triggers async payout.
- `processWithdrawalViaRazorpayX`: Interacts with RazorpayX APIs. Creates Contact, creates Fund Account, and initiates Payout (IMPS for < 2L, RTGS for >= 2L).
- `refundFailedWithdrawal`: If RazorpayX payout fails, refunds the exact reserved amount back to the correct Driver, Fleet, or Worker wallet.
- `recordCashCollection`: Admin endpoint to log physical cash received at the office. Credits the appropriate wallet and clears commission debt.
- `auditCommissionDebts`: CRON job function. Scans for drivers with negative balances. Soft-alerts via push notification if balance is -500 or 4 hours remain. Hard-blocks (sets `status = BREAK`) if balance hits -2000 or the 24-hour deadline expires.

### External Calls
- `razorpay` SDK: Creating orders and fetching payment verification details.
- `crypto`: Validating Razorpay webhook HMAC signatures.
- `fetch` (RazorpayX API): Interacting with `/contacts`, `/fund_accounts`, and `/payouts`.

### Internal Dependencies
- `prisma`: Database interactions.
- `logger`: Application logging.
- `outbound-payment.policy`: Gatekeeping RazorpayX operations.

### Business Rules
- **Platform Commission:** Fixed at 20% (configurable via env).
- **Cash Trips:** Commission is deducted directly. The wallet can go negative. The driver has 24 hours to clear the debt.
- **Online Trips:** If the driver has existing commission debt, their online earnings are automatically seized to offset the debt before crediting the remainder.
- **Fleet Trips:** Fleet owner gets the driver's net portion credited directly to the `fleetWallet`.
- **Debt Enforcement:** Hard block at -Rs 2000 or 24 hours elapsed. Soft alert at -Rs 500 or 4 hours remaining.
- **Withdrawals:** Minimum Rs 50. Only one pending withdrawal is allowed at a time to prevent race conditions. Funds are reserved instantly.
- RazorpayX Contact IDs and Fund Account IDs are cached on the Driver record for faster subsequent payouts.
- If a withdrawal fails at the banking layer, funds are securely reverted to the original entity's wallet.

### Database Writes
- `driverWallet`: `upsert`, `update`
- `driverWalletTransaction`: `create`
- `driverEarning`: `upsert`
- `fleetWallet`: `upsert`, `update`
- `fleetWalletTransaction`: `create`
- `fleetEarning`: `upsert`
- `driver`: `update`
- `withdrawalRequest`: `create`, `update`
- `workerWallet`: `upsert`, `update`
- `workerWalletTransaction`: `create`
- `cashCollectionRecord`: `create`

### Database Reads
- `driverWallet`: `findUnique`, `findMany`
- `driverWalletTransaction`: `findFirst`, `findMany`, `count`
- `fleetWallet`: `findUnique`
- `withdrawalRequest`: `findFirst`, `findUnique`
- `driver`: `findUnique`
- `cashCollectionRecord`: `findFirst`
- `worker`: `findUnique`
- `workerWallet`: `findUnique`

### Cross-module Communication
- `auditCommissionDebts` accepts an injected `notifyService` callback to decouple from the actual notification transport.
- Handles data originating from `booking.service` upon completion.
