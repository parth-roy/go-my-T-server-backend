# Backend Modules Analysis - Batch 3

## 1. Leads Module
- **Purpose**: Handles lead generation primarily for workforce (drivers, workers, fleet owners) and general inquiries.
- **Responsibilities**: Allows submission of lead applications, lists and filters leads for admins, and manages the conversion of suitable leads into full platform users (User, Driver, Worker profiles).
- **Public Services**: None explicit (services are handled entirely inside controllers).
- **Controllers**:
  - `createLead`: Accepts public form submissions.
  - `getLeads`: Admin endpoint to list general leads with pagination.
  - `getWorkforceLeads`: Admin endpoint to list specific workforce/employer leads.
  - `updateLeadStatus`: Admin endpoint to update status. If status is `SUITABLE`, it seamlessly creates a `User` and corresponding `Driver` or `Worker` profile.
- **Repositories**: Direct Prisma access.
- **DTOs**: `CreateLeadSchema`, `UpdateLeadStatusSchema`, `GetLeadsQuerySchema` (Zod schemas).
- **Entities**: `Lead`, `User`, `Driver`, `Worker`.
- **Events**: Implicit profile creation event when lead status changes to SUITABLE.
- **Dependencies**: Prisma database client.
- **Database models used**: `Lead`, `User`, `Driver`, `Worker`.
- **Business logic owner**: The Leads module owns the logic for workforce onboarding via leads.

## 2. Maps Module
- **Purpose**: Provides geographic services, distance calculations, and location tracking.
- **Responsibilities**: Autocomplete places, fetch place details, reverse geocoding, route distance and duration calculations, caching of geographical data, managing user recent searches, and validating geographical serviceability.
- **Public Services**:
  - `mapsService`: Integrates with Mapbox (autocomplete, place details, geocoding, directions) and manages Redis caching.
  - `recentSearchService`: CRUD operations for user recent location searches.
  - `serviceability.service`: Validates if a coordinate falls within India and checks active serviceability configs.
- **Controllers**: `mapsController` exposing autocomplete, place-details, reverse-geocode, geocode, distance-matrix, and recent searches management.
- **Repositories**: Direct Prisma access for recent searches and serviceability configs. Redis for heavy caching of Mapbox responses.
- **DTOs**: Implicit query params.
- **Entities**: `RecentSearch`, `ServiceabilityConfig`.
- **Events**: None.
- **Dependencies**: Redis cache, Mapbox API.
- **Database models used**: `RecentSearch`, `ServiceabilityConfig`.
- **Business logic owner**: Maps module owns routing fallbacks, serviceability boundaries, and geocoding caches.

## 3. Marketplace Module
- **Purpose**: Orchestrates the real-time private bidding system for freight bookings.
- **Responsibilities**: Exposing booking opportunities to drivers/fleets, receiving bids, handling bid revisions, enabling bidirectional bid chat, enforcing participant eligibility, handling bid awards, and handling marketplace expiration state.
- **Public Services**:
  - `MarketplaceService` (methods like `listOpportunities`, `getOpportunity`, `submitBid`, `createRevision`, `sendMessage`, `acceptExactRevision`, `expireMarketplaceState`, etc.)
  - Gateway websocket functions for subscribing to threads/windows.
- **Controllers**: REST controllers wrapping the `MarketplaceService` functions.
- **Repositories**: Direct Prisma usage with serializable transactions.
- **DTOs**: `opportunitiesQuerySchema`, `submitBidSchema`, `createRevisionSchema`, `sendBidMessageSchema`.
- **Entities**: `MarketplaceBid`, `BidRevision`, `BidMessage`, `BidAward`, `BidWindow`, `Booking`, `Driver`, `FleetOwner`, `TruckAssignment`.
- **Events**:
  - Emits socket events (`bid_created`, `bid_revision_created`) via `socket.instance`.
  - Dispatches push and in-app notifications.
  - Has a scheduled job (`marketplace.job.ts`) running every 30s to expire/recover state.
- **Dependencies**: `booking`, `payment`, `notifications` modules, and `shared/socket`.
- **Database models used**: `MarketplaceBid`, `BidRevision`, `BidMessage`, `BidAward`, `BidWindow`, `Booking`, `Driver`, `FleetOwner`, `TruckAssignment`, `User`.
- **Business logic owner**: Marketplace module owns strict bidding rules, participant eligibility, operational availability validation, and offer selection/awarding logic.

## 4. Notifications Module
- **Purpose**: Centralized communication engine for sending push and in-app notifications.
- **Responsibilities**: Wrapping Firebase Cloud Messaging (FCM) for device and topic-based push notifications. Managing persistent in-app user notifications (listing, unread counts, marking as read).
- **Public Services**:
  - `notificationService`: Handles FCM interactions (sendToDevice, sendToDevices, sendToTopic, subscribe/unsubscribe).
  - `inapp.notification.service`: Handles DB operations for `UserNotification` (create, list, markRead).
- **Controllers**: `notificationController` (internal push endpoints), `inapp.notification.controller` (user-facing endpoints).
- **Repositories**: Direct Prisma usage (`UserNotification`).
- **DTOs**: Implicit request bodies.
- **Entities**: `UserNotification`.
- **Events**: Acts as the consumer/executor for notification events triggered globally.
- **Dependencies**: Firebase Admin SDK.
- **Database models used**: `UserNotification`.
- **Business logic owner**: Notifications module.

## 5. Payment Module
- **Purpose**: Payment gateway integration, specifically Razorpay.
- **Responsibilities**: Creating secure orders, verifying payment signatures, handling Razorpay webhooks (captured, failed), and securing booking state changes during payment confirmation.
- **Public Services**:
  - `booking-payment.service`: Contains `secureCapturedBookingPayment` with serializable transactions to prevent race conditions during payment capture.
  - `razorpay.client`: Razorpay SDK instance and inspection helpers.
- **Controllers**: `createOrder`, `verifyPayment`, `mockPaymentSuccess`, `razorpayWebhook`.
- **Repositories**: Direct Prisma access.
- **DTOs**: Implicit request bodies.
- **Entities**: `Booking`, `BidAward`.
- **Events**: Finalizes paid bid awards and triggers booking completion upon payment success.
- **Dependencies**: `booking`, `marketplace` modules, Razorpay API.
- **Database models used**: `Booking`, `BidAward`, `Driver`.
- **Business logic owner**: Payment module owns order generation, idempotency, signature verification, and race-condition prevention during captures.

## 6. Pricing Module
- **Purpose**: Centralized fare calculation engine.
- **Responsibilities**: Calculating base fares, distance fares, time fares, fuel surcharges, loading charges, insurance, and GST. Enforcing minimum driver payouts (MPP). Admin management of dynamic pricing configs.
- **Public Services**:
  - `pricingService`: Core estimation logic, waiting charge calculation, bulk estimation, and cache invalidation.
  - `pricing.admin.service`: Admin CRUD operations for vehicle pricing, global configs, fuel prices, and commission rates.
- **Controllers**: `pricingController` exposing public estimation endpoints and active vehicles list.
- **Repositories**: Direct Prisma usage and extensive Redis caching.
- **DTOs**: `FareEstimateRequest` (TypeScript interface).
- **Entities**: `VehicleTypePricing`, `PricingConfig`, `PricingAuditLog`, `DriverPayoutSubsidy`.
- **Events**: Generates rich audit logs (`PricingAuditLog`) on every fare estimation/confirmation.
- **Dependencies**: `maps` module for distance matrices. Redis.
- **Database models used**: `VehicleTypePricing`, `PricingConfig`, `PricingAuditLog`, `DriverPayoutSubsidy`.
- **Business logic owner**: Pricing module completely owns the mathematical fare formula, config thresholds, and driver minimum payout protection (MPP).
