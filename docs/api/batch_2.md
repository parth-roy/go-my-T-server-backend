# API Reference - Batch 2

## 1. Driver Wallet Module

### `GET /` (Driver Wallet)
- **Method:** `GET`
- **Endpoint:** `/` (e.g. `/driver-wallet`)
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** None.
- **Response DTO:** Returns the current wallet data for the driver.
- **Validation:** None via schema.
- **Business Rules:** Retrieves the wallet details associated with the authenticated driver.
- **Possible Errors:**
  - `401 Unauthorized` (Invalid/missing token)
  - `403 Forbidden` (User is not a DRIVER)
  - `404 Not Found` (Driver profile not found `DRIVER_NOT_FOUND`)

### `GET /transactions`
- **Method:** `GET`
- **Endpoint:** `/transactions` (e.g. `/driver-wallet/transactions`)
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Query Params: `page` (optional, default 1), `limit` (optional, default 20)
- **Response DTO:** Paginated list of driver wallet transactions.
- **Validation:** None via schema, inline type casting to Number.
- **Business Rules:** Fetches driver's transaction history from wallet service.
- **Possible Errors:** 
  - `401 Unauthorized`, `403 Forbidden`
  - `404 Not Found` (Driver profile not found)

### `POST /pay-commission`
- **Method:** `POST`
- **Endpoint:** `/pay-commission`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** None in body.
- **Response DTO:** Commission payment order details (Razorpay order).
- **Validation:** None via schema.
- **Business Rules:** Creates a Razorpay order for the driver to pay outstanding platform commissions.
- **Possible Errors:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### `POST /pay-commission/verify`
- **Method:** `POST`
- **Endpoint:** `/pay-commission/verify`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
- **Response DTO:** Updated wallet state.
- **Validation:** None via schema.
- **Business Rules:** Verifies the Razorpay payment signature and updates the driver's wallet (e.g., clears negative balance/commission dues).
- **Possible Errors:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, plus payment verification errors.

### `POST /withdraw`
- **Method:** `POST`
- **Endpoint:** `/withdraw`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Body: `{ amount: number }`
- **Response DTO:** Created withdrawal request details.
- **Validation:** Inline casting to Number.
- **Business Rules:** Driver requests withdrawal of funds. The request enters a processing state.
- **Possible Errors:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, insufficient balance errors.

### `POST /admin/driver-wallet/cash-collection`
- **Method:** `POST`
- **Endpoint:** Admin Route
- **Authentication:** Required (Admin JWT)
- **Permissions:** `ADMIN` (Implied in Admin Router)
- **Request DTO:** Body: `{ entityType, entityId, amount, bookingId, note }`
- **Response DTO:** Record of the cash collection.
- **Validation:** Inline validation.
- **Business Rules:** Allows admin to record cash collection from a driver.
- **Possible Errors:** Generic Auth/Admin errors, invalid entity type.

### `GET /admin/driver-wallets`
- **Method:** `GET`
- **Endpoint:** Admin Route
- **Authentication:** Required
- **Permissions:** `ADMIN`
- **Request DTO:** None.
- **Response DTO:** List of all driver wallets, sorted by lowest balance first.
- **Business Rules:** Returns all driver wallets including basic driver details (name, phone).

### `GET /admin/withdrawals`
- **Method:** `GET`
- **Endpoint:** Admin Route
- **Authentication:** Required
- **Permissions:** `ADMIN`
- **Request DTO:** Query Param: `status` (optional)
- **Response DTO:** Top 100 withdrawal requests sorted by `requestedAt` descending.
- **Business Rules:** List driver withdrawal requests for admin overview.

### `PATCH /admin/withdrawals/:id/manual-complete`
- **Method:** `PATCH`
- **Endpoint:** Admin Route
- **Authentication:** Required
- **Permissions:** `ADMIN`
- **Request DTO:** Path: `id`, Body: `{ adminNote, utr }`
- **Response DTO:** Updated withdrawal record.
- **Business Rules:** Allows an admin to manually mark a withdrawal as completed, typically if done offline or resolving a stuck payout.

### `PATCH /admin/withdrawals/:id/retry`
- **Method:** `PATCH`
- **Endpoint:** Admin Route
- **Authentication:** Required
- **Permissions:** `ADMIN`
- **Request DTO:** Path: `id`
- **Response DTO:** Status `PENDING` reset success, retry initiated.
- **Business Rules:** Retries a failed withdrawal payout via RazorpayX. Checks if RazorpayX payouts are enabled.

---

## 2. Fleet Module

### `POST /drivers/register`
- **Method:** `POST`
- **Endpoint:** `/drivers/register` (e.g. `/fleet/drivers/register`)
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Body: `name` (string), `profileImageUrl` (url, optional), `language` (enum: 'en', 'hi', 'bn').
- **Response DTO:** Created driver profile.
- **Validation:** `registerDriverSchema` via Zod.
- **Business Rules:** Creates the driver profile. 
- **Possible Errors:** Validation errors (400), Auth errors (401, 403).

### `GET /drivers/me`
- **Method:** `GET`
- **Endpoint:** `/drivers/me`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** None.
- **Response DTO:** Current driver profile.
- **Validation:** None.
- **Business Rules:** Returns the profile data of the logged-in driver.

### `POST /vehicles/register`
- **Method:** `POST`
- **Endpoint:** `/vehicles/register`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Body: `registrationNo` (string, uppercase, no space), `type` (enum), `make`, `model`, `year`, `color` (optional), `capacityKg`.
- **Response DTO:** Created vehicle details.
- **Validation:** `registerVehicleSchema` via Zod.
- **Business Rules:** Registers a vehicle associated with the driver.
- **Possible Errors:** Validation Errors.

### `POST /drivers/verify-license`
- **Method:** `POST`
- **Endpoint:** `/drivers/verify-license`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Body: `dlNumber`, `dob` (yyyy-mm-dd), `driverName` (optional), `permit` (optional).
- **Response DTO:** Verification results.
- **Validation:** `verifyLicenseSchema` via Zod. Also rate-limited (10 calls/min/IP).
- **Business Rules:** Verifies Driver's License via ULIP (SARATHI AUTHAPI/03).
- **Possible Errors:** `429 Too Many Requests` (ULIP_RATE_LIMITED), ULIP API failures.

### `POST /vehicles/verify-rc`
- **Method:** `POST`
- **Endpoint:** `/vehicles/verify-rc`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Body: `vehicleId`, and at least one of: `ownerName`, `chassisNumber`, `engineNumber`.
- **Response DTO:** Verification results.
- **Validation:** `verifyVehicleRcSchema` via Zod. Rate-limited (10 calls/min/IP).
- **Business Rules:** Verifies Vehicle RC via ULIP (VAHAN AUTHAPI/02).

### `PATCH /drivers/status`
- **Method:** `PATCH`
- **Endpoint:** `/drivers/status`
- **Authentication:** Required (JWT)
- **Permissions:** `DRIVER`
- **Request DTO:** Body: `status` (enum: 'OFFLINE', 'AVAILABLE')
- **Response DTO:** Updated driver status.
- **Validation:** `updateDriverStatusSchema` via Zod.
- **Business Rules:** Updates the driver's online/offline status. (System manages ON_TRIP/BREAK).

### `POST /admin/drivers/:driverId/verify-override`
- **Method:** `POST`
- **Endpoint:** `/admin/drivers/:driverId/verify-override`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN` (Bypasses DRIVER role requirement)
- **Request DTO:** Path: `driverId`. Body: `notes` (string, optional).
- **Response DTO:** Updated verification status.
- **Validation:** None.
- **Business Rules:** Allows admins to manually override driver verification (e.g., bypass failed ULIP verification).

---

## 3. Fleet Owner Module

### `POST /register`
- **Method:** `POST`
- **Endpoint:** `/register`
- **Authentication:** Required (JWT)
- **Permissions:** Any valid user (Post-role selection).
- **Request DTO:** Body: `companyName` (string), `gstin` (string regex, optional), `pan` (string regex, optional).
- **Response DTO:** Created Fleet Owner profile.
- **Validation:** `registerFleetOwnerSchema` via Zod.
- **Business Rules:** Creates the initial fleet owner profile for the user.

### `GET /me`
- **Method:** `GET`
- **Endpoint:** `/me`
- **Authentication:** Required (JWT)
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** None.
- **Response DTO:** Logged-in fleet owner profile.

### `GET /dashboard`
- **Method:** `GET`
- **Endpoint:** `/dashboard`
- **Authentication:** Required (JWT)
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** None.
- **Response DTO:** Dashboard statistics/overview.

### `POST /trucks`
- **Method:** `POST`
- **Endpoint:** `/trucks`
- **Authentication:** Required (JWT)
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** `addFleetTruckSchema`
- **Response DTO:** Added fleet truck.
- **Validation:** Zod schema validation (checks type, max/min values).

### `GET /trucks`
- **Method:** `GET`
- **Endpoint:** `/trucks`
- **Authentication:** Required
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** None.
- **Response DTO:** List of fleet trucks.

### `PATCH /trucks/:truckId`
- **Method:** `PATCH`
- **Endpoint:** `/trucks/:truckId`
- **Authentication:** Required
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** `updateFleetTruckFullSchema` (color, imageUrl, isActive, document urls/expiries).
- **Response DTO:** Updated truck details.
- **Validation:** Zod Schema.

### `DELETE /trucks/:truckId`
- **Method:** `DELETE`
- **Endpoint:** `/trucks/:truckId`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** Path: `truckId`
- **Response DTO:** Deletion status.

### `PATCH /trucks/:truckId/assign-driver`
- **Method:** `PATCH`
- **Endpoint:** `/trucks/:truckId/assign-driver`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** `setTruckDriverSchema` (`fleetDriverId` nullable)
- **Response DTO:** Updated truck details.

### `GET /trucks/:truckId/documents`
- **Method:** `GET`
- **Endpoint:** `/trucks/:truckId/documents`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** Path: `truckId`
- **Response DTO:** List of truck documents.

### `POST /trucks/:truckId/documents`
- **Method:** `POST`
- **Endpoint:** `/trucks/:truckId/documents`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** `addTruckDocumentSchema` (`documentType`, `fileUrl`, `expiryDate`, `notes`).
- **Response DTO:** Added truck document.

### `GET /drivers/earnings`
- **Method:** `GET`
- **Endpoint:** `/drivers/earnings`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** None.
- **Response DTO:** Per-driver earnings breakdown.

### `POST /drivers`
- **Method:** `POST`
- **Endpoint:** `/drivers`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** `addFleetDriverSchema` (`phone`).
- **Response DTO:** Newly added driver.

### `GET /drivers`
- **Method:** `GET`
- **Endpoint:** `/drivers`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** None.
- **Response DTO:** List of fleet drivers.

### `DELETE /drivers/:fleetDriverId`
- **Method:** `DELETE`
- **Endpoint:** `/drivers/:fleetDriverId`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** Path param `fleetDriverId`.
- **Response DTO:** Removal status.

### `GET /bookings/active`
- **Method:** `GET`
- **Endpoint:** `/bookings/active`
- **Permissions:** `FLEET_OWNER`
- **Response DTO:** Active bookings for the fleet.

### `GET /bookings/pending`
- **Method:** `GET`
- **Endpoint:** `/bookings/pending`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** `listPendingBookingsSchema` (Query Params: `page`, `limit`, `vehicleType`).
- **Response DTO:** Pending bookings suitable for the fleet.

### `POST /bookings/assign`
- **Method:** `POST`
- **Endpoint:** `/bookings/assign`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** `assignTruckSchema` (`bookingId`, `truckId`, `fleetDriverId`).
- **Response DTO:** Assignment result.
- **Business Rules:** Assigns a specific fleet truck and driver to a pending booking.

### `GET /earnings`
- **Method:** `GET`
- **Endpoint:** `/earnings`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** Query Params validated by `fleetEarningsQuerySchema` (`page`, `limit`, `from`, `to`).
- **Response DTO:** Fleet earnings data.

### `GET /maintenance`, `POST /maintenance`, `PATCH /maintenance/:id`, `DELETE /maintenance/:id`
- **Permissions:** `FLEET_OWNER`
- **Request DTOs:** Validated via `addMaintenanceSchema` and `updateMaintenanceSchema`.
- **Business Rules:** CRUD operations for fleet truck maintenance records.

### `GET /fuel-logs`, `POST /fuel-logs`, `DELETE /fuel-logs/:id`
- **Permissions:** `FLEET_OWNER`
- **Request DTOs:** Validated via `addFuelLogSchema`.
- **Business Rules:** Manage fuel logging for fleet trucks.

### `GET /analytics`
- **Permissions:** `FLEET_OWNER`
- **Response DTO:** Advanced fleet analytics metrics.

---

## 4. Fleet Wallet Module

### `GET /`
- **Method:** `GET`
- **Endpoint:** `/` (Fleet Wallet)
- **Authentication:** Required (JWT)
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** None.
- **Response DTO:** Fleet owner wallet data.
- **Possible Errors:** `404 Not Found` (Fleet owner profile not found).

### `GET /transactions`
- **Method:** `GET`
- **Endpoint:** `/transactions`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** Query params: `page`, `limit`
- **Response DTO:** Paginated transaction history for fleet wallet.

### `POST /withdraw`
- **Method:** `POST`
- **Endpoint:** `/withdraw`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** Body: `{ amount: number }`
- **Response DTO:** Status of the withdrawal request.

### `POST /transfer`
- **Method:** `POST`
- **Endpoint:** `/transfer`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** Body: `{ driverId: string, amount: number, note?: string }`
- **Response DTO:** Transfer status.
- **Business Rules:** Transfers wallet balance from the fleet owner to a specific driver.

### `POST /offline-salary`
- **Method:** `POST`
- **Endpoint:** `/offline-salary`
- **Permissions:** `FLEET_OWNER`
- **Request DTO:** Body: `{ driverId: string, amount: number, note?: string }`
- **Response DTO:** Record creation status.
- **Business Rules:** Logs an offline salary payout from fleet owner to driver.

---

## 5. Gig Module

### `GET /catalog`
- **Method:** `GET`
- **Endpoint:** `/catalog`
- **Authentication:** None (Public)
- **Request DTO:** None.
- **Response DTO:** Skill categories, zone rates, urgencies, and duration options for UI dropdowns.

### `POST /estimate`
- **Method:** `POST`
- **Endpoint:** `/estimate`
- **Authentication:** None (Public)
- **Request DTO:** `estimateGigSchema` (category, location, workers needed, duration, urgency).
- **Response DTO:** Gig fare estimate.

### `POST /customer`
- **Method:** `POST`
- **Endpoint:** `/customer`
- **Authentication:** Required (JWT)
- **Permissions:** `CUSTOMER`
- **Request DTO:** `createGigSchema`
- **Response DTO:** Created gig job.

### `GET /customer`
- **Method:** `GET`
- **Endpoint:** `/customer`
- **Authentication:** Required (JWT)
- **Permissions:** `CUSTOMER`
- **Response DTO:** List of gigs posted by the authenticated customer.

### `GET /nearby`
- **Method:** `GET`
- **Endpoint:** `/nearby`
- **Authentication:** Required (JWT)
- **Permissions:** `WORKER`
- **Request DTO:** Query Params: `lat`, `lng`, `radiusKm`.
- **Response DTO:** Gigs available in the given radius.

### `POST /:id/accept`
- **Method:** `POST`
- **Endpoint:** `/:id/accept`
- **Authentication:** Required (JWT)
- **Permissions:** `WORKER`
- **Request DTO:** Path: `id` (Gig ID).
- **Response DTO:** Gig assignment data.
- **Business Rules:** Allows a worker to accept a gig.

### `GET /admin`
- **Method:** `GET`
- **Endpoint:** `/admin`
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Response DTO:** Complete list of all gigs in the system.

---

## 6. Leads Module

### `POST /`
- **Method:** `POST`
- **Endpoint:** `/leads/` (Public Router)
- **Authentication:** Optional (`optionalAuth` middleware)
- **Permissions:** Publicly accessible
- **Request DTO:** `CreateLeadSchema` (`name`, `companyName`, `phone` (10-digits), `city`, `role`).
- **Response DTO:** Submitted lead data.
- **Business Rules:** Accepts a lead application from a website form.

### `GET /`
- **Method:** `GET`
- **Endpoint:** `/leads/` (Admin Router)
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Query string: `GetLeadsQuerySchema` (`status`, `page`, `limit`).
- **Response DTO:** Paginated leads data.

### `GET /workforce`
- **Method:** `GET`
- **Endpoint:** `/leads/workforce` (Admin Router)
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Query string: `GetLeadsQuerySchema`.
- **Response DTO:** Paginated leads data filtered by `role: ['WORKFORCE', 'EMPLOYER']`.

### `PATCH /:id/status`
- **Method:** `PATCH`
- **Endpoint:** `/leads/:id/status` (Admin Router)
- **Authentication:** Required (JWT)
- **Permissions:** `ADMIN`
- **Request DTO:** Path: `id`. Body: `UpdateLeadStatusSchema` (`status`, `notes`).
- **Response DTO:** Updated lead data.
- **Business Rules:** Updates lead status. If status is `SUITABLE`, it automatically provisions a `User` account and either a `Driver` or `Worker` profile depending on the lead's specified role.
- **Possible Errors:** `404 Not Found` if lead doesn't exist.
