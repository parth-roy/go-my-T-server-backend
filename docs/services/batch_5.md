# Batch 5 Services Documentation

This document provides an exhaustive analysis of the `ulip`, `upload`, `user`, `wallet`, and `workforce` services in the backend architecture.

---

## 1. ULIP Service (`ulip/ulip.service.ts`)

### Responsibilities
The ULIP service integrates with the Unified Logistics Interface Platform (ULIP) to perform external verifications for driver and worker onboarding. This includes checking Driving Licenses (SARATHI), Vehicle Registration (VAHAN), FASTAG, E-Challans, and performing Aadhaar and PAN verification via Digilocker.

### Methods
- `verifySarathi(dlnumber, dob, driverName, permit)`: Verifies driving licenses via the SARATHI API.
- `verifyVahan(vehiclenumber, ownername, chasisnumber, enginenumber)`: Verifies vehicle RC details via the VAHAN API.
- `verifyFastag(vehiclenumber)`: Verifies vehicle FASTAG details.
- `verifyEchallan(vehiclenumber)`: Fetches E-Challan details for a vehicle.
- `initDigilockerSession(input)`: Step 01 of Digilocker flow. Submits demographic data to initiate a session and trigger an OTP if it's a new user.
- `verifyDigilockerOtp(input)`: Step 02 of Digilocker flow. Verifies the OTP for a new user.
- `exchangeDigilockerToken(input)`: Step 03 of Digilocker flow. Exchanges the authorization code for a Digilocker access token.
- `fetchDigilockerPan(input)`: Step 04 of Digilocker flow. Uses the token to fetch the PAN document (returns base64 PDF).
- `fetchDigilockerAadhaar(input)`: Step 05 of Digilocker flow. Uses the token to fetch Aadhaar XML data, including photo, demographics, and address.

### External Calls
- Axios HTTP `POST` requests to various ULIP endpoints (`/SARATHI/01`, `/VAHAN/01`, `/DIGILOCKER/*`).
- These requests bypass SSL verification (`rejectUnauthorized: false`) due to known SSL issues on ULIP staging/production servers.

### Internal Dependencies
- `ulipAuth.service` (from the `fleet` module): Provides the authenticated Bearer token and base URL.
- `@config/env`: To check for `MOCK_ULIP` flags.
- `@shared/logger`: For extensive request/response logging.

### Business Rules
- **Mocking**: If `MOCK_ULIP` is true, the service returns simulated responses without making real HTTP requests, useful for local development outside whitelisted IPs.
- **Retry Logic**: ULIP servers are notoriously slow or unstable (e.g., 502 Bad Gateway). The SARATHI and VAHAN methods have built-in retry logic (up to 2 attempts) and a 90-second timeout.
- **Digilocker OAuth Flow**: Handles complex multi-step PKCE flows. Identifies whether a user needs an OTP (new user) or skips it (returning user) based on the Step 01 response. XML parsing is done using Regex for the Aadhaar response.

### Database Writes
- None.

### Database Reads
- None.

### Cross-Module Communication
- Calls `fleet/ulipAuth.service` to retrieve the active, cached ULIP token, avoiding redundant logins.

---

## 2. Upload Service (`upload/upload.service.ts`)

### Responsibilities
Manages file uploads to a DigitalOcean Spaces (S3-compatible) storage bucket. Handles file validation, sanitization, uploading, deletion, and generating presigned URLs.

### Methods
- `buildKey(folder, originalName)`: (Internal) Sanitizes the original filename and prepends a UUID and folder prefix to generate a unique S3 key.
- `validate(buffer, contentType, maxBytes)`: (Internal) Validates that the file buffer isn't empty, doesn't exceed size limits, and has an allowed MIME type.
- `s3Service.uploadFile(file, fileName, contentType, folder, maxBytes)`: Validates and uploads a single file to the specified folder. Returns the CDN URL.
- `s3Service.uploadMultiple(files, folder)`: Iterates over an array of files and uploads them sequentially.
- `s3Service.deleteFile(key)`: Deletes an object from the bucket using its S3 key.
- `s3Service.getSignedUrl(key, expiresIn)`: Generates a time-limited presigned URL for securely accessing private bucket objects.

### External Calls
- **AWS SDK for JS (v3)**: Communicates with the DigitalOcean Spaces API using `S3Client`, `PutObjectCommand`, `DeleteObjectCommand`, and `GetObjectCommand`.

### Internal Dependencies
- `@config/env`: DO Spaces credentials and endpoint settings.
- `@shared/logger`: Logging successes and failures.
- `uuid`: For ensuring unique S3 keys.
- `path`: Node.js module for parsing extensions and basenames.

### Business Rules
- **Allowed MIME Types**: Restricted to JPEG, PNG, WEBP, GIF, and PDF.
- **Size Caps**: A global default cap of 10MB per file, which can be overridden via `maxBytes`.
- **Public CDN**: Uploads use `public-read` ACL so files (like profile pictures) are accessible directly via the CDN URL.
- **Cache Control**: Sets `max-age=31536000` (1 year) to ensure files are heavily cached by the CDN.

### Database Writes
- None.

### Database Reads
- None.

### Cross-Module Communication
- Exposes a generic utility (`s3Service`) used across the system (e.g., workforce document uploads, user profile picture uploads).

---

## 3. User Service (`user/user.service.ts`)

### Responsibilities
Manages core customer/user profile data, their stats, saved addresses, GST details for B2B billing, and enterprise team members.

### Methods
- `getStats(userId)`: Calculates user booking statistics and average ratings.
- `getProfile(userId)`: Fetches user profile, securely omitting sensitive internal tokens or onboarding payloads, but including minimal driver/worker relations.
- `updateProfile(userId, data)`: Updates basic scalar fields on the User model.
- `updateProfileImage(userId, imageUrl)`: Dedicated method for updating just the profile image URL (typically after an S3 upload).
- `getAddresses(userId)`: Fetches a user's saved addresses, ordering the default address first.
- `addAddress(userId, data)`: Creates a saved address. If it's the first address, or if `isDefault` is true, handles setting default flags accordingly.
- `updateAddress(userId, addressId, data)`: Updates a specific address and safely manages default address reassignment.
- `deleteAddress(userId, addressId)`: Deletes an address. If the default is deleted, it auto-promotes the most recent remaining address to default.
- `setDefaultAddress(userId, addressId)`: Transactionally unsets the previous default and sets the new default address.
- `getGstDetails(userId)`: Fetches saved GSTIN details, ordering the primary one first.
- `addGstDetail(userId, data)`: Adds a GSTIN. Prevents duplicates. Sets to primary if it's the first one.
- `deleteGstDetail(userId, gstId)`: Deletes a GST detail and promotes a new primary if needed.
- `setPrimaryGst(userId, gstId)`: Transactionally sets a GSTIN as primary.
- `getTeamMembers(userId)`: Lists team members for enterprise accounts.
- `addTeamMember(userId, data)`: Adds a team member, ensuring no duplicate phone numbers exist in the team.
- `updateTeamMember(userId, memberId, data)`: Modifies team member data.
- `deleteTeamMember(userId, memberId)`: Removes a team member.

### External Calls
- None.

### Internal Dependencies
- `@shared/db/prisma`: Database client.
- `@shared/errors/AppError`: Standardized error throwing.

### Business Rules
- **Default/Primary State Management**: Guarantees only one default address and one primary GSTIN per user. Deleting a default/primary automatically falls back to the most recently created entity.
- **Data Encapsulation**: `getProfile` strictly defines the `select` statement to avoid leaking FCM tokens, refresh tokens, or sensitive DOBs to the frontend.
- **Duplicate Prevention**: Strictly prevents adding identical GSTINs or identical phone numbers in team management.

### Database Writes
- Updates `User` records.
- Creates/Updates/Deletes `SavedAddress`, `GstDetail`, and `TeamMember` records.

### Database Reads
- Queries `User`, `Booking` (for stats), `SavedAddress`, `GstDetail`, `TeamMember`.

### Cross-Module Communication
- Independent module; accessed via controllers.

---

## 4. Wallet Service (`wallet/wallet.service.ts`)

### Responsibilities
Manages the user's digital wallet, handling balance tracking, transaction history, manual add/deduct operations, top-ups via Razorpay, and direct payments for bookings.

### Methods
- `getWallet(userId)`: Retrieves the user's wallet and recent transaction history, creating the wallet if it doesn't exist.
- `getTransactionHistory(userId, page, limit)`: Provides paginated wallet transactions.
- `addMoney(userId, amount, referenceId)`: Internal/Admin utility to credit funds and create a transaction log.
- `deductMoney(userId, amount, reason, referenceId)`: Internal utility to unconditionally debit funds (if balance allows).
- `payForBooking(userId, bookingId)`: The core booking payment method. Deducts wallet balance and updates the Booking to PAID atomically.
- `createTopUpOrder(userId, amount)`: Generates a Razorpay Order ID for a wallet top-up request.
- `verifyTopUp(userId, order_id, payment_id, signature)`: Validates the Razorpay webhook/signature and credits the wallet idempotently.
- `refundToWallet(userId, bookingId, amount)`: Idempotently refunds cancelled booking fares back to the wallet.
- `creditCashback(userId, amount, referenceId, note)`: Idempotently credits promotional or referral cashback to the wallet.

### External Calls
- **Razorpay SDK**: Creates orders (`razorpay.orders.create`) and fetches order details (`razorpay.orders.fetch`) to verify actual paid amounts.

### Internal Dependencies
- `@shared/db/prisma`: Database client.
- `@modules/marketplace/marketplace.service`: Calls `finalizePaidAward` when a private bid booking is successfully paid via wallet.
- `crypto`: Node.js crypto for generating and verifying HMAC SHA256 signatures for Razorpay.

### Business Rules
- **Race Condition Prevention (Double Spending)**: `payForBooking` uses `Prisma.TransactionIsolationLevel.Serializable` and atomic decrement conditions (`cachedBalance: { gte: amount }`). If two concurrent requests attempt to pay, one succeeds and the other throws an `INSUFFICIENT_BALANCE` or `PAYMENT_STATE_CONFLICT`.
- **Payment Verification**: `verifyTopUp` strictly uses the `amount_paid` field from the Razorpay Order object rather than the requested order amount, preventing issues where a user makes a partial payment but gets fully credited.
- **Idempotency**: Top-ups, refunds, and cashback methods all query `WalletTransaction` by `referenceId` first to ensure they never double-credit the user.
- **Top-Up Limits**: Enforces a minimum top-up of ₹1 and a maximum of ₹1,00,000.

### Database Writes
- **`Wallet`**: Increments/decrements `cachedBalance`.
- **`WalletTransaction`**: Creates credit/debit history logs.
- **`Booking`**: Updates `paymentStatus`, `paymentRef`, and `paymentMethod` when `payForBooking` completes.

### Database Reads
- Queries `Wallet`, `WalletTransaction`, `Booking`, `BidAward`.

### Cross-Module Communication
- Triggers `finalizePaidAward(bookingId)` in the Marketplace service immediately after a successful wallet payment for a Bid-based booking.

---

## 5. Workforce Service (`workforce/workforce.service.ts`)

### Responsibilities
Manages the entire lifecycle of manual laborers (workers) in the system. This includes specialized OTP authentication, high-frequency location tracking, profile management, fetching available gig/job feeds, and job acceptance logic.

### Methods
- `haversineKm(...)`: Calculates geographic distance between two coordinates.
- `storeOtp / getOtp / deleteOtp`: Manages OTP lifecycle using a dual-write strategy (Redis + In-Memory Map).
- `sendOtp(input)`: Generates a 6-digit OTP and pushes it via Firebase Cloud Messaging (FCM) or handles static overrides for demo accounts.
- `verifyOtp(input)`: Validates the OTP, upserts `User` and `Worker` entities, and generates JWT Access and Refresh tokens.
- `getMe(userId)`: Returns the detailed worker profile and associated documents.
- `updateStatus(userId, input)`: Toggles the worker between `AVAILABLE` and `OFFLINE`.
- `updateLocation(userId, input)`: High-frequency GPS endpoint. Writes instantly to Redis, and snapshots to PostgreSQL every 30 seconds to save DB load.
- `updateBankDetails(userId, input)`: Sets bank info.
- `updatePreferences(userId, input)`: Updates labor preferences (gig types, max weights, languages, etc.).
- `uploadDocuments(userId, input)`: Maps uploaded S3 URLs to `WorkerDocument` records.
- `getDashboardStats(userId)`: Computes daily completions, daily earnings (via `WorkerWalletTransaction`), and fetches any active job assignment.
- `getAvailableJobs(userId, query)`: Fetches unassigned `GigJobs`. Calculates real-time distance using Haversine, applies filters (payout, distance, type), and normalizes the output into a unified `JobFeedItem` interface for the mobile app.
- `getActiveJob(userId)`: Retrieves the worker's currently active `JobAssignment` or `GigAssignment`.
- `acceptJob(userId, bookingId)`: Core transactional logic to allow a worker to claim a slot on a job.

### External Calls
- No HTTP calls, but relies heavily on Redis and FCM.

### Internal Dependencies
- `@config/redis`: Used for OTP storage and high-frequency location caching.
- `@modules/notifications/notification.service`: Sends OTPs and job assignment alerts via FCM.
- `@shared/socket/socket.instance`: Emits real-time WebSocket events.
- `@shared/db/prisma`: Database client.
- `jsonwebtoken` / `crypto`: Token generation.

### Business Rules
- **OTP Dual-Write Resilience**: If Redis goes down, OTP generation falls back to an in-memory Map, ensuring workers can still log in.
- **Location Throttling**: GPS pings arrive constantly. The service updates Redis instantly (60s TTL), but uses a Redis `NX` lock to ensure the PostgreSQL `Worker.currentLat/Lng` is updated at most once every 30 seconds.
- **Job Acceptance Concurrency**: `acceptJob` wraps assignment creation in a `Serializable` transaction and uses retry logic (`P2034` Prisma codes). It ensures a job requiring `X` laborers cannot accept `X+1` workers due to race conditions.
- **Verification Gates**: Workers cannot view available jobs or accept jobs unless their `isDocVerified` flag is true (documents approved by admin).
- **Demo Accounts**: Phone numbers mapped in `DEMO_ACCOUNTS` bypass dynamic OTP generation and FCM delivery, accepting a hardcoded static OTP (e.g., for Apple/Google App Store reviewers).

### Database Writes
- `User`: Upserts on OTP verification, updates profile info.
- `Worker`: Upserts on login, updates location, status, preferences.
- `RefreshToken`: Generated upon login.
- `WorkerDocument`: Created upon document submission.
- `GigAssignment` / `JobAssignment`: Created when a worker accepts a job.

### Database Reads
- Queries `User`, `Worker`, `WorkerDocument`, `WorkerWallet`, `WorkerWalletTransaction`, `GigJob`, `GigAssignment`, `JobAssignment`, `Booking`.

### Cross-Module Communication
- Integrates with `@modules/notifications/notification.service` to push device notifications on job acceptance.
- Uses `@shared/socket/socket.instance` to emit `gig_fully_assigned` or `workers_fully_assigned` to a booking's Socket.IO room when all slots are claimed, informing clients in real-time.
