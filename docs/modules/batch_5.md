# Backend Modules Analysis - Batch 5

This document provides an exhaustive analysis of the `upload`, `user`, `wallet`, `webhooks`, and `workforce` modules within the logistics platform backend.

---

## 1. Upload Module (`upload`)

### 1. Purpose
The `upload` module is responsible for handling all file uploads across the application. It acts as an abstraction layer for storing files in an S3-compatible cloud storage (specifically DigitalOcean Spaces) and exposes endpoints for clients to seamlessly upload and delete media.

### 2. Responsibilities
- Processing multipart/form-data requests using Multer.
- Enforcing file size limits (e.g., 10 MB generally, 3 MB for avatars) and MIME-type restrictions.
- Sanitizing file names and generating unique UUID-based object keys.
- Uploading files to specific buckets/folders (e.g., `profile`, `bookings`, `documents`, `banners`, `uploads`).
- Serving pre-signed URLs for private documents.
- Deleting files from cloud storage.

### 3. Public Services
- **`s3Service`**: The core service providing programmatic access to storage. Methods include `uploadFile`, `uploadMultiple`, `deleteFile`, and `getSignedUrl`.
- **Multer Middlewares**: `upload` (general 10 MB limit) and `uploadAvatar` (strict 3 MB limit for specific image formats).

### 4. Controllers
- **`uploadController`**:
  - `uploadSingle`: Uploads a single file to a specified folder.
  - `uploadMultiple`: Uploads up to 10 files in a single request.
  - `deleteFile`: Removes an object from S3 using its URL-encoded key.

### 5. Repositories
The module does not use database repositories directly. It interfaces entirely with the AWS S3 SDK for DigitalOcean Spaces.

### 6. DTOs
File validation is handled implicitly via Multer configuration and folder mappings (`UploadFolderType`). No explicit Zod schemas are defined.

### 7. Entities
No Prisma database entities are owned by this module.

### 8. Events
No internal pub/sub events are emitted or consumed by this module.

### 9. Dependencies on Other Modules
- **`@shared/logger`**: For logging upload successes, warnings, and S3 errors.
- **`@config/env`**: To load cloud storage credentials.

### 10. Database Models Used
None.

### 11. Business Logic Ownership
The business logic (validation, path generation, bucket interaction) is exclusively owned by **`upload.service.ts`**.

---

## 2. User Module (`user`)

### 1. Purpose
The `user` module manages customer-facing profiles and associated configurations. It handles general user information, address books, taxation details (GST), and enterprise functionalities such as managing team members.

### 2. Responsibilities
- Retrieving and updating the core user profile (name, avatar, language, usage type).
- Providing statistical summaries for a customer (e.g., total bookings, completed bookings, average rating).
- Managing an address book (Saved Addresses) with default address toggling.
- Managing GST details (adding, deleting, setting primary).
- Managing team members for enterprise accounts (adding, updating, deleting).
- Managing push notification tokens (FCM).

### 3. Public Services
- **`UserService`**: Exposes methods for handling all customer-related operations (`getStats`, `getProfile`, `updateProfile`, `updateProfileImage`, `getAddresses`, `addAddress`, `updateAddress`, `deleteAddress`, `setDefaultAddress`, `getGstDetails`, `addGstDetail`, `deleteGstDetail`, `setPrimaryGst`, `getTeamMembers`, `addTeamMember`, `updateTeamMember`, `deleteTeamMember`).

### 4. Controllers
- **`user.controller.ts`**: Maps HTTP endpoints to `UserService` methods. Notable routes include `uploadAvatar` which securely pipes a Multer file buffer to the `upload` module before persisting the URL.

### 5. Repositories
Direct Prisma Client calls are used inside the service to manipulate data.

### 6. DTOs
Validated via Zod in `user.schema.ts`:
- `updateProfileSchema`
- `addAddressSchema`, `updateAddressSchema`
- `addGstSchema`
- `addTeamMemberSchema`, `updateTeamMemberSchema`
- `updateFcmTokenSchema`

### 7. Entities
- `User`
- `SavedAddress`
- `GstDetail`
- `TeamMember`

### 8. Events
No specific Pub/Sub events.

### 9. Dependencies on Other Modules
- **`upload`**: Uses `s3Service` for profile avatar uploads.

### 10. Database Models Used
- `User`, `SavedAddress`, `GstDetail`, `TeamMember`, `Booking` (for aggregating stats).

### 11. Business Logic Ownership
The business logic resides in **`user.service.ts`**.

---

## 3. Wallet Module (`wallet`)

### 1. Purpose
The `wallet` module handles the digital wallet system for customers. It allows users to load funds, view their transaction history, and pay for freight bookings directly from their pre-paid balance.

### 2. Responsibilities
- Managing and caching wallet balances.
- Generating Razorpay top-up orders and securely verifying the resultant payment signatures.
- Crediting funds via top-ups, refunds (for cancelled bookings), and promotional cashbacks.
- Processing booking payments atomically to prevent double-spending and race conditions.
- Maintaining a comprehensive double-entry-style ledger (`WalletTransaction`).

### 3. Public Services
- **`WalletService`**:
  - Wallet Fetching: `getWallet`, `getTransactionHistory`
  - Money Movement: `addMoney`, `deductMoney`, `payForBooking`
  - Integration: `createTopUpOrder`, `verifyTopUp`, `refundToWallet`, `creditCashback`

### 4. Controllers
- **`wallet.controller.ts`**: Handles REST API requests to fetch wallet state, initiate top-ups, verify Razorpay payments, and pay for a booking.

### 5. Repositories
Direct Prisma Client calls. Transactions (`prisma.$transaction`) are heavily utilized to guarantee atomic increments/decrements.

### 6. DTOs
- `addMoneySchema` (in `wallet.schema.ts`) for direct crediting. Top-up routes rely on inline validation for Razorpay parameters.

### 7. Entities
- `Wallet`
- `WalletTransaction`

### 8. Events
- Does not emit standard events, but explicitly invokes `finalizePaidAward(bookingId)` from the `marketplace` module after successfully debiting the wallet for a booking.

### 9. Dependencies on Other Modules
- **`marketplace`**: Depends on `finalizePaidAward` to formally secure the bid award once payment is collected.
- **Razorpay SDK**: Used for initiating top-up orders and verifying HMAC signatures.

### 10. Database Models Used
- `Wallet`, `WalletTransaction`, `Booking`, `BidAward`.

### 11. Business Logic Ownership
The core financial safety logic, including idempotency checks, isolation levels, and atomic decrement operations, is wholly owned by **`wallet.service.ts`**.

---

## 4. Webhooks Module (`webhooks`)

### 1. Purpose
The `webhooks` module serves as the ingestion point for asynchronous events dispatched by third-party payment gateways (Razorpay, RazorpayX). It guarantees safe, idempotent state updates.

### 2. Responsibilities
- Ingesting incoming webhook HTTP requests (using raw body buffers for signature calculation).
- Verifying HMAC signatures using provider-specific secrets (`RAZORPAY_WEBHOOK_SECRET`, `RAZORPAYX_WEBHOOK_SECRET`).
- Enforcing strict idempotency to safely ignore duplicate events delivered by providers.
- Triggering fallback behaviors (e.g., crediting a wallet if a user dropped off before calling the verification API).
- Processing driver payout lifecycle events (completed, failed, reversed) for RazorpayX.

### 3. Public Services
No explicit `.service.ts` layer. Logic is encapsulated within the controller.

### 4. Controllers
- **`webhooks.controller.ts`**:
  - `handleRazorpayWebhook`: Processes `payment.captured` and other gateway events.
  - `handleRazorpayXWebhook`: Processes `payout.processed`, `payout.failed`, `payout.reversed`.

### 5. Repositories
Direct Prisma access for webhook idempotency and entity updates.

### 6. DTOs
Implicit. Relies on the structured JSON payloads emitted by Razorpay/RazorpayX.

### 7. Entities
- `ProcessedWebhook` (Idempotency table)

### 8. Events
This module acts as an HTTP event consumer for external system events.

### 9. Dependencies on Other Modules
- **`driver-wallet`**: Calls `refundFailedWithdrawal` to refund the driver's wallet if a RazorpayX payout fails or reverses.

### 10. Database Models Used
- `ProcessedWebhook`, `WalletTransaction`, `WithdrawalRequest`.

### 11. Business Logic Ownership
The business logic mapping external events to internal state transitions is owned by **`webhooks.controller.ts`**.

---

## 5. Workforce Module (`workforce`)

### 1. Purpose
The `workforce` module is an expansive subsystem dedicated to managing the gig-economy laborers (loaders/unloaders) on the platform. It handles onboarding, job dispatch, live tracking, and payouts.

### 2. Responsibilities
- **Authentication**: Issuing and verifying OTPs (with static bypass for demo accounts) and issuing JWTs.
- **Worker Management**: Managing profiles, bank details, documents (Aadhaar, PAN), and configurable preferences.
- **Job Lifecycle**: Matching available nearby jobs using Haversine formulas, and handling accept, decline, arrive, start, and complete states (enforced via completion OTP).
- **Location Tracking**: Continuously updating worker coordinates using Redis TTLs to dictate active availability.
- **Wallet & Payouts**: Viewing wallet balances, transaction histories, and requesting bank withdrawals.
- **Safety**: Offering an SOS trigger for emergencies.
- **Admin Oversight**: Allowing administrators to list the workforce, suspend workers, override bank details, and revoke document verifications.

### 3. Public Services
- **`workforce.service.ts`**: Implements OTP delivery, token issuance, dashboard aggregations, job assignment lifecycle, spatial queries for jobs, wallet management, profile updates, and gamification hooks.

### 4. Controllers
- **`workforce.controller.ts`**: Standard app-facing endpoints for auth, jobs, wallet, profile, history, earnings, performance, and safety.
- **`workforce.admin.controller.ts`**: Back-office endpoints to list, manage, and suspend workforce members.

### 5. Repositories
Uses Prisma for persistent data and Redis (`getRedis()`) for ephemeral, high-throughput data (OTP storage, active worker geolocation).

### 6. DTOs
Comprehensive validation defined in `workforce.schema.ts`, including:
- `SendOtpSchema`, `VerifyOtpSchema`
- `UpdateStatusSchema`, `UpdateLocationSchema`, `UpdateBankDetailsSchema`, `UpdatePreferencesSchema`, `UploadDocumentsSchema`
- `AvailableJobsQuerySchema`, `CompleteJobSchema`, `WithdrawSchema`, `SosSchema`

### 7. Entities
- `Worker`
- `WorkerAssignment`
- `WorkerDocument`
- `User`, `RefreshToken`

### 8. Events
- **Websockets**: Real-time event emission via `emitToWorkerRoom` and `emitToBookingRoom` to notify apps of job status changes.
- **FCM Notifications**: Sends Firebase Cloud Messaging alerts to devices (e.g., OTP delivery, new job alerts).

### 9. Dependencies on Other Modules
- **`notifications`**: Integrates with `notification.service` and `inapp.notification.service`.
- **`gamification`**: Triggers `gamificationService` hooks upon job actions.
- **`shared/payments`**: Validates withdrawal rules via `outbound-payment.policy`.

### 10. Database Models Used
- `Worker`, `WorkerAssignment`, `WorkerDocument`, `User`, `RefreshToken`, `Wallet`, `WalletTransaction`, `WithdrawalRequest`.

### 11. Business Logic Ownership
The heavy operational logic resides in **`workforce.service.ts`**, with administrative override logic residing in **`workforce.admin.controller.ts`**.
