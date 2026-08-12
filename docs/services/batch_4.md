# Backend Service Documentation - Batch 4

This document provides an exhaustive analysis of the specific backend Service classes in the `D:\Projects\Parther_Technologies\logistic\server\src\modules` directory.

---

## 1. Booking Payment Service (`payment\booking-payment.service.ts`)

### Responsibilities
Handles the secure capture and reconciliation of booking payments (specifically for Razorpay integrations). It verifies that payment details (amount, currency, order ID) match the booking and updates the booking's payment status, guarding against replay attacks and race conditions.

### Methods
- **`secureCapturedBookingPayment(input: CapturedPaymentInput)`**: Reconciles a captured payment. Validates that the Razorpay order ID matches the booking, checks if the payment is already processed or refunded, validates the currency (INR) and expected amount, handles special pricing for `PRIVATE_BID` modes, and atomically updates the booking to `PAID`.

### External calls
- No direct external HTTP calls are made within this service. It processes the payload that has already been received from a payment gateway (like a webhook or frontend callback).

### Internal dependencies
- `prisma`: For database operations.
- `AppError`: For throwing standardized domain errors.

### Business rules
- **Replay Attack Protection:** Verifies that the `razorpayOrderId` on the booking matches the incoming `orderId`.
- **Idempotency/State Validation:** Returns early if already `PAID`. Throws an error if already `REFUNDED`.
- **Amount & Currency Validation:** The incoming `amountPaise` must exactly match the booking's expected total (in paise) and the currency must be `INR`.
- **Private Bid Handling:** For `PRIVATE_BID` bookings, it fetches the active `bidAward` and sets the expected payment amount to the `customerTotal` from the bid award instead of the booking's generic fare.
- **Concurrency Control:** Executes inside a transaction with `Serializable` isolation level. Updates using `updateMany` with a `paymentStatus` condition to prevent race conditions (checking that the update count is exactly 1).

### Database writes
- **Table `booking`**: Updates `paymentStatus` (to `PAID`), `paymentRef`, and `paymentMethod`.

### Database reads
- **Table `booking`**: Queries booking details by ID.
- **Table `bidAward`**: Queries for an active bid award related to a `PRIVATE_BID` booking.

### Cross-module communication
- None.

---

## 2. Pricing Admin Service (`pricing\pricing.admin.service.ts`)

### Responsibilities
Handles administrative operations for pricing management. This includes updating vehicle base fares and parameters, global pricing configurations, commission rates, and fuel surcharge configs. It is responsible for logging all pricing changes for audit purposes and invalidating caches.

### Methods
- **`adminListVehicles()`**: Lists all vehicle types and their pricing configs, ordered by base fare.
- **`adminUpdateVehicle(vehicleType, data, adminId)`**: Updates a specific vehicle's pricing configuration, logs the change, and invalidates the vehicle cache.
- **`adminListConfig()`**: Lists all global pricing configurations.
- **`adminUpdateConfig(key, value, adminId)`**: Updates a specific global configuration key, logs the change, and invalidates the config cache.
- **`adminGetCommissionRate()`**: Retrieves the current platform commission rate and lifecycle stage.
- **`adminSetCommissionRate(rate, reason, adminId)`**: Updates the platform commission rate, validating bounds and requiring a reason.
- **`adminGetFuelStatus()`**: Calculates the active fuel surcharge status based on configured baseline diesel price, current diesel price, and thresholds.
- **`adminUpdateFuelPrice(currentPrice, adminId)`**: Updates the current diesel price configuration and logs the change.
- **`adminGetPricingAuditLog(page, limit, ...)`**: Retrieves paginated pricing audit logs, optionally filtered by vehicle type and date range.
- **`adminGetSubsidies(page, limit)`**: Retrieves paginated driver payout subsidies.
- **`logPricingChange(adminId, action, entityKey, oldValue, newValue, reason)`**: (Private) Helper to log administrative pricing changes. Currently logs to standard output, prepped for a future database table.

### External calls
- None.

### Internal dependencies
- `prisma`: For database operations.
- `AppError`: For throwing domain errors.
- `logger`: For auditing changes.
- `pricingService`: Used to invalidate pricing caches.

### Business rules
- **Commission Rate Bounds:** Commission rate must be strictly between 0% and 30%.
- **Commission Change Audit:** A reason of at least 5 characters is mandatory when changing the commission rate.
- **Fuel Price Bounds:** Diesel prices must be between ₹50 and ₹200 per litre.
- **Cache Invalidation:** Any update to a vehicle or global config mandates immediate invalidation of the corresponding Redis cache.

### Database writes
- **Table `vehicleTypePricing`**: Updates vehicle-specific configuration.
- **Table `pricingConfig`**: Updates global configuration values (commission rates, fuel prices, etc.).

### Database reads
- **Table `vehicleTypePricing`**: Reads list of vehicles or unique vehicle info.
- **Table `pricingConfig`**: Reads individual keys or batches of keys for fuel status.
- **Table `pricingAuditLog`**: Reads and counts audit logs for pagination.
- **Table `driverPayoutSubsidy`**: Reads and counts subsidies for pagination.

### Cross-module communication
- Injects and calls `pricingService.invalidateVehicleCache()` and `pricingService.invalidateConfigCache()`.

---

## 3. Pricing Service (`pricing\pricing.service.ts`)

### Responsibilities
The core engine for calculating and estimating fares (GoMyTruck Pricing Engine). It evaluates distance, duration, wait times, surcharges, GST, platform commissions, and enforces the Minimum Payout Policy (MPP) for drivers. It also manages caching of pricing rules via Redis.

### Methods
- **`getVehicleTypes()`**: Retrieves available vehicle types and configurations (cached).
- **`estimateFare(req: FareEstimateRequest)`**: The main estimation method. It computes base fare, distance fare, time fare, fuel surcharge, surge multipliers, loading charges, insurance, GST, driver payout, and platform revenue. It enforces the MPP and writes an audit log.
- **`calculateWaitingCharge(arrivedAt, pickedUpAt, vehicle)`**: Computes the waiting penalty based on free minutes and block duration rules.
- **`invalidateVehicleCache()`**: Clears the Redis cache for vehicles.
- **`invalidateConfigCache()`**: Clears the Redis cache for global config.
- **`getPublicConfig()`**: Exposes a safe subset of global pricing configurations for frontend consumption.
- **`estimateAll(...)`**: Performs bulk estimation for all active vehicles for a given route (used by UI for listing prices). Bypasses audit logs and add-on assumptions to optimize speed.

### External calls
- Indirectly relies on map provider APIs (like Mapbox) by calling `mapsService.getDistanceMatrix`.

### Internal dependencies
- `prisma`: For database operations.
- `AppError`: For error handling.
- `mapsService`: To fetch real-world distance and duration.
- `logger`: For tracing calculation outputs.
- `getRedis`: For Redis caching.

### Business rules
- **Service Area Validation:** Coordinates must fall within the bounding box of India (includes Andaman & Nicobar exceptions). Pickup and Drop cannot be the same location (< 50m).
- **Minimum Distance:** Fares won't be calculated if distance is below the configured `min_trip_distance_km`.
- **Time Fare Cap:** Time-based fares are capped at a maximum of 2x the distance fare.
- **Minimum Fare Floor:** The computed total fare is strictly bounded by a hard `minFare` assigned to the vehicle.
- **GST Calculation:** Differentiates GST (5% for freight, 18% for loading/insurance services).
- **Minimum Payout Policy (MPP):** Ensures a driver makes a minimum guaranteed amount per km. If the calculated payout falls below this floor, the system will first dynamically compress the platform commission to 0%. If it still falls short, it issues a "Platform Subsidy" and logs it.
- **Surge Pricing:** Configured but defaults to a 1.0 multiplier for Stage 1. Hard caps are applied based on vehicle definitions.

### Database writes
- **Table `driverPayoutSubsidy`**: Creates a record when the platform subsidizes a trip to enforce MPP.
- **Table `pricingAuditLog`**: Creates an extensive audit log of the fare components for `estimateFare`.

### Database reads
- **Table `vehicleTypePricing`**: Reads active vehicles (often from Redis cache).
- **Table `pricingConfig`**: Reads global config settings (often from Redis cache).

### Cross-module communication
- **Maps Module:** Calls `mapsService.getDistanceMatrix` to calculate real-world trip distance and duration.
- **Redis Cache:** Interacts directly with the Redis client for get/set/del operations.

---

## 4. Rewards Service (`rewards\rewards.service.ts`)

### Responsibilities
Manages the gamified rewards system, including user coin balances, tier logic, transaction histories, and scratch card generation/redemption.

### Methods
- **`getCoinBalance(userId)`**: Fetches a user's coin balance and calculates their tier. Creates an initial balance record if it doesn't exist.
- **`getCoinHistory(userId, page, limit)`**: Retrieves paginated coin transactions.
- **`getScratchCards(userId)`**: Fetches a user's generated scratch cards.
- **`generateScratchCard(userId, bookingId, fareAmount)`**: Logic to generate a new scratch card for a booking, introducing randomness for wins/losses.
- **`scratchCard(userId, cardId)`**: Marks a card as scratched, credits the user's coin balance if won, and creates a coin transaction record.

### External calls
- None.

### Internal dependencies
- `prisma`: For database operations.
- `AppError`: For error handling.
- `logger`: For logging events.
- `eventBus`: For emitting system-wide events.

### Business rules
- **Tier System:** Evaluated on the fly based on current balance (Bronze 0, Silver 500, Gold 2000, Platinum 5000).
- **Scratch Card Generation:** A card has a 90% chance to win. The maximum win is proportional to the fare amount (1 coin per rupee), and the actual win amount is randomized between 50% to 100% of the max.
- **Card Constraints:** Ensures only one scratch card exists per booking. Scratched cards expire after 90 days.
- **Atomic Crediting:** Uses database transactions when a card is scratched to simultaneously update the `CoinBalance` and insert a `CoinTransaction`.

### Database writes
- **Table `coinBalance`**: Creates a new balance or updates the `cachedBalance`.
- **Table `scratchCard`**: Creates new cards and updates their status to `SCRATCHED`.
- **Table `coinTransaction`**: Creates audit records for coin earnings.

### Database reads
- **Table `coinBalance`**: Fetches the user's balance.
- **Table `scratchCard`**: Fetches existing cards for users/bookings.
- **Table `coinTransaction`**: Fetches history.

### Cross-module communication
- **EventBus:** Emits `rewards.scratch_card_ready` when a new card is generated to notify the user.

---

## 5. Subscription Service (`subscription\subscription.service.ts`)

### Responsibilities
Manages driver subscription plans (e.g., BASIC, STANDARD, PRO, PREMIUM) required for drivers to operate on the platform.

### Methods
- **`selectPlan(userId, plan, paymentReference)`**: Creates or upgrades a driver's subscription plan. Maps the plan to a hardcoded price and calculates validity dates.
- **`getSubscription(userId)`**: Retrieves a driver's current subscription details.

### External calls
- None. (Future versions will likely integrate with webhooks from payment gateways).

### Internal dependencies
- `prisma`: For database operations.
- `AppError`: For error handling.
- `logger`: For logging.

### Business rules
- **Plan Pricing:** Hardcoded prices (BASIC: 999, STANDARD: 1499, PRO: 2499, PREMIUM: 3999 INR).
- **Validity:** A subscription lasts exactly 30 days from the date of activation.
- **Driver Requirement:** A user must have a valid `Driver` profile in the system to subscribe.
- **Upgrade/Replace:** Selecting a new plan overwrites the existing subscription immediately.

### Database writes
- **Table `driverSubscription`**: Creates a new subscription or updates an existing one (upsert logic).

### Database reads
- **Table `driver`**: Reads the driver record (and relational subscription) based on `userId`.

### Cross-module communication
- None.

---

## 6. Support Service (`support\support.service.ts`)

### Responsibilities
Manages customer and driver support interactions through a ticketing system with conversational threads.

### Methods
- **`createTicket(userId, data)`**: Creates a new support ticket and inserts the initial message.
- **`getTickets(userId)`**: Retrieves all tickets for a user, previewing the most recent message.
- **`getTicketDetails(ticketId, userId)`**: Retrieves full details of a specific ticket, including the chronological thread of messages.
- **`addMessage(ticketId, userId, data)`**: Appends a new message to an existing ticket.

### External calls
- None.

### Internal dependencies
- `prisma`: For database operations.
- `AppError`: For error handling.

### Business rules
- **Authorization Check:** Users can only view or reply to their own tickets. The system enforces `userId === ticket.userId`.
- **Closed Tickets:** Users cannot add new messages to a ticket if its status is `CLOSED`.

### Database writes
- **Table `supportTicket`**: Creates a new ticket.
- **Table `supportMessage`**: Creates messages inside a ticket (either via nested Prisma writes on creation, or standalone).

### Database reads
- **Table `supportTicket`**: Fetches lists and specific ticket records.
- **Table `supportMessage`**: Fetches threads associated with a ticket.

### Cross-module communication
- None.

---

## 7. Training Service (`training\training.service.ts`)

### Responsibilities
Manages educational content and onboarding training modules for the workforce (drivers/loaders) and tracks their progress.

### Methods
- **`getAdminCourses()`**: Retrieves all courses along with the count of workers who completed them.
- **`getAdminStats()`**: Provides aggregated system stats (total active courses, total completions, top 5 most completed courses).
- **`createCourse(data)`**: Admin function to create a new training course.
- **`updateCourse(id, data)`**: Admin function to modify course metadata.
- **`deleteCourse(id)`**: Admin function to soft-delete a course.
- **`getWorkforceCourses(workerId)`**: Retrieves all active courses and maps the specific worker's progress to each course.
- **`updateProgress(workerId, courseId)`**: Increments a worker's progress in a course. Handles marking the course as complete and generating certificates.

### External calls
- None.

### Internal dependencies
- `prisma`: For database operations.

### Business rules
- **Soft Deletes:** Deleting a course only flips the `isActive` boolean to false; it does not remove the record.
- **Progress Tracking:** Progress is tracked via `completedModules`. Once this counter equals the `course.modulesCount`, the status transitions to `COMPLETED`.
- **Certificate Generation:** Upon hitting `COMPLETED` status, a fake standard certificate URL is attached to the worker's progress record.

### Database writes
- **Table `trainingCourse`**: Creates and updates courses (including soft deletion).
- **Table `workerTrainingProgress`**: Creates new progress records and updates module counts and statuses.

### Database reads
- **Table `trainingCourse`**: Reads active courses and performs aggregations on relationships.
- **Table `workerTrainingProgress`**: Reads progress for specific workers or global counts.

### Cross-module communication
- None.
