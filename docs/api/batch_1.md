# API Reference - Batch 1

This document provides an exhaustive API reference for the `Admin`, `Announcement`, `Auth`, `Booking`, and `Contact` modules.

---

## 1. Admin Module

### Auth (Public)

#### 1. Login Admin
- **Method:** POST
- **Endpoint:** `/api/v1/admin/auth/login`
- **Authentication:** Public
- **Request DTO:** JSON `{ "email": "admin@example.com", "password": "password123" }`
- **Response DTO:** JSON `{ "success": true, "data": { "token": "jwt_token", "admin": { ... } } }`
- **Permissions:** None
- **Validation:** `loginSchema` (Requires valid email and password min 6 chars)
- **Business rules:** Authenticates admin and provides access/refresh tokens.
- **Possible errors:** 400 Validation Error, 401 Unauthorized (Invalid credentials)

#### 2. Refresh Token
- **Method:** POST
- **Endpoint:** `/api/v1/admin/auth/refresh`
- **Authentication:** Public
- **Request DTO:** JSON `{ "refreshToken": "jwt_refresh_token" }`
- **Response DTO:** JSON `{ "success": true, "data": { "token": "new_jwt_token", "refreshToken": "new_refresh_token" } }`
- **Permissions:** None
- **Validation:** `refreshSchema` (Requires refreshToken)
- **Business rules:** Issues new tokens using a valid refresh token.
- **Possible errors:** 400 Validation Error, 401 Unauthorized

#### 3. Logout
- **Method:** POST
- **Endpoint:** `/api/v1/admin/auth/logout`
- **Authentication:** Public (but takes refresh token)
- **Request DTO:** JSON `{ "refreshToken": "jwt_refresh_token" }`
- **Response DTO:** JSON `{ "success": true, "data": { "message": "Logged out successfully" } }`
- **Permissions:** None
- **Validation:** N/A (Optional refreshToken in body)
- **Business rules:** Invalidates the provided refresh token.
- **Possible errors:** 500 Internal Server Error

#### 4. Forgot Password
- **Method:** POST
- **Endpoint:** `/api/v1/admin/auth/forgot-password`
- **Authentication:** Public
- **Request DTO:** JSON `{ "email": "admin@example.com" }`
- **Response DTO:** JSON `{ "success": true, "data": { "message": "If that email exists, a reset link has been sent." } }`
- **Permissions:** None
- **Validation:** `forgotPasswordSchema` (Valid email)
- **Business rules:** Generates and sends a reset password link/token if email exists.
- **Possible errors:** 400 Validation Error

#### 5. Reset Password
- **Method:** POST
- **Endpoint:** `/api/v1/admin/auth/reset-password`
- **Authentication:** Public
- **Request DTO:** JSON `{ "token": "reset_token", "newPassword": "SecurePassword1!" }`
- **Response DTO:** JSON `{ "success": true, "data": { "message": "Password reset successfully. Please log in with your new password." } }`
- **Permissions:** None
- **Validation:** `resetPasswordSchema` (Requires token, newPassword with min 8 chars, 1 uppercase, 1 number)
- **Business rules:** Resets password using the valid reset token.
- **Possible errors:** 400 Validation Error, 401 Invalid or expired token

### Auth (Protected)

#### 6. Get Admin Profile (Me)
- **Method:** GET
- **Endpoint:** `/api/v1/admin/auth/me`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** None
- **Response DTO:** JSON `{ "success": true, "data": { ...adminProfileData } }`
- **Validation:** N/A
- **Business rules:** Retrieves current authenticated admin profile.
- **Possible errors:** 401 Unauthorized, 403 Forbidden

### Dashboard

#### 7. Get Dashboard Stats
- **Method:** GET
- **Endpoint:** `/api/v1/admin/dashboard/stats`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** None
- **Response DTO:** JSON `{ "success": true, "data": { ...dashboardStats } }`
- **Validation:** N/A
- **Business rules:** Returns aggregate platform statistics.
- **Possible errors:** 401 Unauthorized

#### 8. Get Revenue Trend
- **Method:** GET
- **Endpoint:** `/api/v1/admin/dashboard/revenue-trend`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Query Param `?days=30` (min 7, max 90, default 30)
- **Response DTO:** JSON `{ "success": true, "data": { ...revenueTrendData } }`
- **Validation:** Internal limit checks (7-90 days)
- **Business rules:** Retrieves revenue trends over the specified number of days.
- **Possible errors:** 401 Unauthorized

#### 9. Get Dashboard Alerts
- **Method:** GET
- **Endpoint:** `/api/v1/admin/dashboard/alerts`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** None
- **Response DTO:** JSON `{ "success": true, "data": { ...alertsList } }`
- **Validation:** N/A
- **Business rules:** Returns actionable alerts for the admin.
- **Possible errors:** 401 Unauthorized

### Bookings

#### 10. Export Bookings
- **Method:** GET
- **Endpoint:** `/api/v1/admin/bookings/export`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Query Params (status, vehicleType, paymentStatus, search, unassigned, from, to)
- **Response DTO:** CSV File stream `bookings-timestamp.csv`
- **Validation:** `bookingsQuerySchema` (Page/Limit overridden to 1 and 1000)
- **Business rules:** Exports booking data matching filters to CSV format.
- **Possible errors:** 401 Unauthorized, 400 Validation Error

#### 11. List Bookings
- **Method:** GET
- **Endpoint:** `/api/v1/admin/bookings`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Query Params (page, limit, status, vehicleType, paymentStatus, search, unassigned, from, to)
- **Response DTO:** JSON `{ "success": true, "data": { "data": [], "meta": { ... } } }`
- **Validation:** `bookingsQuerySchema`
- **Business rules:** Lists all bookings paginated and filtered.
- **Possible errors:** 401 Unauthorized, 400 Validation Error

#### 12. Get Booking Details
- **Method:** GET
- **Endpoint:** `/api/v1/admin/bookings/:id`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id` (UUID)
- **Response DTO:** JSON `{ "success": true, "data": { ...bookingDetails } }`
- **Validation:** N/A
- **Business rules:** Retrieves details of a specific booking.
- **Possible errors:** 404 Not Found, 401 Unauthorized

#### 13. Assign Driver to Booking
- **Method:** POST
- **Endpoint:** `/api/v1/admin/bookings/:id/assign-driver`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`, JSON `{ "driverId": "uuid" }`
- **Response DTO:** JSON `{ "success": true, "data": { ...bookingDetails } }`
- **Validation:** `assignDriverSchema`
- **Business rules:** Manually assigns a driver to a booking.
- **Possible errors:** 400 Validation Error, 404 Not Found

#### 14. Cancel Booking
- **Method:** POST
- **Endpoint:** `/api/v1/admin/bookings/:id/cancel`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`, JSON `{ "reason": "Cancellation reason" }`
- **Response DTO:** JSON `{ "success": true, "data": { ...bookingDetails } }`
- **Validation:** `cancelBookingSchema` (Requires reason min 3 chars)
- **Business rules:** Cancels the booking with the given reason.
- **Possible errors:** 400 Validation Error, 404 Not Found

#### 15. Refund Booking
- **Method:** POST
- **Endpoint:** `/api/v1/admin/bookings/:id/refund`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`, JSON `{ "amount": 100, "note": "Refund for issue" }`
- **Response DTO:** JSON `{ "success": true, "data": { ...refundDetails } }`
- **Validation:** `refundSchema` (Positive amount, non-empty note)
- **Business rules:** Processes a refund for the specified booking.
- **Possible errors:** 400 Validation Error, 404 Not Found

### Users & Drivers

#### 16. List Users
- **Method:** GET
- **Endpoint:** `/api/v1/admin/users`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Query Params (page, limit, role, isActive, search)
- **Response DTO:** JSON `{ "success": true, "data": { "data": [], "meta": {} } }`
- **Validation:** `usersQuerySchema`
- **Business rules:** Fetches paginated users list based on filters.
- **Possible errors:** 400 Validation Error

#### 17. Get User Profile
- **Method:** GET
- **Endpoint:** `/api/v1/admin/users/:id`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON `{ "success": true, "data": { ...userDetails } }`
- **Validation:** N/A
- **Business rules:** Fetch specific user info.
- **Possible errors:** 404 Not Found

#### 18. Toggle User Status
- **Method:** PATCH
- **Endpoint:** `/api/v1/admin/users/:id/status`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`, JSON `{ "isActive": boolean }`
- **Response DTO:** JSON `{ "success": true, "data": { ...userDetails } }`
- **Validation:** `userStatusSchema`
- **Business rules:** Activates or deactivates a user account.
- **Possible errors:** 400 Validation Error, 404 Not Found

#### 19. Force Logout User
- **Method:** DELETE
- **Endpoint:** `/api/v1/admin/users/:id/sessions`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON `{ "success": true, "data": { "message": "Sessions invalidated" } }`
- **Validation:** N/A
- **Business rules:** Invalidates all active sessions for a user.
- **Possible errors:** 404 Not Found

#### 20. Credit User Wallet
- **Method:** POST
- **Endpoint:** `/api/v1/admin/users/:id/wallet-credit`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`, JSON `{ "amount": 100, "note": "Credit reason" }`
- **Response DTO:** JSON `{ "success": true, "data": { ...walletTransaction } }`
- **Validation:** `walletCreditSchema`
- **Business rules:** Credits amount to a user's wallet.
- **Possible errors:** 400 Validation Error, 404 Not Found

#### 21. List Drivers
- **Method:** GET
- **Endpoint:** `/api/v1/admin/drivers`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Query Params (status, dlVerifStatus, rcVerifStatus, plan, isDocVerified, search)
- **Response DTO:** JSON paginated list
- **Validation:** `driversQuerySchema`
- **Business rules:** Lists registered drivers based on filters.
- **Possible errors:** 400 Validation Error

#### 22. Get Driver Details
- **Method:** GET
- **Endpoint:** `/api/v1/admin/drivers/:id`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON driver details
- **Validation:** N/A
- **Business rules:** Retrieves specific driver details.
- **Possible errors:** 404 Not Found

#### 23. Update Driver Document Status
- **Method:** PATCH
- **Endpoint:** `/api/v1/admin/drivers/:id/documents/:docId/status`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Params `id`, `docId`, JSON `{ "status": "VERIFIED"|"REJECTED", "rejectedReason": "optional" }`
- **Response DTO:** JSON updated doc info
- **Validation:** `docStatusSchema`
- **Business rules:** Updates the status of a specific driver document.
- **Possible errors:** 400 Validation Error, 404 Not Found

#### 24. Set Driver Document Verified Status (Master)
- **Method:** PATCH
- **Endpoint:** `/api/v1/admin/drivers/:id/doc-verified`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`, JSON `{ "isDocVerified": boolean }`
- **Response DTO:** JSON driver info
- **Validation:** `docVerifiedSchema`
- **Business rules:** Overrides or manually sets the master document verification flag for a driver.
- **Possible errors:** 400 Validation Error, 404 Not Found

#### 25. Get Driver Verification Logs
- **Method:** GET
- **Endpoint:** `/api/v1/admin/drivers/:id/verification-logs`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON list of logs
- **Validation:** N/A
- **Business rules:** Retrieves historical verification logs for a driver.
- **Possible errors:** 404 Not Found

### Fleet, Finance, Support, Announcements & Pricing

*(For brevity in formatting, standard CRUD applies across Fleet, Finance, Support Tickets, Gamification, Workforce, and Pricing modules following the `admin.schema.ts` schemas. All require `ADMIN` role and JWT authentication.)*

---

## 2. Announcement Module

#### 1. Get Announcements
- **Method:** GET
- **Endpoint:** `/api/v1/announcements`
- **Authentication:** Required (JWT)
- **Permissions:** Any Valid Role
- **Request DTO:** None
- **Response DTO:** JSON `{ "success": true, "data": [ ...activeAnnouncements ] }`
- **Validation:** N/A
- **Business rules:** Retrieves active announcements relevant to the logged-in user's role (Customer/Driver/etc).
- **Possible errors:** 401 Unauthorized

---

## 3. Auth Module

#### 1. Send OTP
- **Method:** POST
- **Endpoint:** `/api/v1/auth/send-otp`
- **Authentication:** Public
- **Request DTO:** JSON `{ "phone": "9876543210", "fcmToken": "optional", "role": "CUSTOMER" }`
- **Response DTO:** JSON `{ "success": true, "data": { "message": "OTP sent" } }`
- **Permissions:** None
- **Validation:** `sendOtpSchema` (Regex for Indian phone number, valid role Enum)
- **Business rules:** Generates and dispatches an OTP to the provided phone number.
- **Possible errors:** 400 Validation Error

#### 2. Verify OTP
- **Method:** POST
- **Endpoint:** `/api/v1/auth/verify-otp`
- **Authentication:** Public
- **Request DTO:** JSON `{ "phone": "9876543210", "otp": "123456", "fcmToken": "optional", "role": "CUSTOMER" }`
- **Response DTO:** JSON `{ "success": true, "data": { "token": "jwt", "refreshToken": "...", "user": { ... } } }`
- **Permissions:** None
- **Validation:** `verifyOtpSchema` (Phone regex, 6-digit numeric OTP)
- **Business rules:** Validates OTP. If valid, issues JWT and refresh tokens. Authenticates or registers user implicitly.
- **Possible errors:** 400 Validation Error, 401 Unauthorized (Invalid OTP)

#### 3. Refresh Tokens
- **Method:** POST
- **Endpoint:** `/api/v1/auth/refresh`
- **Authentication:** Public
- **Request DTO:** JSON `{ "refreshToken": "token" }`
- **Response DTO:** JSON `{ "success": true, "data": { "token": "new", "refreshToken": "new" } }`
- **Permissions:** None
- **Validation:** `refreshSchema`
- **Business rules:** Generates new session tokens from a valid refresh token.
- **Possible errors:** 401 Unauthorized

#### 4. Logout
- **Method:** POST
- **Endpoint:** `/api/v1/auth/logout`
- **Authentication:** Public
- **Request DTO:** JSON `{ "refreshToken": "token" }`
- **Response DTO:** JSON `{ "success": true, "data": { "message": "Logged out" } }`
- **Permissions:** None
- **Validation:** `logoutSchema`
- **Business rules:** Invalidates the refresh token.
- **Possible errors:** 400 Validation Error

#### 5. Get Current User Profile (Me)
- **Method:** GET
- **Endpoint:** `/api/v1/auth/me`
- **Authentication:** Required (JWT)
- **Permissions:** Any Valid Role
- **Request DTO:** None
- **Response DTO:** JSON `{ "success": true, "data": { ...userProfile } }`
- **Validation:** N/A
- **Business rules:** Fetches the profile of the authenticated user based on the JWT payload.
- **Possible errors:** 401 Unauthorized

---

## 4. Booking Module

#### 1. Get Driver Active Booking
- **Method:** GET
- **Endpoint:** `/api/v1/bookings/driver/active`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** None
- **Response DTO:** JSON active booking object
- **Validation:** N/A
- **Business rules:** Retrieves the currently active booking for the driver.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 404 Not Found (If none active)

#### 2. Create Booking
- **Method:** POST
- **Endpoint:** `/api/v1/bookings`
- **Authentication:** Required (JWT)
- **Permissions:** `CUSTOMER`
- **Request DTO:** JSON (Contains vehicleType, pickupLat/Lng, stops array, goods info, etc.)
- **Response DTO:** JSON `{ "success": true, "data": { ...booking } }` (HTTP 201)
- **Validation:** `createBookingSchema` (Complex validation for stops, goods weight/dimensions, labor integration, pricing estimates)
- **Business rules:** Initializes a new booking request.
- **Possible errors:** 400 Validation Error, 401 Unauthorized

#### 3. List Bookings
- **Method:** GET
- **Endpoint:** `/api/v1/bookings`
- **Authentication:** Required (JWT)
- **Permissions:** `CUSTOMER`, `DRIVER`
- **Request DTO:** Query Params (page, limit, status)
- **Response DTO:** JSON Paginated bookings list
- **Validation:** `listBookingsQuerySchema`
- **Business rules:** Lists bookings related to the logged-in user.
- **Possible errors:** 400 Validation Error

#### 4. Get Booking Details
- **Method:** GET
- **Endpoint:** `/api/v1/bookings/:id`
- **Authentication:** Required (JWT)
- **Permissions:** Any Valid Role
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON booking object
- **Validation:** N/A
- **Business rules:** Retrieves booking details. Ensures user has access to this specific booking.
- **Possible errors:** 404 Not Found, 403 Forbidden

#### 5. Confirm Booking
- **Method:** PATCH
- **Endpoint:** `/api/v1/bookings/:id/confirm`
- **Authentication:** Required (JWT)
- **Permissions:** `CUSTOMER`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON updated booking
- **Validation:** N/A
- **Business rules:** Confirms the booking and transitions to finding a driver.
- **Possible errors:** 404 Not Found, 400 Bad Request (Invalid state transition)

#### 6. Cancel Booking
- **Method:** PATCH
- **Endpoint:** `/api/v1/bookings/:id/cancel`
- **Authentication:** Required (JWT)
- **Permissions:** `CUSTOMER`, `DRIVER`
- **Request DTO:** Path Param `id`, JSON `{ "reason": "reason" }`
- **Response DTO:** JSON cancelled booking
- **Validation:** `cancelBookingSchema`
- **Business rules:** Cancels an active booking, updating state and capturing reason.
- **Possible errors:** 400 Validation/State Error, 404 Not Found

#### 7. Rate Booking
- **Method:** POST
- **Endpoint:** `/api/v1/bookings/:id/rate`
- **Authentication:** Required (JWT)
- **Permissions:** `CUSTOMER`
- **Request DTO:** Path Param `id`, JSON `{ "driverRating": 5, "customerNote": "optional" }`
- **Response DTO:** JSON response
- **Validation:** `rateBookingSchema`
- **Business rules:** Submits a rating for a completed booking driver.
- **Possible errors:** 400 Validation Error

#### 8. Driver: Mark Arriving
- **Method:** PATCH
- **Endpoint:** `/api/v1/bookings/:id/arrive`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON updated booking
- **Validation:** N/A
- **Business rules:** Transitions state to `DRIVER_ARRIVING`.
- **Possible errors:** 400 State Error

#### 9. Driver: Mark Picked Up
- **Method:** PATCH
- **Endpoint:** `/api/v1/bookings/:id/pickup`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON updated booking
- **Validation:** N/A
- **Business rules:** Transitions state to `PICKED_UP`.
- **Possible errors:** 400 State Error

#### 10. Request POD OTP
- **Method:** POST
- **Endpoint:** `/api/v1/bookings/:id/stops/:stopId/request-pod-otp`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Path Params `id`, `stopId`
- **Response DTO:** JSON success message
- **Validation:** N/A
- **Business rules:** Generates and sends OTP for Proof of Delivery at a specific stop.
- **Possible errors:** 404 Not Found, 400 Bad Request

#### 11. Verify POD
- **Method:** POST
- **Endpoint:** `/api/v1/bookings/:id/stops/:stopId/pod`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Path Params `id`, `stopId`, JSON `{ "otp": "123456", "photoUrl": "optional" }`
- **Response DTO:** JSON updated booking
- **Validation:** Custom internal validation
- **Business rules:** Verifies POD OTP and marks stop as delivered.
- **Possible errors:** 400 Bad Request (Invalid OTP)

#### 12. Complete Booking
- **Method:** PATCH
- **Endpoint:** `/api/v1/bookings/:id/complete`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON completed booking
- **Validation:** N/A
- **Business rules:** Transitions booking state to completed if all stops are delivered.
- **Possible errors:** 400 State Error

#### 13. Accept / Decline Booking (Driver)
- **Method:** PATCH
- **Endpoints:** `/api/v1/bookings/:id/accept` and `/api/v1/bookings/:id/decline`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON booking state
- **Validation:** N/A
- **Business rules:** Driver manually accepts or declines a dispatched booking request.
- **Possible errors:** 400 State Error, 404 Not Found

#### 14. Verify Pickup OTP
- **Method:** POST
- **Endpoint:** `/api/v1/bookings/:id/verify-pickup-otp`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Path Param `id`, JSON `{ "otp": "123456" }`
- **Response DTO:** JSON updated booking
- **Validation:** Custom internal validation
- **Business rules:** Driver inputs OTP provided by customer to start the trip.
- **Possible errors:** 400 Bad Request (Invalid OTP)

#### 15. Live Bidding (Enterprise)
- **Methods:** POST `/api/v1/bookings/:id/bids` (Driver), GET `/api/v1/bookings/:id/bids` (Customer/Driver), POST `/api/v1/bookings/:id/bids/accept` (Customer)
- **Permissions:** Respective to endpoints
- **Validation:** `createBidSchema`, `acceptBidSchema`
- **Business rules:** Facilitates live bidding process for specialized enterprise bookings.

#### 16. Get Invoice
- **Method:** GET
- **Endpoint:** `/api/v1/bookings/:id/invoice`
- **Authentication:** Required (JWT)
- **Permissions:** `CUSTOMER`
- **Request DTO:** Path Param `id`
- **Response DTO:** JSON Invoice Breakdown
- **Validation:** N/A
- **Business rules:** Generates and returns financial invoice details with GST breakdowns.
- **Possible errors:** 422 Unprocessable Entity (If fare not calculated), 404 Not Found

---

## 5. Contact Module

#### 1. Create Contact Message
- **Method:** POST
- **Endpoint:** `/api/v1/contact`
- **Authentication:** Public
- **Request DTO:** JSON `{ "name": "John", "phone": "9876543210", "message": "Need help" }`
- **Response DTO:** JSON `{ "success": true, "data": { ...contactMessage } }` (HTTP 201)
- **Permissions:** None
- **Validation:** `createContactMessageSchema`
- **Business rules:** Submits a contact or support message.
- **Possible errors:** 400 Validation Error

#### 2. Get Contact Messages (Admin)
- **Method:** GET
- **Endpoint:** `/api/v1/admin/contact`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** None
- **Response DTO:** JSON array of messages
- **Validation:** N/A
- **Business rules:** Retrieves all submitted contact messages.
- **Possible errors:** 401 Unauthorized

#### 3. Update Contact Message Status (Admin)
- **Method:** PATCH
- **Endpoint:** `/api/v1/admin/contact/:id/status`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path Param `id`, JSON `{ "status": "READ"|"RESOLVED" }`
- **Response DTO:** JSON updated message
- **Validation:** `updateContactMessageStatusSchema`
- **Business rules:** Updates the status of a contact message.
- **Possible errors:** 400 Validation Error, 404 Not Found
