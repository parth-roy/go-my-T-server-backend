# Backend Modules Documentation - Batch 1

This document provides an exhaustive analysis of the `admin`, `announcement`, `auth`, `booking`, `contact`, and `dispatch` modules.

## 1. Admin Module
* **Purpose**: Centralized backend operations to empower back-office staff with the ability to monitor, manage, and configure the entire platform.
* **Responsibilities**: 
  - Admin authentication (login, token refresh, password reset).
  - Fetching platform-wide dashboard statistics and revenue trends.
  - Managing Users, Drivers, and Fleet Owners (including document verification, status toggling, and forced session logouts).
  - Managing Bookings (viewing, assigning drivers manually, system cancellations, manual refunds).
  - Finance operations (crediting wallets, tracking driver/fleet earnings, managing withdrawals, manual cash collections).
  - System configuration (Pricing Engine updates, Gamification badge management, Training courses).
  - ULIP Audit logs and system health monitoring.
* **Public Services**: 
  - `POST /api/v1/admin/auth/login`
  - `POST /api/v1/admin/auth/refresh`
  - `POST /api/v1/admin/auth/logout`
  - `POST /api/v1/admin/auth/forgot-password`
  - `POST /api/v1/admin/auth/reset-password`
* **Controllers**: `admin.controller.ts`, `gamification.admin.controller.ts`, `training.admin.controller.ts`, `workforce.admin.controller.ts` (mapped in `admin.router.ts`).
* **Repositories**: Uses Prisma client directly.
* **DTOs**: `LoginInput`, `ForgotPasswordInput`, `ResetPasswordInput`, `RefreshInput`, `BookingsQuery`, `UsersQuery`, `DriversQuery`, `FleetQuery`, `FinanceQuery`, `AssignDriverInput`, `CancelBookingInput`, `RefundInput`, `WalletCreditInput`, `DocStatusInput`, `DocVerifiedInput`, `PricingUpdateInput`, `AnnouncementInput`, etc. (defined in `admin.schema.ts`).
* **Entities**: `User`, `Driver`, `FleetOwner`, `Booking`, `Wallet`, `PricingConfig`, `SupportTicket`, `Announcement`.
* **Events**: Implicitly triggers events when delegating to other services (e.g., `cancelBookingBySystem` emits `booking.cancelled`).
* **Dependencies on other modules**: `booking`, `notifications`, `email`, `driver-wallet`, `marketplace`, `pricing`, `rewards`, `training`, `workforce`.
* **Database models used**: `User`, `RefreshToken`, `Driver`, `DriverDocument`, `FleetOwner`, `FleetTruck`, `Booking`, `Wallet`, `WalletTransaction`, `PricingAuditLog`, `SupportTicket`, `VerificationLog`.
* **Which module owns the business logic**: The `admin` module owns back-office specific logic (e.g., overriding verification statuses, manual wallet credits, stats aggregation). However, it delegates domain-specific logic to respective domain modules (e.g., booking cancellations are handed off to the `booking` service to preserve state machine constraints).

---

## 2. Announcement Module
* **Purpose**: To manage and retrieve system-wide announcements and broadcasts for users.
* **Responsibilities**: 
  - Creating new announcements with target audiences (e.g., specific roles).
  - Retrieving active announcements filtered by the current user's role and validity periods (start/end dates).
  - Triggering push notifications when an announcement is created.
* **Public Services**: None. All endpoints require authentication.
* **Controllers**: `announcement.controller.ts`
* **Repositories**: Uses Prisma client directly.
* **DTOs**: Implicit inputs in the controller/service (`title`, `body`, `imageUrl`, `startsAt`, `endsAt`, `target`).
* **Entities**: `Announcement`.
* **Events**: Emits `announcement.created` (which the notification service listens to in order to send FCM broadcasts).
* **Dependencies on other modules**: `eventbus` (for emitting creation events).
* **Database models used**: `Announcement`.
* **Which module owns the business logic**: The `announcement` module strictly owns the lifecycle of an announcement.

---

## 3. Auth Module
* **Purpose**: Manages user authentication, OTP delivery, token issuance, and session management.
* **Responsibilities**: 
  - Sending OTPs via Firebase Cloud Messaging (data-only pushes for reliability).
  - Supporting static OTPs for special demo/reviewer accounts.
  - Verifying OTPs (using a dual-write Redis + in-memory strategy for reliability).
  - Issuing JWT access/refresh token pairs.
  - Refreshing tokens and rotating them.
  - Logging out users by deleting refresh tokens.
  - Auto-provisioning profiles for demo accounts.
  - Fetching the current authenticated user's profile (`getMe`).
* **Public Services**: 
  - `POST /api/v1/auth/send-otp`
  - `POST /api/v1/auth/verify-otp`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
* **Controllers**: `auth.controller.ts`
* **Repositories**: Uses Prisma and Redis directly.
* **DTOs**: `SendOtpInput`, `VerifyOtpInput`, `RefreshInput`, `LogoutInput` (defined in `auth.schema.ts`).
* **Entities**: `User`, `Driver`, `FleetOwner`, `RefreshToken`.
* **Events**: Emits `user.registered` upon the first successful verification of a brand-new user.
* **Dependencies on other modules**: `redis` (for caching OTPs/FCM tokens temporarily), `firebase` (for dispatching OTP push notifications), `eventbus`.
* **Database models used**: `User`, `Driver`, `FleetOwner`, `RefreshToken`.
* **Which module owns the business logic**: The `auth` module owns the entirety of authentication logic.

---

## 4. Booking Module
* **Purpose**: The core state machine engine managing the lifecycle of a transportation booking.
* **Responsibilities**: 
  - Creating bookings (validates serviceability areas via Mapbox, estimates fares via the `pricing` service, handles booking number collisions).
  - Confirming bookings (transitions from DRAFT to CONFIRMED).
  - Cancelling bookings safely (respects state transition rules, handles automatic wallet refunds if applicable, cleans up driver/worker states, clears open bids).
  - Marking a driver as arriving and generating pickup OTPs.
  - Rating completed bookings.
  - Retrieving bookings for customers, drivers, fleet owners, and admins with strict visibility rules.
* **Public Services**: None. Booking operations require authentication.
* **Controllers**: `booking.controller.ts`
* **Repositories**: Uses Prisma client directly.
* **DTOs**: `CreateBookingInput`, `CancelBookingInput`, `RateBookingInput`, `ListBookingsQuery`, etc. (defined in `booking.schema.ts`).
* **Entities**: `Booking`, `BookingStop`, `PricingAuditLog`.
* **Events**: Emits `booking.confirmed`, `booking.cancelled`.
* **Dependencies on other modules**: `pricing`, `wallet`, `driver-wallet`, `maps` (serviceability), `marketplace`, `dispatch`, `notifications`, `rewards`.
* **Database models used**: `Booking`, `BookingStop`, `PricingAuditLog`, `Driver`, `JobAssignment`, `BidWindow`, `MarketplaceBid`, `BidAward`, `WalletTransaction`.
* **Which module owns the business logic**: The `booking` module absolutely owns the booking lifecycle, state transitions (via `assertTransition` in `booking.transition.ts`), and booking access control logic.

---

## 5. Contact Module
* **Purpose**: Handles "Contact Us" submissions from the front-end/web application.
* **Responsibilities**: 
  - Creating and storing incoming contact messages.
  - Retrieving contact messages (for admins).
  - Updating the resolution status of a contact message.
* **Public Services**: 
  - `POST /api/v1/contact` (Usually public to allow web form submissions).
* **Controllers**: `contact.controller.ts`
* **Repositories**: Uses Prisma client directly.
* **DTOs**: `CreateContactMessageSchema`, `UpdateContactMessageStatusSchema` (defined in `contact.schema.ts`).
* **Entities**: `WebContactMessage`.
* **Events**: None.
* **Dependencies on other modules**: None.
* **Database models used**: `WebContactMessage`.
* **Which module owns the business logic**: The `contact` module owns the simple CRUD logic for web contact inquiries.

---

## 6. Dispatch Module
* **Purpose**: The matching algorithm that determines which drivers and workers to alert when a booking is confirmed.
* **Responsibilities**: 
  - Processing `booking.confirmed` events.
  - Querying nearby available, verified drivers with matching vehicle types using geospatial Haversine calculations.
  - Ranking drivers by proximity and rating, and pushing FCM notifications simultaneously to top candidates.
  - Notifying Fleet Owners if they have suitable idle trucks nearby.
  - Handling driver declines and orchestrating re-dispatch rounds after delays.
  - Dispatching nearby manual workers (loaders/unloaders) if the booking requires labor, creating pending `JobAssignment` records.
* **Public Services**: None. Invoked entirely internally via background workers or events.
* **Controllers**: None. Relies on BullMQ workers (`dispatch.worker.ts`).
* **Repositories**: Uses Prisma client directly.
* **DTOs**: Internal types like `DispatchJobData`.
* **Entities**: `Driver`, `Worker`, `FleetOwner`, `JobAssignment`.
* **Events**: Listens to `booking.confirmed` implicitly (via queue processing).
* **Dependencies on other modules**: `notifications` (FCM and in-app), `booking` (to trigger auto-cancellations if no driver is found), `socket` (for pushing real-time worker alerts).
* **Database models used**: `Booking`, `Driver`, `FleetOwner`, `Worker`, `JobAssignment`.
* **Which module owns the business logic**: The `dispatch` module owns the algorithm for matching proximity-based resources (drivers/workers) to a new booking. (Note: The actual *acceptance* of a dispatch request is handled by the `booking` or `marketplace` modules).
