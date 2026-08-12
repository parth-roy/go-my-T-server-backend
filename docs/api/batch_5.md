# API Reference: User, Wallet, Webhooks, Workforce

## Module: User

### 1. Get Profile
- **Method:** GET
- **Endpoint:** `/me`
- **Authentication:** Required
- **Request DTO:** None
- **Response DTO:** Success response with user profile object.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Fetches the profile of the currently authenticated user.
- **Possible errors:** 401 Unauthorized, 500 Internal Server Error.

### 2. Get Stats
- **Method:** GET
- **Endpoint:** `/me/stats`
- **Authentication:** Required
- **Request DTO:** None
- **Response DTO:** Success response with user statistics.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Fetches user statistics.
- **Possible errors:** 401 Unauthorized, 500 Internal Server Error.

### 3. Update Profile
- **Method:** PATCH
- **Endpoint:** `/me`
- **Authentication:** Required
- **Request DTO:** JSON object containing optional fields: `name` (min 2, max 100), `email` (valid email), `profileImageUrl` (valid URL), `language` (en, hi, bn), `fcmToken`, `usageType`, `whatsappOptIn`, `profileComplete`.
- **Response DTO:** Success response with updated user profile.
- **Permissions:** None specific.
- **Validation:** Zod `updateProfileSchema`.
- **Business rules:** Updates the user profile details.
- **Possible errors:** 400 Bad Request (Validation error), 401 Unauthorized, 500 Internal Server Error.

### 4. Update FCM Token
- **Method:** PUT
- **Endpoint:** `/me/fcm-token`
- **Authentication:** Required
- **Request DTO:** JSON object: `{ fcmToken: string }` (min 10 characters).
- **Response DTO:** Success response with message 'FCM token updated'.
- **Permissions:** None specific.
- **Validation:** Zod `updateFcmTokenSchema`.
- **Business rules:** Updates the Firebase Cloud Messaging token for the user.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 500 Internal Server Error.

### 5. Upload Avatar
- **Method:** POST
- **Endpoint:** `/me/avatar`
- **Authentication:** Required
- **Request DTO:** `multipart/form-data` with field `file` containing an image (JPEG, PNG, WEBP), max size 3MB.
- **Response DTO:** Success response with updated user profile and message 'Profile picture updated successfully'.
- **Permissions:** None specific.
- **Validation:** Multer middleware validates file type and size. Controller further checks mimetype.
- **Business rules:** Uploads the image to DigitalOcean Spaces and updates the user's profile image URL.
- **Possible errors:** 400 Bad Request (No image provided), 422 Unprocessable Entity (Invalid file type), 502 Bad Gateway (Upload failed), 401 Unauthorized.

### 6. Get Addresses
- **Method:** GET
- **Endpoint:** `/me/addresses`
- **Authentication:** Required
- **Request DTO:** None
- **Response DTO:** Success response with an array of addresses.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Retrieves all saved addresses for the user.
- **Possible errors:** 401 Unauthorized, 500 Internal Server Error.

### 7. Add Address
- **Method:** POST
- **Endpoint:** `/me/addresses`
- **Authentication:** Required
- **Request DTO:** JSON object: `label`, `addressLine1`, `addressLine2`, `city`, `state`, `pincode` (6 digits), `latitude`, `longitude`, `isDefault`.
- **Response DTO:** 201 Created response with added address object.
- **Permissions:** None specific.
- **Validation:** Zod `addAddressSchema`.
- **Business rules:** Adds a new address to the user's profile.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 500 Internal Server Error.

### 8. Update Address
- **Method:** PATCH
- **Endpoint:** `/me/addresses/:id`
- **Authentication:** Required
- **Request DTO:** Partial fields of the `addAddressSchema`. URL Param: `id` (string).
- **Response DTO:** Success response with updated address object.
- **Permissions:** None specific.
- **Validation:** Zod `updateAddressSchema`.
- **Business rules:** Updates an existing address by its ID.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error.

### 9. Delete Address
- **Method:** DELETE
- **Endpoint:** `/me/addresses/:id`
- **Authentication:** Required
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Deletes a specific address.
- **Possible errors:** 401 Unauthorized, 404 Not Found, 500 Internal Server Error.

### 10. Set Default Address
- **Method:** POST
- **Endpoint:** `/me/addresses/:id/set-default`
- **Authentication:** Required
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response with updated address object.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Sets a specific address as the default address for the user.
- **Possible errors:** 401 Unauthorized, 404 Not Found, 500 Internal Server Error.

### 11. Get GST Details
- **Method:** GET
- **Endpoint:** `/me/gst`
- **Authentication:** Required
- **Request DTO:** None
- **Response DTO:** Success response with an array of GST details.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Retrieves the GST details saved by the user.
- **Possible errors:** 401 Unauthorized, 500 Internal Server Error.

### 12. Add GST Detail
- **Method:** POST
- **Endpoint:** `/me/gst`
- **Authentication:** Required
- **Request DTO:** JSON object: `gstin` (valid GST format), `businessName` (optional).
- **Response DTO:** 201 Created response with the added GST detail.
- **Permissions:** None specific.
- **Validation:** Zod `addGstSchema`.
- **Business rules:** Adds a new GST detail for the user.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 500 Internal Server Error.

### 13. Delete GST Detail
- **Method:** DELETE
- **Endpoint:** `/me/gst/:id`
- **Authentication:** Required
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Removes a GST detail by ID.
- **Possible errors:** 401 Unauthorized, 404 Not Found, 500 Internal Server Error.

### 14. Set Primary GST
- **Method:** POST
- **Endpoint:** `/me/gst/:id/set-primary`
- **Authentication:** Required
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Sets the specified GST entry as the primary one for the user.
- **Possible errors:** 401 Unauthorized, 404 Not Found, 500 Internal Server Error.

### 15. Get Team Members
- **Method:** GET
- **Endpoint:** `/me/team`
- **Authentication:** Required
- **Request DTO:** None
- **Response DTO:** Success response with an array of team members.
- **Permissions:** None specific (Enterprise feature).
- **Validation:** None.
- **Business rules:** Fetches the team members associated with the user's account.
- **Possible errors:** 401 Unauthorized, 500 Internal Server Error.

### 16. Add Team Member
- **Method:** POST
- **Endpoint:** `/me/team`
- **Authentication:** Required
- **Request DTO:** JSON object: `name`, `email` (optional), `phone` (valid Indian number), `role` (ADMIN, MANAGER, VIEWER; default VIEWER).
- **Response DTO:** 201 Created response with added team member.
- **Permissions:** None specific.
- **Validation:** Zod `addTeamMemberSchema`.
- **Business rules:** Adds a new team member to the user's enterprise account.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 500 Internal Server Error.

### 17. Update Team Member
- **Method:** PATCH
- **Endpoint:** `/me/team/:id`
- **Authentication:** Required
- **Request DTO:** Partial fields of `addTeamMemberSchema`. URL Param: `id` (string).
- **Response DTO:** Success response with updated team member.
- **Permissions:** None specific.
- **Validation:** Zod `updateTeamMemberSchema`.
- **Business rules:** Updates details of an existing team member.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error.

### 18. Delete Team Member
- **Method:** DELETE
- **Endpoint:** `/me/team/:id`
- **Authentication:** Required
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Removes a team member by ID.
- **Possible errors:** 401 Unauthorized, 404 Not Found, 500 Internal Server Error.


## Module: Wallet

### 1. Get Wallet Balance
- **Method:** GET
- **Endpoint:** `/`
- **Authentication:** Required
- **Request DTO:** None
- **Response DTO:** Success response with wallet details and balance.
- **Permissions:** None specific.
- **Validation:** None.
- **Business rules:** Retrieves the wallet object for the authenticated user.
- **Possible errors:** 401 Unauthorized, 500 Internal Server Error.

### 2. Get Transaction History
- **Method:** GET
- **Endpoint:** `/transactions`
- **Authentication:** Required
- **Request DTO:** Query Params: `page` (default 1), `limit` (default 20, max 50).
- **Response DTO:** Success response with array of transactions and pagination metadata.
- **Permissions:** None specific.
- **Validation:** Parsed manually in controller.
- **Business rules:** Retrieves the paginated transaction history for the user's wallet.
- **Possible errors:** 401 Unauthorized, 500 Internal Server Error.

### 3. Add Money (Direct Credit)
- **Method:** POST
- **Endpoint:** `/add`
- **Authentication:** Required
- **Request DTO:** JSON object: `amount` (min 1), `referenceId` (optional).
- **Response DTO:** Success response.
- **Permissions:** Typically admin/internal usage.
- **Validation:** Zod `addMoneySchema`.
- **Business rules:** Directly credits the user's wallet (legacy or admin operation).
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 500 Internal Server Error.

### 4. Pay for Booking via Wallet
- **Method:** POST
- **Endpoint:** `/pay`
- **Authentication:** Required
- **Request DTO:** JSON object: `bookingId` (string, required).
- **Response DTO:** Success response with updated booking details.
- **Permissions:** None specific.
- **Validation:** Controller-level check for `bookingId`.
- **Business rules:** Deducts funds from wallet to pay for a booking.
- **Possible errors:** 400 Bad Request (Missing bookingId, Insufficient funds), 401 Unauthorized, 500 Internal Server Error.

### 5. Create Top-Up Order
- **Method:** POST
- **Endpoint:** `/topup/create-order`
- **Authentication:** Required
- **Request DTO:** JSON object: `amount` (positive number, required).
- **Response DTO:** Success response with a Razorpay order object.
- **Permissions:** None specific.
- **Validation:** Controller-level check for `amount`.
- **Business rules:** Creates a Razorpay order to top up the wallet.
- **Possible errors:** 400 Bad Request (Invalid amount), 401 Unauthorized, 500 Internal Server Error.

### 6. Verify Top-Up
- **Method:** POST
- **Endpoint:** `/topup/verify`
- **Authentication:** Required
- **Request DTO:** JSON object: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` (all required).
- **Response DTO:** Success response with verification result and message.
- **Permissions:** None specific.
- **Validation:** Controller-level check for required Razorpay fields.
- **Business rules:** Verifies the Razorpay payment signature and credits the user's wallet.
- **Possible errors:** 400 Bad Request (Missing fields, Invalid signature), 401 Unauthorized, 500 Internal Server Error.


## Module: Webhooks

### 1. Razorpay Payment Webhook
- **Method:** POST
- **Endpoint:** `/razorpay`
- **Authentication:** Public (Validated via HMAC signature).
- **Request DTO:** Raw JSON buffer payload from Razorpay. Headers: `x-razorpay-signature`, `x-razorpay-event-id`.
- **Response DTO:** HTTP 200 OK with `{ ok: true }` or HTTP 400 Bad Request if signature invalid.
- **Permissions:** None.
- **Validation:** Validates HMAC signature using `RAZORPAY_WEBHOOK_SECRET`.
- **Business rules:** Processes incoming webhook events (e.g., `payment.captured`) idempotently. Serves as a fallback to credit wallets if the client disconnected before calling verify API.
- **Possible errors:** 400 Bad Request (Invalid signature), 500 Internal Server Error.

### 2. RazorpayX Payout Webhook
- **Method:** POST
- **Endpoint:** `/razorpayx`
- **Authentication:** Public (Validated via HMAC signature).
- **Request DTO:** Raw JSON buffer payload from RazorpayX. Headers: `x-razorpay-signature`, `x-razorpay-event-id`.
- **Response DTO:** HTTP 200 OK with `{ ok: true }` or HTTP 400 Bad Request if signature invalid.
- **Permissions:** None.
- **Validation:** Validates HMAC signature using `RAZORPAYX_WEBHOOK_SECRET`.
- **Business rules:** Processes payout events (`payout.processed`, `payout.reversed`, `payout.failed`). Updates withdrawal request status and refunds wallet if the payout failed.
- **Possible errors:** 400 Bad Request (Invalid signature), 500 Internal Server Error.


## Module: Workforce

### 1. Send OTP
- **Method:** POST
- **Endpoint:** `/auth/send-otp`
- **Authentication:** Public
- **Request DTO:** JSON object: `phone` (Indian phone number), `fcmToken` (optional).
- **Response DTO:** Success response indicating OTP was sent.
- **Permissions:** None.
- **Validation:** Zod `SendOtpSchema`.
- **Business rules:** Generates and sends an OTP to a worker's phone for login/registration.
- **Possible errors:** 400 Bad Request, 500 Internal Server Error.

### 2. Verify OTP
- **Method:** POST
- **Endpoint:** `/auth/verify-otp`
- **Authentication:** Public
- **Request DTO:** JSON object: `phone` (Indian phone number), `otp` (6 digits), `fcmToken` (optional), `name` (optional).
- **Response DTO:** Success response with authentication token and worker details.
- **Permissions:** None.
- **Validation:** Zod `VerifyOtpSchema`.
- **Business rules:** Verifies the OTP and issues a JWT token. Handles new worker registration if the worker does not exist.
- **Possible errors:** 400 Bad Request (Invalid OTP), 500 Internal Server Error.

### 3. Get Dashboard Stats
- **Method:** GET
- **Endpoint:** `/dashboard/stats`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with dashboard statistics.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Fetches the worker's current statistics for their dashboard.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 4. Get Active Job
- **Method:** GET
- **Endpoint:** `/jobs/active`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with the active job details or null.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Fetches the currently active job for the worker, if any.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 5. Get Available Jobs
- **Method:** GET
- **Endpoint:** `/jobs/available`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** Query Params: `laborType` (LOADING, UNLOADING, BOTH), `sortBy` (distance, payout, recent), `page`, `limit`, `minPayout`, `maxDistance`.
- **Response DTO:** Success response with a list of available jobs.
- **Permissions:** WORKER role.
- **Validation:** Zod `AvailableJobsQuerySchema`.
- **Business rules:** Retrieves a list of available jobs matching the worker's filters and proximity.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 6. Get Nearby Pins
- **Method:** GET
- **Endpoint:** `/jobs/nearby-pins`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** Query Params: `lat` (number), `lng` (number), `radiusKm` (1-50, default 5).
- **Response DTO:** Success response with map pins for nearby jobs.
- **Permissions:** WORKER role.
- **Validation:** Zod `JobRadarQuerySchema`.
- **Business rules:** Returns coordinates/pins of nearby job opportunities for rendering on a map.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 7. Get Job History
- **Method:** GET
- **Endpoint:** `/jobs/history`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** Query Params: `status` (COMPLETED, CANCELLED), `page`, `limit`.
- **Response DTO:** Success response with paginated job assignments and metadata.
- **Permissions:** WORKER role.
- **Validation:** Zod `HistoryQuerySchema`.
- **Business rules:** Fetches the historical job assignments for the worker.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 8. Accept Job
- **Method:** POST
- **Endpoint:** `/jobs/:id/accept`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Assigns the specified job to the worker if available.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 9. Decline Job
- **Method:** POST
- **Endpoint:** `/jobs/:id/decline`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** URL Param: `id` (string). Body: `reason` (optional string, max 200).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** Zod `DeclineJobSchema`.
- **Business rules:** Worker declines a specific job opportunity.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 10. Mark Arrived
- **Method:** POST
- **Endpoint:** `/jobs/:id/arrive`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Marks the worker as arrived at the job site.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 11. Start Job
- **Method:** POST
- **Endpoint:** `/jobs/:id/start`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Initiates the job progress.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 12. Request Completion OTP
- **Method:** POST
- **Endpoint:** `/jobs/:id/request-otp`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Requests a 4-digit OTP to complete the job (sent to customer or site contact).
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 13. Complete Job
- **Method:** POST
- **Endpoint:** `/jobs/:id/complete`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** URL Param: `id` (string). Body: `otp` (optional string, 4 digits).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** Zod `CompleteJobSchema`.
- **Business rules:** Finalizes the job using the provided OTP. Credits payout.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 14. Get Wallet Balance
- **Method:** GET
- **Endpoint:** `/wallet/balance`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with wallet balance.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Retrieves the worker's wallet balance.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 15. Get Wallet Transactions
- **Method:** GET
- **Endpoint:** `/wallet/transactions`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** Query Params: `page` (default 1), `limit` (default 20).
- **Response DTO:** Success response with paginated transactions and metadata.
- **Permissions:** WORKER role.
- **Validation:** Manual parsing in controller.
- **Business rules:** Fetches the transaction history for the worker's wallet.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 16. Get Earnings Chart
- **Method:** GET
- **Endpoint:** `/wallet/earnings-chart`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** Query Params: `period` (day, week, month; default week).
- **Response DTO:** Success response with chart data.
- **Permissions:** WORKER role.
- **Validation:** Zod `EarningsChartQuerySchema`.
- **Business rules:** Fetches data required to render the worker's earnings chart.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 17. Withdraw Wallet
- **Method:** POST
- **Endpoint:** `/wallet/withdraw`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** JSON object: `amount` (100 to 100,000).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** Zod `WithdrawSchema`.
- **Business rules:** Initiates a withdrawal request to transfer wallet funds to the worker's bank account.
- **Possible errors:** 400 Bad Request (Insufficient funds, Invalid amount), 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 18. Get Me (Profile)
- **Method:** GET
- **Endpoint:** `/profile/me`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with worker profile details.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Fetches the detailed profile of the authenticated worker.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 19. Update Status
- **Method:** PATCH
- **Endpoint:** `/profile/status`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** JSON object: `status` (OFFLINE, AVAILABLE).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** Zod `UpdateStatusSchema`.
- **Business rules:** Changes the worker's availability status.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 20. Update Location
- **Method:** PATCH
- **Endpoint:** `/profile/location`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** JSON object: `lat` (number), `lng` (number).
- **Response DTO:** Success response `{ updated: true }`.
- **Permissions:** WORKER role.
- **Validation:** Zod `UpdateLocationSchema`.
- **Business rules:** Updates the worker's real-time geographical location.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 21. Update Bank Details
- **Method:** PATCH
- **Endpoint:** `/profile/bank-details`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** JSON object: `bankAccountNo`, `bankIfsc`, `bankName`, `bankAccountHolderName`.
- **Response DTO:** Success response `{ updated: true }`.
- **Permissions:** WORKER role.
- **Validation:** Zod `UpdateBankDetailsSchema`.
- **Business rules:** Updates the worker's bank account details for payouts.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 22. Update Preferences
- **Method:** PUT
- **Endpoint:** `/profile/preferences`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** JSON object with various optional preferences (maxWeightKg, preferredTypes, vehicleAccess, languages, etc.).
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** Zod `UpdatePreferencesSchema`.
- **Business rules:** Updates worker's job and notification preferences.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 23. Update Settings
- **Method:** PATCH
- **Endpoint:** `/profile/settings`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** JSON object: `language`, `notificationsEnabled`.
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** Zod `UpdateSettingsSchema`.
- **Business rules:** Updates application-level settings for the worker.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 24. Delete Account
- **Method:** DELETE
- **Endpoint:** `/profile/account`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with message 'Account successfully deleted'.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Deletes or deactivates the worker's account.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 25. Upload Documents
- **Method:** POST
- **Endpoint:** `/profile/documents`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** JSON object: URLs for Aadhaar, PAN, Selfie, and optionally Bike, License, RC.
- **Response DTO:** Success response.
- **Permissions:** WORKER role.
- **Validation:** Zod `UploadDocumentsSchema`.
- **Business rules:** Submits worker identity documents for verification.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 26. Get Performance Metrics
- **Method:** GET
- **Endpoint:** `/performance/metrics`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with performance metrics.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Fetches key performance indicators for the worker.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 27. Get Safety Alerts
- **Method:** GET
- **Endpoint:** `/safety/alerts`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with active safety alerts.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Fetches general safety alerts/bulletins.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 28. Trigger SOS
- **Method:** POST
- **Endpoint:** `/safety/sos`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** JSON object: `lat` (number), `lng` (number), `message` (optional).
- **Response DTO:** 201 Created response indicating SOS triggered.
- **Permissions:** WORKER role.
- **Validation:** Zod `SosSchema`.
- **Business rules:** Creates an SOS alert indicating the worker needs immediate assistance.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 29. Get Badges
- **Method:** GET
- **Endpoint:** `/badges`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with badges.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Retrieves achievements/badges earned by the worker.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 30. Get Announcements
- **Method:** GET
- **Endpoint:** `/announcements`
- **Authentication:** Required (UserRole.WORKER)
- **Request DTO:** None
- **Response DTO:** Success response with announcements.
- **Permissions:** WORKER role.
- **Validation:** None.
- **Business rules:** Retrieves system announcements for the workforce.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.


## Module: Workforce Admin
*(Endpoints listed as controller functions, generally mounted under an admin route prefix e.g., `/admin/workforce`)*

### 1. List Workforce
- **Method:** GET
- **Endpoint:** `/ (or /admin/workforce)`
- **Authentication:** Required (Admin)
- **Request DTO:** Query Params: `page` (default 1), `limit` (default 50), `search`, `status` (OFFLINE, AVAILABLE, ON_JOB), `isDocVerified` (boolean).
- **Response DTO:** Success response with paginated array of workers and metadata.
- **Permissions:** Admin role.
- **Validation:** Zod `workforceQuerySchema`.
- **Business rules:** Lists all workers with filtering, pagination, and relation includes (user, documents).
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Server Error.

### 2. Get Worker
- **Method:** GET
- **Endpoint:** `/:id`
- **Authentication:** Required (Admin)
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response with worker object and related data.
- **Permissions:** Admin role.
- **Validation:** None.
- **Business rules:** Fetches full details for a single worker by ID.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 3. Update Worker Bank Details
- **Method:** PUT (or PATCH)
- **Endpoint:** `/:id/bank-details`
- **Authentication:** Required (Admin)
- **Request DTO:** URL Param: `id` (string). Body: `bankAccountNo`, `bankIfsc`, `bankName`, `bankAccountHolderName`, `bankVerified` (boolean, optional).
- **Response DTO:** Success response with updated worker object.
- **Permissions:** Admin role.
- **Validation:** Zod schema inside controller.
- **Business rules:** Allows an admin to update or verify a worker's bank details manually.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 4. Suspend Worker
- **Method:** PATCH
- **Endpoint:** `/:id/suspend`
- **Authentication:** Required (Admin)
- **Request DTO:** URL Param: `id` (string). Body: `isActive` (boolean).
- **Response DTO:** Success response with updated worker.
- **Permissions:** Admin role.
- **Validation:** None.
- **Business rules:** Activates or suspends a worker account.
- **Possible errors:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.

### 5. Revoke Verification
- **Method:** POST
- **Endpoint:** `/:id/revoke-verification`
- **Authentication:** Required (Admin)
- **Request DTO:** URL Param: `id` (string).
- **Response DTO:** Success response with updated worker.
- **Permissions:** Admin role.
- **Validation:** None.
- **Business rules:** Revokes a worker's document verification and marks all documents as PENDING for re-evaluation.
- **Possible errors:** 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.
