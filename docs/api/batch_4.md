# API Reference: Batch 4

This document provides an exhaustive API reference for the following modules: **Rewards**, **Support**, **Training**, **ULIP**, and **Upload**.

---

## 1. Rewards Module

### 1.1 Get Coin Balance
- **Method**: `GET`
- **Endpoint**: `/me`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: None
- **Response DTO**: Object containing the user's current coin balance.
- **Permissions**: Standard authenticated user.
- **Validation**: None.
- **Business rules**: Retrieves the total reward coin balance for the logged-in user.
- **Possible errors**: 
  - `500 Internal Server Error`: If fetching from the database fails.

### 1.2 Get Coin History
- **Method**: `GET`
- **Endpoint**: `/history`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Query Params**:
    - `page` (optional): Page number (defaults to 1, minimum 1).
    - `limit` (optional): Items per page (defaults to 20, max 50).
- **Response DTO**: Array of transaction objects (`transactions`) with pagination `meta`.
- **Permissions**: Standard authenticated user.
- **Validation**: Basic parsing `Math.max(1, parseInt(req.query.page))` in controller.
- **Business rules**: Retrieves the paginated history of reward coin transactions (earnings and deductions) for the user.
- **Possible errors**: 
  - `500 Internal Server Error`

### 1.3 Get Scratch Cards
- **Method**: `GET`
- **Endpoint**: `/scratch-cards`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: None
- **Response DTO**: Array of scratch card objects belonging to the user.
- **Permissions**: Standard authenticated user.
- **Validation**: None.
- **Business rules**: Fetches all available and previously scratched scratch cards for the user.
- **Possible errors**: 
  - `500 Internal Server Error`

### 1.4 Scratch a Card
- **Method**: `POST`
- **Endpoint**: `/scratch-cards/:cardId/scratch`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Path Params**: `cardId` (string, required)
- **Response DTO**: Result of the scratch action (e.g., coins won, updated card status).
- **Permissions**: Standard authenticated user.
- **Validation**: Checks if `cardId` is present in params.
- **Business rules**: Processes the action of revealing/scratching a card. Awards coins/prizes to the user based on the card's predefined value.
- **Possible errors**: 
  - `400 Bad Request`: "cardId is required" or card already scratched.
  - `500 Internal Server Error`

---

## 2. Support Module

### 2.1 Create Support Ticket
- **Method**: `POST`
- **Endpoint**: `/`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (Zod `createTicketSchema`):
    - `subject` (string): Min 5, max 200 characters.
    - `bookingId` (string, optional): Valid UUID.
    - `initialMessage` (string): Min 5 characters.
- **Response DTO**: The created support ticket object.
- **Permissions**: Standard authenticated user.
- **Validation**: Strictly validated against `createTicketSchema`.
- **Business rules**: Opens a new support ticket on behalf of the user, logging their initial issue or inquiry.
- **Possible errors**: 
  - `400/422 Bad Request`: Zod validation errors.
  - `500 Internal Server Error`

### 2.2 Get Tickets
- **Method**: `GET`
- **Endpoint**: `/`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: None
- **Response DTO**: Array of support ticket objects for the user.
- **Permissions**: Standard authenticated user.
- **Validation**: None.
- **Business rules**: Retrieves a list of all support tickets created by the authenticated user.
- **Possible errors**: 
  - `500 Internal Server Error`

### 2.3 Get Ticket Details
- **Method**: `GET`
- **Endpoint**: `/:id`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Path Params**: `id` (string, required)
- **Response DTO**: Detailed support ticket object including thread/messages.
- **Permissions**: Standard authenticated user.
- **Validation**: None explicitly in schema, but ID must belong to the user.
- **Business rules**: Fetches the full details and message history of a specific support ticket.
- **Possible errors**: 
  - `404 Not Found`: If the ticket doesn't exist or belong to the user.
  - `500 Internal Server Error`

### 2.4 Add Message to Ticket
- **Method**: `POST`
- **Endpoint**: `/:id/messages`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Path Params**: `id` (string, required)
  - **Body** (Zod `addMessageSchema`):
    - `content` (string): Min 1 character.
    - `attachmentUrl` (string, optional): Valid URL format.
- **Response DTO**: The created message object.
- **Permissions**: Standard authenticated user.
- **Validation**: Strictly validated against `addMessageSchema`.
- **Business rules**: Appends a new message (reply) to an existing support ticket thread.
- **Possible errors**: 
  - `400/422 Bad Request`: Zod validation errors.
  - `404 Not Found`: If the ticket doesn't exist.
  - `500 Internal Server Error`

---

## 3. Training Module

*(Note: Routes are inferred from Controller methods as router files are not explicitly available)*

### 3.1 Admin: Get All Courses
- **Method**: `GET`
- **Endpoint**: Admin specific route (e.g., `/admin/courses`)
- **Authentication**: Required (Admin context assumed)
- **Request DTO**: None
- **Response DTO**: `{ success: true, data: [courses...] }`
- **Permissions**: Admin only.
- **Validation**: None.
- **Business rules**: Retrieves a comprehensive list of all training courses for administration.
- **Possible errors**: 
  - `500 Internal Server Error`: Returns `{ success: false, message: error.message }`

### 3.2 Admin: Get Stats
- **Method**: `GET`
- **Endpoint**: Admin specific route (e.g., `/admin/stats`)
- **Authentication**: Required
- **Request DTO**: None
- **Response DTO**: `{ success: true, data: stats_object }`
- **Permissions**: Admin only.
- **Validation**: None.
- **Business rules**: Retrieves overarching statistics for training (e.g., completion rates, total modules).
- **Possible errors**: 
  - `500 Internal Server Error`

### 3.3 Admin: Create Course
- **Method**: `POST`
- **Endpoint**: Admin specific route (e.g., `/admin/courses`)
- **Authentication**: Required
- **Request DTO**: 
  - **Body**: `title`, `description`, `modulesCount`, `durationMinutes`, `level` (enum `CourseLevel`), `icon`, `iconColor`, `iconBgColor`.
- **Response DTO**: `{ success: true, data: course_object }`
- **Permissions**: Admin only.
- **Validation**: Implicit payload casting (e.g., `Number(data.modulesCount)`).
- **Business rules**: Adds a new training course to the platform.
- **Possible errors**: 
  - `500 Internal Server Error`

### 3.4 Admin: Update Course
- **Method**: `PUT/PATCH`
- **Endpoint**: Admin specific route (e.g., `/admin/courses/:id`)
- **Authentication**: Required
- **Request DTO**: 
  - **Path Params**: `id` (string)
  - **Body**: Partial course data.
- **Response DTO**: `{ success: true, data: updated_course_object }`
- **Permissions**: Admin only.
- **Validation**: None explicit.
- **Business rules**: Updates metadata or contents of an existing course.
- **Possible errors**: 
  - `500 Internal Server Error`

### 3.5 Admin: Delete Course
- **Method**: `DELETE`
- **Endpoint**: Admin specific route (e.g., `/admin/courses/:id`)
- **Authentication**: Required
- **Request DTO**: 
  - **Path Params**: `id` (string)
- **Response DTO**: `{ success: true, message: "Course deleted successfully" }`
- **Permissions**: Admin only.
- **Validation**: None explicit.
- **Business rules**: Removes a course from the platform.
- **Possible errors**: 
  - `500 Internal Server Error`

### 3.6 Workforce: Get Assigned Courses
- **Method**: `GET`
- **Endpoint**: Workforce specific route (e.g., `/workforce/courses`)
- **Authentication**: Required (Workforce/Worker token)
- **Request DTO**: None
- **Response DTO**: `{ success: true, data: [courses...] }`
- **Permissions**: Workforce/Worker role.
- **Validation**: Checks for `workerId` in token.
- **Business rules**: Retrieves all training courses available/assigned to the specific worker.
- **Possible errors**: 
  - `403 Forbidden`: "Worker ID not found in token"
  - `500 Internal Server Error`

### 3.7 Workforce: Update Progress
- **Method**: `POST/PUT`
- **Endpoint**: Workforce specific route (e.g., `/workforce/courses/:id/progress`)
- **Authentication**: Required
- **Request DTO**: 
  - **Path Params**: `id` (course/module string ID)
- **Response DTO**: `{ success: true, data: progress_object }`
- **Permissions**: Workforce/Worker role.
- **Validation**: Checks for `workerId` in token.
- **Business rules**: Updates the worker's progression status on a specific course/module.
- **Possible errors**: 
  - `403 Forbidden`
  - `500 Internal Server Error`

---

## 4. ULIP Module (Document & KYC Verifications)

### 4.1 Verify Driving License (SARATHI)
- **Method**: `POST`
- **Endpoint**: `/verify-dl`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (`verifyDlSchema`):
    - `dlNumber` (string): Min 5 characters.
    - `dob` (string): YYYY-MM-DD format.
    - `driverName` (string, optional).
    - `permit` (string, optional).
- **Response DTO**: `{ success: true, message: "...", data: { status: "PENDING" } }`
- **Permissions**: Requires Driver profile.
- **Validation**: Zod schema validation.
- **Business rules**: Asynchronous background process via BullMQ. Updates Driver DL state to `PENDING` and returns HTTP `202 Accepted` immediately. Result is pushed later via Socket.io.
- **Possible errors**: 
  - `404 Not Found`: Driver profile not found.
  - `400 Bad Request`: Validation errors.

### 4.2 Verify Vehicle Registration (VAHAN)
- **Method**: `POST`
- **Endpoint**: `/verify-rc`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (`verifyRcSchema`):
    - `vehicleId` (string, valid UUID).
    - `ownerName`, `chassisNumber`, `engineNumber` (strings, optional).
- **Response DTO**: `{ success: true, message: "...", data: { status: "PENDING" } }`
- **Permissions**: Requires Driver profile and ownership of `vehicleId`.
- **Validation**: Zod schema validation.
- **Business rules**: Async background check against VAHAN. Sets RC state to `PENDING`, returns `202 Accepted`.
- **Possible errors**: 
  - `404 Not Found`: Driver or Vehicle not found.

### 4.3 Verify FASTAG
- **Method**: `POST`
- **Endpoint**: `/verify-fastag`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (`verifyFastagSchema`):
    - `vehicleId` (UUID, optional) OR `vehicleNumber` (string, optional). At least one is required.
- **Response DTO**: `{ success: true, message: "...", data: { status: "PENDING" } }`
- **Permissions**: Requires Driver profile.
- **Validation**: Zod schema validation.
- **Business rules**: Async FASTAG verification queued via BullMQ. Returns `202 Accepted`.
- **Possible errors**: 
  - `404 Not Found`: Driver or Vehicle not found.
  - `400 Bad Request`: If neither ID nor number is provided.

### 4.4 Verify E-CHALLAN
- **Method**: `POST`
- **Endpoint**: `/verify-echallan`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (`verifyEchallanSchema`): Same as FASTAG.
- **Response DTO**: `{ success: true, message: "...", data: { status: "PENDING" } }`
- **Permissions**: Requires Driver profile.
- **Validation**: Zod schema validation.
- **Business rules**: Async E-CHALLAN check queued via BullMQ. Returns `202 Accepted`.
- **Possible errors**: 
  - `404 Not Found`, `400 Bad Request`.

### 4.5 Digilocker: Initiate Session
- **Method**: `POST`
- **Endpoint**: `/digilocker/init`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (`digilockerInitSchema`):
    - `uid`: 12-digit Aadhaar.
    - `name`: Min 2 chars.
    - `dob`: 8-digit DDMMYYYY.
    - `gender`: 'M', 'F', or 'T'.
    - `mobile`: 10-digit number.
    - `consent`: Literal 'Y'.
- **Response DTO**: `{ requiresOtp: boolean, tokenReady: boolean, message: string }`
- **Permissions**: Requires Worker profile.
- **Validation**: Strict Zod length and regex checking.
- **Business rules**: Step 1 of synchronous KYC flow. Submits demographic data. If user is new, returns `requiresOtp = true`. If returning, automatically completes step 3 and returns `tokenReady = true`.
- **Possible errors**: 
  - `404 Not Found`: Worker profile missing.
  - `400 Bad Request`: Upstream Digilocker errors or bad payload.

### 4.6 Digilocker: Verify OTP
- **Method**: `POST`
- **Endpoint**: `/digilocker/verify-otp`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (`digilockerVerifyOtpSchema`):
    - `otp`: Exactly 6 digits.
- **Response DTO**: `{ tokenReady: true, message: string }`
- **Permissions**: Requires Worker profile currently in OTP phase.
- **Validation**: 6-digit regex validation.
- **Business rules**: Step 2 of KYC. Validates OTP and automatically exchanges it for an access token (Step 3). Clears PKCE challenges from DB on success.
- **Possible errors**: 
  - `400 Bad Request`: Digilocker session expired or invalid OTP.

### 4.7 Digilocker: Fetch Documents
- **Method**: `POST`
- **Endpoint**: `/digilocker/fetch-docs`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (`digilockerFetchDocsSchema`):
    - `panno`: 10-character standard PAN format.
    - `panFullName`: Min 2 chars.
    - `consent`: Literal 'Y'.
- **Response DTO**: `{ aadhaarVerified, panVerified, aadhaarName, maskedUid, message, ... }`
- **Permissions**: Requires Worker profile with an active Digilocker token.
- **Validation**: Regex validation for standard PAN format.
- **Business rules**: Uses the generated access token to download PAN (Step 4) and Aadhaar (Step 5). Stores base64 representations as Data URIs in the Worker record. Sets `isDocVerified = true`.
- **Possible errors**: 
  - `400 Bad Request`: Token not found or expired.
  - `404 Not Found`: Worker profile missing.

### 4.8 Digilocker: Manual Upload Fallback
- **Method**: `POST`
- **Endpoint**: `/digilocker/manual-upload`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Body** (`manualKycUploadSchema`):
    - `aadhaarUrl` (string, optional URL).
    - `panUrl` (string, optional URL).
    - *At least one is required.*
- **Response DTO**: `{ status: "MANUAL_REVIEW", message: string }`
- **Permissions**: Requires Worker profile.
- **Validation**: URL format validation.
- **Business rules**: Fallback flow when DigiLocker API fails. Uploads scanned docs and flags them as `MANUAL_REVIEW` requiring admin approval.
- **Possible errors**: 
  - `404 Not Found`.

### 4.9 Digilocker: Status Check
- **Method**: `GET`
- **Endpoint**: `/digilocker/status`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: None
- **Response DTO**: Object containing `isDocVerified` boolean, and sub-objects for `aadhaar` and `pan` statuses.
- **Permissions**: Requires Worker profile.
- **Validation**: None.
- **Business rules**: Returns current KYC status so the client app can display correct UI state.
- **Possible errors**: 
  - `404 Not Found`: Worker profile missing.

### 4.10 Digilocker: Get Document
- **Method**: `GET`
- **Endpoint**: `/digilocker/document/:type`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Path Params**: `type` (Must be 'aadhaar' or 'pan')
- **Response DTO**: `{ type, status, dataUri }`
- **Permissions**: Requires Worker profile.
- **Validation**: Type param strictly limited to 'aadhaar' or 'pan'.
- **Business rules**: Returns the base64 data URI for the requested document type.
- **Possible errors**: 
  - `400 Bad Request`: Invalid type.
  - `404 Not Found`: Document not yet fetched.

### 4.11 Legacy Digilocker Verify (Deprecated)
- **Method**: `POST`
- **Endpoint**: `/verify-digilocker`
- **Status**: Returns `410 Gone`. "This endpoint is deprecated."

---

## 5. Upload Module

### 5.1 Upload Single File
- **Method**: `POST`
- **Endpoint**: `/single`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Headers**: `Content-Type: multipart/form-data`
  - **Body**: 
    - `file`: The file payload (max 10MB).
    - `folder` (optional string): 'profile', 'bookings', 'documents', 'banners', 'uploads'.
- **Response DTO**: `{ success: true, data: { url, key }, message: string }`
- **Permissions**: Standard authenticated user.
- **Validation**: 
  - Handled via `multer` for memory buffering & size limits.
  - Fallback logic sets unapproved folder strings to `uploads`.
- **Business rules**: Takes memory buffer and streams it to S3 / DigitalOcean Spaces. 
- **Possible errors**: 
  - `400 Bad Request`: No file provided.
  - `422 Unprocessable Entity`: Upload failed at S3 layer.

### 5.2 Upload Multiple Files
- **Method**: `POST`
- **Endpoint**: `/multiple`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Headers**: `Content-Type: multipart/form-data`
  - **Body**: 
    - `files[]`: Up to 10 files (max 10MB each).
    - `folder` (optional string).
- **Response DTO**: `{ success: boolean, data: { files: [{url, key}], totalUploaded, failedCount }, message: string }`
- **Permissions**: Standard authenticated user.
- **Validation**: Array size max 10 via multer.
- **Business rules**: Batches uploads to S3/DO Spaces. Tracks partial failures.
- **Possible errors**: 
  - `400 Bad Request`: No files provided.

### 5.3 Delete File
- **Method**: `DELETE`
- **Endpoint**: `/:key`
- **Authentication**: Required (Valid JWT)
- **Request DTO**: 
  - **Path Params**: `key` (URL-encoded S3 key string, e.g., `profile%2Fuuid-photo.jpg`).
- **Response DTO**: `{ success: true, message: "File deleted successfully" }`
- **Permissions**: Standard authenticated user. *(Note: Missing explicit ownership validation on deletion in controller snippet)*
- **Validation**: URL-decoding performed on the backend.
- **Business rules**: Removes the specified key from the S3 bucket.
- **Possible errors**: 
  - `400 Bad Request`: Key is missing.
  - `422 Unprocessable Entity`: S3 deletion failed.
