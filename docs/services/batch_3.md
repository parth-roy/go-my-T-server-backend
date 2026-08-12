# Backend Services Analysis - Batch 3

This document provides an exhaustive analysis of specific service classes in the `server/src/modules` directory.

---

## 1. Gig Service (`gig/gig.service.ts`)

### Responsibilities
Manages the "gig" or workforce job lifecycle. It handles finding nearby available workers, calculating dynamic fares (incorporating zone-based pricing, surge, and distance), creating gig jobs, and allowing workers to accept them.

### Methods
- `getGigConfig`: Helper to fetch the gig pricing configuration from the database, falling back to defaults if unavailable.
- `getNearestWorkerDistanceKm`: Helper to calculate the distance to the nearest available worker using the Haversine formula.
- `estimateGigFare`: Generates a fare estimation breakdown for the Flutter frontend without creating a database record.
- `createGig`: Calculates the final fare, creates the gig job in the database, and broadcasts the job to nearby workers via Socket.IO.
- `getCustomerGigs`: Retrieves all gig jobs created by a specific customer.
- `getNearbyGigs`: Retrieves all pending gig jobs (currently without radius filtering, which is planned for PostGIS).
- `getGigById`: Retrieves detailed information for a specific gig job, including assignments.
- `getAllGigs`: Admin method to fetch all gig jobs with customer details.
- `acceptGig`: Allows a worker to accept a gig job, creating an assignment. It automatically promotes the gig status to `ASSIGNED` when the required number of workers is reached.

### External calls
- None directly in this file, though it uses `Socket.IO` to push events to clients.

### Internal dependencies
- `prisma`: Database access.
- `AppError`: Standardized error handling.
- `getSocketInstance`: For real-time WebSocket communication.
- `logger`: System logging.
- `calculateGigFare`, `classifyZone`: Core pricing logic imported from `gig.pricing.ts`.

### Business rules
- **Distance Calculation**: Uses Haversine straight-line distance to find the nearest `AVAILABLE` worker.
- **Fare Rules**: Travel fees apply if the nearest worker is beyond 5km. Pricing includes platform commission and optional surge pricing (festival, rain).
- **Workforce Requirement**: A single gig can require multiple workers (`workersNeeded`). It remains `PENDING` until the number of accepted assignments matches the requirement, at which point it becomes `ASSIGNED`.
- **Worker Eligibility**: A worker cannot accept the same gig twice.

### Database writes
- `gigJob.create`: When a customer creates a gig.
- `gigAssignment.create`: When a worker accepts a gig.
- `gigJob.update`: When promoting the gig status to `ASSIGNED`.

### Database reads
- `gigPricingConfig.findMany`: To fetch active pricing rules.
- `worker.findMany`: To find available workers and their coordinates.
- `worker.findUnique`: To validate the worker accepting the gig.
- `gigJob.findMany`: To list gigs for a customer or nearby.
- `gigJob.findUnique`: To fetch gig details and check current assignments.

### Cross-module communication
- Uses `Socket.IO` namespace `/workforce` to emit the `new_gig_job` event to active workers.

---

## 2. Maps Service (`maps/maps.service.ts`)

### Responsibilities
Acts as a wrapper around the Mapbox API for geographic operations including autocomplete, place details, reverse geocoding, and routing (distance/duration). It implements aggressive Redis caching to minimize external API costs and latency.

### Methods
- `cacheGet` / `cacheSet`: Internal helpers for interacting with Redis.
- `autocomplete`: Fetches place predictions for a search string. Cached for 24 hours.
- `placeDetails`: Fetches the exact latitude/longitude geometry for a Mapbox place ID. Cached for 7 days.
- `reverseGeocode`: Converts lat/lng coordinates into a structured address with contextual hierarchy (country, state, city, pincode). Cached for 6 hours.
- `getDistanceMatrix`: Uses Mapbox Directions API for driving distance/duration. Not cached due to traffic variability, but includes a Haversine-based fallback if the API fails.

### External calls
- **Mapbox API**: Makes HTTP GET requests via `axios` to `api.mapbox.com/geocoding/v5/` and `api.mapbox.com/directions/v5/`.

### Internal dependencies
- `MAPBOX_API_KEY`: From config.
- `getRedis`: For caching responses.
- `AppError`, `logger`.

### Business rules
- **Caching**: Extreme reliance on caching. `autocomplete` (24h), `placeDetails` (7d), `reverseGeocode` (6h).
- **Coordinate Rounding**: For reverse geocoding, coordinates are rounded to 4 decimal places (~11m precision) to drastically improve the cache hit rate.
- **Routing Fallback**: If Mapbox Directions fails (after 2 retries), it calculates a straight-line Haversine distance, applies a 1.25x road multiplier, and assumes a 30 km/h average speed.

### Database writes
- None in SQL. Writes heavily to Redis.

### Database reads
- None in SQL. Reads heavily from Redis.

### Cross-module communication
- Pure utility service; invoked synchronously by other services (like Serviceability).

---

## 3. Recent Search Service (`maps/recent-search.service.ts`)

### Responsibilities
Manages a history of locations searched by users or devices to provide "recent searches" functionality in the frontend applications.

### Methods
- `getRecentSearches`: Retrieves the history, limited to a specified amount (default 10).
- `addRecentSearch`: Adds a new search entry. Implements upsert-like behavior and limits.
- `deleteRecentSearch`: Deletes a specific search history item.
- `clearRecentSearches`: Clears all searches for a user/device.

### External calls
- None.

### Internal dependencies
- `prisma`, `AppError`, `logger`.

### Business rules
- **Deduplication**: If the exact same search (same `placeId`) was made by the same user within the last 1 hour, it just updates the `createdAt` timestamp instead of creating a duplicate row.
- **Quota Limit**: Strictly limits history to 20 items per user. If adding a new item pushes the count to 21, the oldest item(s) are automatically pruned.

### Database writes
- `recentSearch.create`: Inserting new history.
- `recentSearch.update`: Updating timestamp on deduplicated entry.
- `recentSearch.deleteMany`: Pruning oldest entries or clearing all.
- `recentSearch.delete`: Deleting a single entry.

### Database reads
- `recentSearch.findMany`: Listing searches or finding oldest entries for pruning.
- `recentSearch.findFirst`: Checking for duplicates in the last hour.
- `recentSearch.count`: Enforcing the 20-item limit.

### Cross-module communication
- None.

---

## 4. Serviceability Service (`maps/serviceability.service.ts`)

### Responsibilities
Validates whether a geographic coordinate (pickup/drop) falls within a serviceable area where the platform operates. Designed for extensible checks (Country -> State -> City -> Zone).

### Methods
- `isInIndiaBoundingBox`: Hardcoded fallback coordinates checking if a location is roughly in India.
- `cacheKey`: Generates a Redis key by rounding coordinates to 3 decimal places (~110m grid).
- `checkServiceability`: The core method. Checks Redis, reverse geocodes via Mapbox, and evaluates the `ServiceabilityConfig` rules.
- `seedServiceabilityConfig`: Database seeder for default country rules.

### External calls
- Interacts with Mapbox via the internal `mapsService.reverseGeocode`.

### Internal dependencies
- `prisma`, `mapsService`, `logger`, `getRedis`.

### Business rules
- **Fail Open**: If the Mapbox API is unreachable, it falls back to a hardcoded bounding box of India. If inside the box, it assumes serviceability is `true`.
- **Granular Extensibility**: Operates in "Stage 1" (only verifying the Country is 'in'). However, it dynamically queries `ServiceabilityConfig` for State and City rules based on Mapbox context, allowing admins to disable specific states without code changes.
- **Caching**: Caches the final serviceability result in Redis for 24 hours.

### Database writes
- `serviceabilityConfig.upsert`: (Only during seeding). Redis sets.

### Database reads
- `serviceabilityConfig.findUnique`: To check COUNTRY and STATE level rules dynamically.

### Cross-module communication
- Utilizes the `mapsService` synchronously.

---

## 5. Marketplace Service (`marketplace/marketplace.service.ts`)

### Responsibilities
Orchestrates the entire private bidding marketplace. It handles the lifecycle of open bids where verified drivers and fleet owners can negotiate offers with customers, culminating in payment and assignment.

### Methods
- **Helpers**: `roundMoney`, `commercialAmounts`, `ensureWindowOpen`, `validateParticipantEligibility`, `ensureParticipantOperationalAvailability`, `notifyUser`.
- `listOpportunities`: Lists open bidding bookings for a provider based on their matching vehicle capacity and availability.
- `getOpportunity`: Retrieves details of a specific bidding opportunity.
- `listBookingBids`: Lists all bids for a specific booking.
- `getBidThread`: Retrieves details and history of a single bid negotiation thread.
- `submitBid`: Provider submits an initial official bid.
- `createRevision`: Provider or Customer proposes a counteroffer.
- `sendMessage`: Sends a text message in the negotiation thread.
- `withdrawBid` / `rejectBid`: Provider withdraws or customer rejects a bid.
- `acceptExactRevision`: Customer accepts the latest provider revision, locking the bid window and setting up an award for payment.
- `getAward`: Retrieves the pending or confirmed bid award.
- `secureCashAward` / `finalizePaidAward` / `finalizeSecuredAward`: Handles the payment finalization workflow, transitioning the booking and assigning the driver/fleet.
- `publishBidOpportunity`: Notifies matching nearby drivers/fleets of a new open load.
- `expireMarketplaceState`: Background job to close expired windows, handle late payments, and verify Razorpay payment statuses.

### External calls
- **Razorpay**: Via `inspectRazorpayOrder` to verify payment capture for overdue awards.
- **Firebase FCM**: Via `notificationService` to push notifications to clients.

### Internal dependencies
- `prisma`, `booking.transition`, `razorpay.client`, `booking-payment.service`.
- `notificationService`, `inapp.notification.service`.
- `socket.instance` for real-time marketplace events.

### Business rules
- **Eligibility**: Providers must be verified, have `AVAILABLE` status, and have a vehicle matching the booking's `vehicleType` and `goodsWeightKg`. Fleet drivers cannot bid; the fleet owner must bid.
- **Operational Availability**: Providers cannot have overlapping active or reserved trips when bidding or winning an award.
- **Pricing Constraints**: Bid amounts must fall within strict boundaries (`BID_MIN_FARE_MULTIPLIER` and `BID_MAX_FARE_MULTIPLIER`) of the booking's guide price.
- **Negotiation Rules**: Revisions must be sequential. A customer can only accept the *exact latest* revision, and it must have been authored/confirmed by the provider. Revisions carry strict expiry times.
- **Idempotency**: `submitBid`, `createRevision`, and `sendMessage` heavily enforce idempotency keys to prevent double-bidding or network retry errors.
- **Payment Lifecycle**: Once accepted, a `BidAward` is created and the `BidWindow` is locked. The customer has a strict deadline to pay. If they fail, the award expires and the window reopens for other bidders. If they succeed, the provider's status changes to `ON_TRIP` and the booking is assigned.

### Database writes
- `marketplaceBid.create/update`
- `bidRevision.create`
- `bidMessage.create`
- `bidWindow.update/updateMany`
- `bidAward.create/update/updateMany`
- `booking.update/updateMany` (transitions to pending payment, then assigned)
- `driver.updateMany` (reserves driver)

### Database reads
- `driver.findUnique`, `driver.findMany`
- `fleetOwner.findUnique`, `fleetOwner.findMany`
- `booking.findUnique`, `booking.findMany`, `booking.count`
- `marketplaceBid.findUnique`, `marketplaceBid.findMany`
- `bidRevision.findUnique`, `bidMessage.findUnique`
- `bidAward.findFirst`, `bidAward.findMany`

### Cross-module communication
- **Sockets**: Heavy use of custom socket emitters (`emitToMarketplaceBid`, `emitToMarketplaceCustomer`, `emitToMarketplaceUser`) to push live updates (`bid_created`, `bid_revision_created`, `bid_award_pending`, etc.).
- **Notifications**: Uses both in-app and FCM push notifications to alert users of counteroffers, awards, and expiries.
- **Payments**: Interacts with the Razorpay module to verify untracked payments.

---

## 6. In-App Notification Service (`notifications/inapp.notification.service.ts`)

### Responsibilities
Manages persistent, database-backed notifications for users, allowing them to view a history of alerts within the app UI.

### Methods
- `createNotification`: Internal helper to create a notification record.
- `listNotifications`: Fetches paginated notifications for a user, including the total unread count.
- `markOneRead`: Marks a specific notification as read.
- `markAllRead`: Marks all unread notifications for a user as read.

### External calls
- None.

### Internal dependencies
- `prisma`, `AppError`, `logger`.

### Business rules
- **Security**: Users can only interact with and view their own notifications.
- **Tracking**: Maintains an `isRead` boolean flag to differentiate new alerts from history.

### Database writes
- `userNotification.create`: Inserts new notifications.
- `userNotification.update`: Marks single notification as read.
- `userNotification.updateMany`: Marks bulk notifications as read.

### Database reads
- `userNotification.findMany`: For listing history.
- `userNotification.count`: To get total and unread counts.
- `userNotification.findUnique`: To verify ownership before marking read.

### Cross-module communication
- This service acts as a sink. It is invoked by other modules (like Marketplace and Bookings) to create historical records of events.

---

## 7. Notification Service (`notifications/notification.service.ts`)

### Responsibilities
Acts as the wrapper and adapter for Firebase Cloud Messaging (FCM). Handles the delivery of ephemeral push notifications to devices and pub/sub topics.

### Methods
- `sendToDevice`: Sends a push notification to a single FCM token.
- `sendToDevices`: Multicasts a push notification to an array of tokens.
- `sendToTopic`: Broadcasts a message to an FCM topic.
- `subscribeToTopic` / `unsubscribeFromTopic`: Manages device subscription to topics.

### External calls
- **Firebase Admin SDK**: Calls Google's FCM APIs (`messaging.send`, `messaging.sendEachForMulticast`, etc.).

### Internal dependencies
- `getMessaging`: Firebase initialization wrapper.
- `logger`.

### Business rules
- **Payload Formatting**: Detects if a notification is of type `NEW_BOOKING` or `BOOKING_DISPATCH`. If so, it embeds the `title` and `body` directly into the `data` payload rather than the standard `notification` object. This is a common workaround to force the Flutter frontend to handle the notification in the background instead of letting the OS display a default system tray alert.
- **Images**: Supports rich notifications with optional image URLs for Android.

### Database writes
- None.

### Database reads
- None.

### Cross-module communication
- Widely used utility service. Called by the marketplace service, gig service, and likely booking services to alert mobile clients of state changes in real-time.
