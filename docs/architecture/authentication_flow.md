# Authentication and Authorization Architecture

This document outlines the authentication (AuthN) and authorization (AuthZ) flows for the logistic backend system.

## 1. Authentication Flow Overview

The system uses a passwordless authentication flow via OTP (One-Time Password) combined with Firebase Cloud Messaging (FCM) for delivery.

### 1.1. Send OTP (`POST /api/v1/auth/send-otp`)
- **Controller:** `sendOtp` in `auth.controller.ts`
- **Service Logic:**
  - Identifies **Demo Accounts** (e.g., Google Play reviewers) which bypass actual OTP generation and delivery.
  - Generates a 6-digit random OTP.
  - **Storage:** Dual-writes the OTP to Redis (with a TTL of 5 minutes) and an in-memory `Map`. The in-memory fallback ensures reliability in development/non-prod environments where Redis might be volatile.
  - **FCM Token Handling:** If a new FCM token is provided, it temporarily caches it in Redis. For returning users, it fetches the existing FCM token from the database.
  - **Delivery:** Sends the OTP via a **data-only push notification** through Firebase Cloud Messaging (FCM). This ensures the app handles the notification consistently in both foreground and background states without system interference.
  - *(Temporary Dev Behavior)*: Returns `_devOtp: "123456"` in the response payload for testing until the SMS gateway is fully integrated.

### 1.2. Verify OTP (`POST /api/v1/auth/verify-otp`)
- **Controller:** `verifyOtp` in `auth.controller.ts`
- **Service Logic:**
  - For demo accounts, validates against hardcoded static OTPs (e.g., `123456`).
  - For regular users, retrieves the OTP from Redis (or the in-memory fallback).
  - Validates the OTP and **immediately deletes it** to enforce one-time usage.
  - Checks if the user exists and if their account (or fleet account) is active. Throws `Forbidden` if deactivated.
  - Upserts the user record (`prisma.user.upsert`) using the phone number as the unique identifier.
  - **Token Generation:** Issues a new Access Token and Refresh Token pair (see Section 3).
  - Emits a `user.registered` event for brand new users.

## 2. Authorization (Middleware & Guards)

Authorization is handled at the Express middleware layer by intercepting requests and decoding JWTs.

### 2.1. Authentication Middleware (`authenticate`)
Located in `shared/middleware/auth.middleware.ts`.
- Extracts the `Bearer` token from the `Authorization` header.
- Uses `jwt.verify` with the `JWT_ACCESS_SECRET` to decode the payload.
- Injects the extracted data into the request object (`req.user = { id, phone, role }`).
- Handles `TokenExpiredError` by returning a standardized `401 Unauthorized`.

### 2.2. Role-Based Access Control (`requireRole`)
Located in `shared/middleware/auth.middleware.ts`.
- A higher-order function that takes a list of allowed `UserRole`s (e.g., `ADMIN`, `DRIVER`, `CUSTOMER`).
- Verifies that `req.user` exists and that `req.user.role` is included in the allowed roles list.
- Throws `403 Forbidden` if the user has insufficient permissions.
- **Usage Example:** `router.post('/some-route', authenticate, requireRole('ADMIN', 'FLEET_OWNER'), handler);`

### 2.3. Optional Authentication (`optionalAuth`)
- Used for routes where user identity is helpful but not strictly required.
- Attempts to verify the token and attach `req.user`, but gracefully proceeds to `next()` if the token is missing or invalid.

## 3. JWT Structure & Token Lifecycle

The system implements a short-lived access token and a long-lived, rotating refresh token strategy.

### 3.1. Token Issuance (`issueTokenPair`)
- **Access Token:** 
  - Payload: `{ userId, phone, role }`
  - Lifespan: Configured via `JWT_ACCESS_EXPIRES` (typically 15 minutes).
  - Signed using `JWT_ACCESS_SECRET`.
- **Refresh Token:**
  - Payload: `{ userId, role, jti }` (where `jti` is a UUID v4).
  - Lifespan: 30 days.
  - Signed using `JWT_ACCESS_SECRET`.
  - The raw signed JWT is stored in the database (`prisma.refreshToken`) along with its expiry date.

### 3.2. Refresh Token Rotation (`POST /api/v1/auth/refresh`)
The system enforces strict **Single-Use Refresh Token Rotation** to prevent replay attacks.
- Client calls the refresh endpoint with their current refresh token.
- **Validation:** 
  - The system decodes the token and searches for it in the `refreshToken` database table.
  - If the token is not found (e.g., already used or invalid), it throws `401 Unauthorized`.
  - If the token is expired in the database, it deletes the record and throws `401 Unauthorized`, requiring the user to log in again.
  - Checks if the user account is still active.
- **Rotation:**
  - The system **deletes the used refresh token from the database**.
  - A completely new Access Token and Refresh Token pair is generated via `issueTokenPair`.
  - The new refresh token is saved to the database.

### 3.3. Logout (`POST /api/v1/auth/logout`)
- The client provides their current refresh token.
- The system executes `prisma.refreshToken.deleteMany` to remove the token from the database, effectively invalidating it.
- This operation is idempotent; it succeeds even if the token was already deleted.
