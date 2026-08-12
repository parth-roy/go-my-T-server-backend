# API Reference - Batch 3

This document covers the detailed API reference for the following modules:
1. Maps
2. Marketplace
3. Notifications (In-App & Server push)
4. Payment
5. Pricing

---

## 1. Maps Module

### 1.1 Autocomplete
- **Method**: GET
- **Endpoint**: `/autocomplete`
- **Authentication**: Public
- **Request DTO**: 
  - **Query parameters**: 
    - `input` (string, required): The search text.
    - `sessionToken` (string, optional): Token to group user searches for billing purposes.
- **Response DTO**: `{ "success": true, "data": [ ...predictions ] }`
- **Permissions**: None
- **Validation**: Inline check for `input`.
- **Business rules**: Retrieves place predictions based on the input text using a mapping service.
- **Possible errors**: 
  - `400 Bad Request`: If `input` query is missing.

### 1.2 Place Details
- **Method**: GET
- **Endpoint**: `/place-details`
- **Authentication**: Public
- **Request DTO**: 
  - **Query parameters**: 
    - `placeId` (string, required): The unique place identifier.
    - `sessionToken` (string, optional).
- **Response DTO**: `{ "success": true, "data": { /* details */ } }`
- **Permissions**: None
- **Validation**: Inline check for `placeId`.
- **Business rules**: Retrieves detailed information for a specific place.
- **Possible errors**: 
  - `400 Bad Request`: If `placeId` is missing.

### 1.3 Reverse Geocode
- **Method**: GET
- **Endpoint**: `/reverse-geocode`
- **Authentication**: Public
- **Request DTO**: 
  - **Query parameters**: 
    - `lat` (string/number, required): Latitude.
    - `lng` (string/number, required): Longitude.
- **Response DTO**: `{ "success": true, "data": { /* result */ } }`
- **Permissions**: None
- **Validation**: Inline check ensuring both `lat` and `lng` are present.
- **Business rules**: Converts geographic coordinates into a human-readable address.
- **Possible errors**: 
  - `400 Bad Request`: If `lat` or `lng` is missing.

### 1.4 Geocode
- **Method**: GET
- **Endpoint**: `/geocode`
- **Authentication**: Public
- **Request DTO**: 
  - **Query parameters**: 
    - `address` (string, required): The address to geocode.
- **Response DTO**: `{ "success": true, "data": { /* details */ } }`
- **Permissions**: None
- **Validation**: Inline check for `address`.
- **Business rules**: Fetches coordinates and place details for a given text address by looking up the first autocomplete result and resolving its `placeId`.
- **Possible errors**: 
  - `400 Bad Request`: If `address` query is required.
  - `404 Not Found`: If no results are found for the address.

### 1.5 Distance Matrix
- **Method**: GET
- **Endpoint**: `/distance-matrix`
- **Authentication**: Public
- **Request DTO**: 
  - **Query parameters**: 
    - `originLat` (number), `originLng` (number), `destLat` (number), `destLng` (number) - all required.
- **Response DTO**: `{ "success": true, "data": { /* distance and duration */ } }`
- **Permissions**: None
- **Validation**: Inline checking for all 4 coordinate parameters.
- **Business rules**: Calculates the routing distance and estimated travel time between an origin and destination.
- **Possible errors**: 
  - `400 Bad Request`: If any coordinate is missing.

### 1.6 Get Recent Searches
- **Method**: GET
- **Endpoint**: `/recent-searches`
- **Authentication**: Based on `x-user-id` header (optional).
- **Request DTO**: 
  - **Headers**: `x-user-id` (optional).
  - **Query parameters**: `limit` (integer, default 10).
- **Response DTO**: `{ "success": true, "data": [ ...searches ] }`
- **Permissions**: None
- **Validation**: Safely parses `limit` or falls back to default.
- **Business rules**: Retrieves search history for the user.
- **Possible errors**: 
  - `500 Internal Server Error`

### 1.7 Add Recent Search
- **Method**: POST
- **Endpoint**: `/recent-searches`
- **Authentication**: Based on `x-user-id` header (optional).
- **Request DTO**: 
  - **Body parameters**: 
    - `placeId` (string, required)
    - `address` (string, required)
    - `latitude` (number, required)
    - `longitude` (number, required)
    - `searchType` (string, optional)
- **Response DTO**: `{ "success": true, "data": { /* search record */ } }`
- **Permissions**: None
- **Validation**: Inline check for required body fields.
- **Business rules**: Validates the place by fetching details, then logs the search entry for the user.
- **Possible errors**: 
  - `400 Bad Request`: Missing fields.
  - `201 Created`: On success.

### 1.8 Delete Recent Search
- **Method**: DELETE
- **Endpoint**: `/recent-searches/:id`
- **Authentication**: Based on `x-user-id` header (optional).
- **Request DTO**: 
  - **Path parameters**: `id` (string, required).
- **Response DTO**: `{ "success": true, "message": "Recent search deleted" }`
- **Permissions**: None
- **Validation**: Inline check for `id`.
- **Business rules**: Deletes a specific recent search history item.
- **Possible errors**: 
  - `400 Bad Request`: Missing ID.

### 1.9 Clear Recent Searches
- **Method**: DELETE
- **Endpoint**: `/recent-searches/clear`
- **Authentication**: Based on `x-user-id` header (optional).
- **Request DTO**: None.
- **Response DTO**: `{ "success": true, "message": "All recent searches cleared" }`
- **Permissions**: None
- **Validation**: None
- **Business rules**: Clears all recent searches for the user.
- **Possible errors**: 
  - `500 Internal Server Error`

---

## 2. Marketplace Module

*Note: All endpoints require global authentication (`authenticate` middleware).*

### 2.1 List Opportunities
- **Method**: GET
- **Endpoint**: `/opportunities`
- **Authentication**: Required
- **Request DTO**: 
  - **Query parameters** (validated via `opportunitiesQuerySchema`): 
    - `page` (number, default 1)
    - `limit` (number, default 20, max 50)
- **Response DTO**: `{ "success": true, "data": [ ... ], "message": "Opportunities fetched", "meta": { ... } }`
- **Permissions**: `DRIVER`, `FLEET_OWNER`
- **Validation**: Zod schema (`opportunitiesQuerySchema`).
- **Business rules**: Lists available booking opportunities/requests for drivers and fleet owners.
- **Possible errors**: 
  - `401 Unauthorized`
  - `403 Forbidden`: Role mismatch.

### 2.2 Get Opportunity
- **Method**: GET
- **Endpoint**: `/opportunities/:bookingId`
- **Authentication**: Required
- **Request DTO**: 
  - **Path parameters**: `bookingId` (string).
- **Response DTO**: `{ "success": true, "data": { ... }, "message": "Opportunity fetched" }`
- **Permissions**: `DRIVER`, `FLEET_OWNER`
- **Validation**: None explicit.
- **Business rules**: Gets full details of a specific opportunity.
- **Possible errors**: 
  - `403 Forbidden`
  - `404 Not Found`

### 2.3 List Booking Bids
- **Method**: GET
- **Endpoint**: `/bookings/:bookingId/bids`
- **Authentication**: Required
- **Request DTO**: 
  - **Path parameters**: `bookingId`.
- **Response DTO**: `{ "success": true, "data": [ ... ], "message": "Private bids fetched" }`
- **Permissions**: `CUSTOMER`, `DRIVER`, `FLEET_OWNER`
- **Validation**: None explicit.
- **Business rules**: Retrieves all submitted private bids for a specific booking.
- **Possible errors**: `403 Forbidden`

### 2.4 Submit Bid
- **Method**: POST
- **Endpoint**: `/bookings/:bookingId/bids`
- **Authentication**: Required
- **Request DTO**: 
  - **Path parameters**: `bookingId`.
  - **Body parameters** (via `submitBidSchema`):
    - `amount` (number, max 10,000,000)
    - `pickupCommitmentAt` (datetime string)
    - `transitMinutes` (number, 15 to 43200)
    - `validForMinutes` (number, 1 to 60, default 10)
    - `vehicleId` (uuid, optional)
    - `inclusions`, `exclusions` (arrays of strings)
    - `note` (string, max 500)
    - `idempotencyKey` (uuid)
- **Response DTO**: `{ "success": true, "data": { ... }, "message": "Private bid submitted" }`
- **Permissions**: `DRIVER`, `FLEET_OWNER`
- **Validation**: Zod schema (`submitBidSchema`), rate-limited.
- **Business rules**: Submits a private bid proposition for the booking.
- **Possible errors**: 
  - `429 Too Many Requests`
  - `400 Bad Request`

### 2.5 Get Bid Thread
- **Method**: GET
- **Endpoint**: `/bids/:bidId`
- **Authentication**: Required
- **Request DTO**: 
  - **Path parameters**: `bidId`.
- **Response DTO**: `{ "success": true, "data": { ... }, "message": "Bid negotiation fetched" }`
- **Permissions**: `CUSTOMER`, `DRIVER`, `FLEET_OWNER`
- **Validation**: None.
- **Business rules**: Fetches the negotiation thread (messages, revisions) of a specific bid.
- **Possible errors**: `403 Forbidden`, `404 Not Found`

### 2.6 Create Revision
- **Method**: POST
- **Endpoint**: `/bids/:bidId/revisions`
- **Authentication**: Required
- **Request DTO**: 
  - **Path parameters**: `bidId`.
  - **Body parameters** (via `createRevisionSchema`): Partial commercial terms along with `idempotencyKey` and `expectedLatestRevisionId`. Must change at least one commercial term.
- **Response DTO**: `{ "success": true, "data": { ... }, "message": "Official offer revision created" }`
- **Permissions**: `CUSTOMER`, `DRIVER`, `FLEET_OWNER`
- **Validation**: Zod schema (`createRevisionSchema`), rate-limited.
- **Business rules**: Creates a counter-offer or revision to the bid terms.
- **Possible errors**: 
  - `429 Too Many Requests`
  - `400 Bad Request`

### 2.7 Send Message
- **Method**: POST
- **Endpoint**: `/bids/:bidId/messages`
- **Authentication**: Required
- **Request DTO**: 
  - **Path parameters**: `bidId`.
  - **Body parameters** (via `sendBidMessageSchema`):
    - `clientMessageId` (uuid)
    - `message` (string, max 1000)
- **Response DTO**: `{ "success": true, "data": { ... }, "message": "Message sent" }`
- **Permissions**: `CUSTOMER`, `DRIVER`, `FLEET_OWNER`
- **Validation**: Zod schema (`sendBidMessageSchema`), rate-limited.
- **Business rules**: Posts a message in the bid negotiation thread.
- **Possible errors**: `429 Too Many Requests`, `400 Bad Request`.

### 2.8 Withdraw Bid
- **Method**: POST
- **Endpoint**: `/bids/:bidId/withdraw`
- **Authentication**: Required
- **Request DTO**: `bidId` path parameter.
- **Response DTO**: `{ "success": true, "message": "Bid withdrawn" }`
- **Permissions**: `DRIVER`, `FLEET_OWNER`
- **Validation**: Rate-limited.
- **Business rules**: Withdraws a previously submitted bid.
- **Possible errors**: `403 Forbidden`

### 2.9 Reject Bid
- **Method**: POST
- **Endpoint**: `/bids/:bidId/reject`
- **Authentication**: Required
- **Request DTO**: `bidId` path parameter.
- **Response DTO**: `{ "success": true, "message": "Bid rejected" }`
- **Permissions**: `CUSTOMER`
- **Validation**: Rate-limited.
- **Business rules**: Rejects a driver's bid entirely.
- **Possible errors**: `403 Forbidden`

### 2.10 Accept Revision
- **Method**: POST
- **Endpoint**: `/bids/:bidId/revisions/:revisionId/accept`
- **Authentication**: Required
- **Request DTO**: Path parameters `bidId`, `revisionId`.
- **Response DTO**: `{ "success": true, "message": "Offer selected; payment is required to confirm the award" }`
- **Permissions**: `CUSTOMER`
- **Validation**: Rate-limited.
- **Business rules**: Accepts a specific version of a bid. Pending payment execution.
- **Possible errors**: `403 Forbidden`

### 2.11 Get Award
- **Method**: GET
- **Endpoint**: `/bookings/:bookingId/award`
- **Authentication**: Required
- **Request DTO**: Path parameter `bookingId`.
- **Response DTO**: `{ "success": true, "data": { ... }, "message": "Bid award fetched" }`
- **Permissions**: `CUSTOMER`, `DRIVER`, `FLEET_OWNER`
- **Validation**: None.
- **Business rules**: Retrieves the bid award information for the specified booking.
- **Possible errors**: `404 Not Found`

### 2.12 Secure Cash Award
- **Method**: POST
- **Endpoint**: `/bookings/:bookingId/award/secure-cash`
- **Authentication**: Required
- **Request DTO**: Path parameter `bookingId`.
- **Response DTO**: `{ "success": true, "message": "Cash payment condition secured; award confirmed" }`
- **Permissions**: `CUSTOMER`
- **Validation**: Rate-limited.
- **Business rules**: Confirms the award for a cash-paying booking.
- **Possible errors**: `403 Forbidden`

---

## 3. Notifications Module

### 3.1 Send Push (Admin)
- **Method**: POST
- **Endpoint**: `/send`
- **Authentication**: None (Internal server-to-server)
- **Request DTO**:
  - **Body parameters**: `fcmToken`, `title`, `body` (required strings). `data` (optional object).
- **Response DTO**: `{ "success": true, "data": { "messageId": ... }, "message": "Notification sent successfully" }`
- **Permissions**: None
- **Validation**: Inline check for missing body fields.
- **Business rules**: Sends a push notification to a single FCM token.
- **Possible errors**: `400 Bad Request`

### 3.2 Send Multicast Push (Admin)
- **Method**: POST
- **Endpoint**: `/send-multicast`
- **Authentication**: None
- **Request DTO**:
  - **Body parameters**: `fcmTokens` (array of strings), `title`, `body` (required strings). `data` (optional object).
- **Response DTO**: `{ "success": true, "data": { ... }, "message": "Multicast notification sent" }`
- **Permissions**: None
- **Validation**: Inline check for missing body fields and array format.
- **Business rules**: Sends push notifications to multiple FCM tokens.
- **Possible errors**: `400 Bad Request`

### 3.3 Subscribe to Topic (Admin)
- **Method**: POST
- **Endpoint**: `/subscribe`
- **Authentication**: None
- **Request DTO**:
  - **Body parameters**: `fcmToken` (string), `topic` (string).
- **Response DTO**: `{ "success": true, "data": null, "message": "Subscribed to {topic}" }`
- **Permissions**: None
- **Validation**: Inline check for required fields.
- **Business rules**: Subscribes a specific FCM device to a push topic.
- **Possible errors**: `400 Bad Request`

### 3.4 List In-App Notifications
- **Method**: GET
- **Endpoint**: `/me`
- **Authentication**: Required
- **Request DTO**: 
  - **Query parameters**: `page` (number), `limit` (number, max 50).
- **Response DTO**: `{ "success": true, "data": [ ... ], "meta": { "unreadCount": ... } }`
- **Permissions**: None (any authenticated user).
- **Validation**: Inline fallback bounds checking.
- **Business rules**: Lists persistent in-app notifications for the user.
- **Possible errors**: `401 Unauthorized`

### 3.5 Mark All Read
- **Method**: PATCH
- **Endpoint**: `/read-all`
- **Authentication**: Required
- **Request DTO**: None.
- **Response DTO**: `{ "success": true, "message": "{updatedCount} notifications marked as read" }`
- **Permissions**: None
- **Validation**: None
- **Business rules**: Marks all unread notifications of the user as read.
- **Possible errors**: `500 Internal Server Error`

### 3.6 Mark One Read
- **Method**: PATCH
- **Endpoint**: `/:id/read`
- **Authentication**: Required
- **Request DTO**: Path parameter `id`.
- **Response DTO**: `{ "success": true, "data": { ... }, "message": "Notification marked as read" }`
- **Permissions**: None
- **Validation**: Inline ID check.
- **Business rules**: Marks a specific notification as read.
- **Possible errors**: `400 Bad Request`

---

## 4. Payment Module

### 4.1 Webhook
- **Method**: POST
- **Endpoint**: `/webhook`
- **Authentication**: Uses `x-razorpay-signature` HMAC verification.
- **Request DTO**: Raw request body.
- **Response DTO**: `{ "status": "ok" }`
- **Permissions**: None
- **Validation**: HMAC signature matching based on secret.
- **Business rules**: Listens for Razorpay webhook events (`payment.captured`, `payment.failed`). Idempotent implementation guarantees safety against retry storms. Secures active bids deadlines on failed events.
- **Possible errors**: 
  - `400 Bad Request` (Invalid signature). 
  - Responds `200 OK` on internal processing errors to prevent Razorpay spamming retries.

### 4.2 Create Order
- **Method**: POST
- **Endpoint**: `/create-order`
- **Authentication**: Required
- **Request DTO**:
  - **Body parameters**: `bookingId` (string).
- **Response DTO**: `{ "success": true, "data": { "orderId", "amount", "currency" } }`
- **Permissions**: User must be the owner (Customer) of the booking, or an `ADMIN`.
- **Validation**: Inline requirement validation.
- **Business rules**: Creates a Razorpay order representing the booking's fare. Performs strict validations against the bid deadlines and prevents creating an order on already refunded/paid bookings. Idempotent: returns an existing created order if one is present instead of creating duplicates. Updates the `booking.razorpayOrderId` to prevent replay attacks.
- **Possible errors**: 
  - `400 Bad Request`
  - `403 Forbidden`
  - `404 Not Found`
  - `409 Conflict` (Already paid/refunded/no bid/state conflict).

### 4.3 Verify Payment
- **Method**: POST
- **Endpoint**: `/verify`
- **Authentication**: Required
- **Request DTO**:
  - **Body parameters**: `bookingId`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
- **Response DTO**: `{ "success": true, "data": { ...updatedBooking }, "message": "Payment verified successfully" }`
- **Permissions**: Customer or `ADMIN`.
- **Validation**: HMAC check. Replay-attack order check (`razorpayOrderId` cross-verification).
- **Business rules**: Validates a frontend payment completion callback. Secures the captured payment by locking it to the booking. Triggers award completion and delivery state progressions (completeBooking callback).
- **Possible errors**: 
  - `400 Bad Request` (Invalid signature, order mismatch).
  - `409 Conflict` (Payment not captured yet).

### 4.4 Mock Payment Success (Development Only)
- **Method**: POST
- **Endpoint**: `/mock-success`
- **Authentication**: Required
- **Request DTO**: 
  - **Body parameters**: `bookingId`.
- **Response DTO**: `{ "success": true, "message": "Payment successful (MOCKED)" }`
- **Permissions**: Customer or `ADMIN`. Environment strictly `NODE_ENV=development`.
- **Validation**: Inline.
- **Business rules**: Mocks a successful payment bypass.
- **Possible errors**: `403 Forbidden` (if not in development environment).

---

## 5. Pricing Module

### 5.1 Get Vehicles
- **Method**: GET
- **Endpoint**: `/vehicles`
- **Authentication**: Public
- **Request DTO**: None.
- **Response DTO**: `{ "success": true, "data": [ ...vehicles ], "message": "Vehicle types fetched" }`
- **Permissions**: None
- **Validation**: None
- **Business rules**: Retrieves available vehicle configurations for pricing estimates.
- **Possible errors**: `500 Internal Server Error`

### 5.2 Estimate Fare
- **Method**: POST
- **Endpoint**: `/estimate`
- **Authentication**: Public
- **Request DTO**: 
  - **Body parameters**: 
    - `pickupLat`, `pickupLng`, `dropLat`, `dropLng`, `vehicleType` (all required)
    - `hasLoadingService`, `insuranceOpted` (boolean)
    - `helperCount` (number)
    - `stops` (array of coordinates).
- **Response DTO**: `{ "success": true, "data": { ...estimateDetails }, "message": "Fare estimated" }`
- **Permissions**: None
- **Validation**: Inline requirement for coordinates and vehicleType.
- **Business rules**: Evaluates standard fare estimate based on distance, rules, loading service, helpers, and base/per-km multipliers.
- **Possible errors**: `400 Bad Request`

### 5.3 Estimate All
- **Method**: POST
- **Endpoint**: `/estimate-all`
- **Authentication**: Public
- **Request DTO**:
  - **Body parameters**: `pickupLat`, `pickupLng`, `dropLat`, `dropLng` (required).
- **Response DTO**: `{ "success": true, "data": { ...estimates }, "message": "Bulk fare estimates calculated" }`
- **Permissions**: None
- **Validation**: Inline coordinate checks.
- **Business rules**: Returns fare estimates for ALL available vehicle types for a given set of coordinates at once. Useful for comparing vehicles.
- **Possible errors**: `400 Bad Request`

### 5.4 Get Config
- **Method**: GET
- **Endpoint**: `/config`
- **Authentication**: Public
- **Request DTO**: None.
- **Response DTO**: `{ "success": true, "data": { ...config }, "message": "Pricing config fetched" }`
- **Permissions**: None
- **Validation**: None
- **Business rules**: Fetches public rate card and constants configured in the pricing service.
- **Possible errors**: `500 Internal Server Error`

### 5.5 Get Surge Status
- **Method**: GET
- **Endpoint**: `/surge-status`
- **Authentication**: Public
- **Request DTO**: 
  - **Query parameters**: `lat`, `lng`, `vehicleType` (implied, unused internally currently).
- **Response DTO**: `{ "success": true, "data": { "surgeActive": false, "surgeMultiplier": 1.0, ... } }`
- **Permissions**: None
- **Validation**: None
- **Business rules**: Phase 1 implementation always returning no-surge. Setup for future dynamic pricing rules based on location and vehicle type.
- **Possible errors**: `500 Internal Server Error`
