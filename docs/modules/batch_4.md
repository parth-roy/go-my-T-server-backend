# Backend Modules Documentation - Batch 4

This document provides exhaustive analysis for the following backend modules: `rewards`, `subscription`, `support`, `tracking`, `training`, and `ulip`.

## 1. Rewards Module

- **Purpose:** Manages user coin balances, loyalty tiers, and scratch card rewards within the application.
- **Responsibilities:** 
  - Retrieve current coin balances and loyalty tiers for users.
  - Provide a paginated history of coin transactions.
  - Fetch available scratch cards for a user.
  - Automatically generate scratch cards post-booking (with randomized win probability and reward values based on fare).
  - Handle the action of scratching a card and crediting the won coins to the user's coin balance.
- **Public Services:**
  - `getCoinBalance(userId)`: Gets current balance, current tier, next tier, and 5 recent transactions.
  - `getCoinHistory(userId, page, limit)`: Paginated list of coin transactions.
  - `getScratchCards(userId)`: List of all scratch cards for the user.
  - `generateScratchCard(userId, bookingId, fareAmount)`: Logic to calculate and create a new scratch card.
  - `scratchCard(userId, cardId)`: Marks a card as scratched, processes the reward, and credits coins if applicable.
- **Controllers:** 
  - `getCoinBalance`: GET `/me`
  - `getCoinHistory`: GET `/history`
  - `getScratchCards`: GET `/scratch-cards`
  - `scratchCard`: POST `/scratch-cards/:cardId/scratch`
- **Repositories:** Uses direct Prisma ORM calls within the service file.
- **DTOs:** Implicit via Express Request/Response objects and URL params/query strings. No dedicated Zod schema file.
- **Entities/Models Used:** 
  - `CoinBalance`: Tracks the user's total coin balance.
  - `CoinTransaction`: Logs individual coin earning/spending events.
  - `ScratchCard`: Represents a single scratch card.
  - Enums: `CoinTransactionType`, `ScratchCardStatus`, `RewardType`.
- **Events:** Emits `rewards.scratch_card_ready` via the application event bus when a new scratch card is generated.
- **Dependencies:** `@shared/db/prisma`, `@shared/errors/AppError`, `@shared/logger`, `@shared/eventbus`, `@shared/utils/response`, `@shared/middleware/auth.middleware`.
- **Business Logic Owner:** `rewards.service.ts`

---

## 2. Subscription Module

- **Purpose:** Manages driver subscription plans (e.g., Basic, Standard, Pro, Premium) and associated payments.
- **Responsibilities:** 
  - Allow drivers to select, purchase, or upgrade their subscription plans.
  - Calculate subscription validity (typically 30 days).
  - Retrieve current active subscription details for a driver.
  - Act as a placeholder for full Razorpay integration (Phase 1 supports mock payment; Phase 2 uses Razorpay reference).
- **Public Services:**
  - `selectPlan(userId, plan, paymentReference?)`: Creates or updates a driver's subscription plan, setting validity dates and payment method.
  - `getSubscription(userId)`: Retrieves the currently active subscription for a specific driver.
- **Controllers:** Implemented as inline route handlers inside `subscription.router.ts`:
  - GET `/` - Retrieve current subscription.
  - POST `/select` - Select or upgrade a subscription plan.
- **Repositories:** Uses direct Prisma ORM calls within the service file.
- **DTOs:** 
  - `selectPlanSchema` (Zod): Validates the incoming request for selecting a plan (requires `plan` enum, optional `paymentReference`).
- **Entities/Models Used:** 
  - `Driver`: Parent entity containing the subscription.
  - `DriverSubscription`: Stores subscription details (plan type, price, start date, end date, status, payment method).
- **Events:** None explicitly defined. Logs activity via the logger.
- **Dependencies:** `@shared/db/prisma`, `@shared/errors/AppError`, `@shared/logger`, `@shared/utils/response`, `@shared/middleware/auth.middleware`, `@shared/middleware/validate`, `zod`.
- **Business Logic Owner:** `subscription.service.ts`

---

## 3. Support Module

- **Purpose:** Provides a helpdesk and ticketing system for users to report issues and communicate with support staff.
- **Responsibilities:** 
  - Create new support tickets with an initial message.
  - Retrieve a list of support tickets for the authenticated user, including the most recent message preview.
  - Retrieve full conversation details for a specific ticket.
  - Add new messages to an open ticket (supports attachments).
- **Public Services:**
  - `createTicket(userId, data)`: Initializes a ticket and the first message.
  - `getTickets(userId)`: Fetches all tickets belonging to a user.
  - `getTicketDetails(ticketId, userId)`: Fetches a single ticket and all its messages.
  - `addMessage(ticketId, userId, data)`: Appends a message to an open ticket.
- **Controllers:**
  - `createTicket`: POST `/`
  - `getTickets`: GET `/`
  - `getTicketDetails`: GET `/:id`
  - `addMessage`: POST `/:id/messages`
- **Repositories:** Uses direct Prisma ORM calls within the service file.
- **DTOs:** Located in `support.schema.ts`:
  - `createTicketSchema` (Zod): validates `subject`, `bookingId` (optional), and `initialMessage`.
  - `addMessageSchema` (Zod): validates `content` and `attachmentUrl` (optional).
- **Entities/Models Used:** 
  - `SupportTicket`: The main ticket entity.
  - `SupportMessage`: Individual messages attached to a ticket.
  - Enum: `SupportTicketStatus` (e.g., CLOSED).
- **Events:** None explicitly defined in the service.
- **Dependencies:** `@shared/db/prisma`, `@shared/errors/AppError`, `@shared/utils/response`, `@shared/middleware/auth.middleware`, `@shared/middleware/validate`, `zod`.
- **Business Logic Owner:** `support.service.ts`

---

## 4. Tracking Module

- **Purpose:** Manages real-time vehicle and driver location tracking using WebSockets, and integrates with the ETA calculation worker.
- **Responsibilities:** 
  - Authenticate WebSocket connections via JWT.
  - Assign drivers to personal socket rooms for targeted updates (e.g., ULIP results).
  - Manage subscription to live booking tracking rooms (`booking_{id}`).
  - Receive, validate, and authorize GPS location updates from drivers.
  - Broadcast live locations instantly to booking subscribers.
  - Store high-frequency locations in Redis (used by ETA worker).
  - Persist historical tracking data into the database asynchronously.
  - Snapshot the driver's current position to the database every 30 seconds to prevent DB overload.
  - Intelligently trigger immediate ETA recalculations if a driver deviates significantly from their route.
- **Public Services:** Exposed exclusively via Socket.IO events on the `/tracking` namespace.
  - `subscribe_booking`: Join room for a booking.
  - `unsubscribe_booking`: Leave room for a booking.
  - `driver_location_update`: Receive and process location updates.
- **Controllers:** Logic is entirely handled by socket event listeners within `tracking.gateway.ts`.
- **Repositories:** Direct usage of Prisma ORM (Database) and Redis (Caching).
- **DTOs:** Typing is handled inline within the socket event handlers (e.g., `data: { bookingId: string; lat: number; lng: number; speedKmh?: number; ... }`).
- **Entities/Models Used:** 
  - `Booking`: Fetches driver assignments, trip phases, and last ETA positions.
  - `Driver`: Authenticates updates and stores snapshot `currentLat`/`currentLng`.
  - `BookingLocationHistory`: Stores granular historical GPS pings.
- **Events:** 
  - Socket emissions: `location_updated` to booking rooms.
  - Job queue integration: Calls `triggerImmediateETA` to spawn an ETA recalculation worker job.
- **Dependencies:** `socket.io`, `jsonwebtoken`, `@shared/db/prisma`, `@config/redis`, `@shared/logger`, `@config/env`, `@shared/jobs/eta.worker`.
- **Business Logic Owner:** `tracking.gateway.ts`

---

## 5. Training Module

- **Purpose:** Provides a platform for administering and tracking training courses and modules for the workforce.
- **Responsibilities:** 
  - **Admin operations:** Create, update, delete training courses, and view global statistics (total courses, completions, top completed).
  - **Workforce operations:** Fetch available courses, view personal progress, and update module completion status.
  - Automatically simulate/issue certificates upon course completion.
- **Public Services:**
  - `getAdminCourses()`: Returns all courses with completion counts.
  - `getAdminStats()`: Returns global metrics on courses and completions.
  - `createCourse(data)`: Adds a new course.
  - `updateCourse(id, data)`: Modifies an existing course.
  - `deleteCourse(id)`: Soft-deletes a course (marks inactive).
  - `getWorkforceCourses(workerId)`: Returns courses mapped with the worker's specific progress.
  - `updateProgress(workerId, courseId)`: Increments completed modules, updates status to IN_PROGRESS or COMPLETED, and assigns a fake certificate URL if completed.
- **Controllers:** 
  - `TrainingAdminController`: handles admin routes (`getCourses`, `getStats`, `createCourse`, `updateCourse`, `deleteCourse`).
  - `TrainingWorkforceController`: handles worker routes (`getCourses`, `updateProgress`).
- **Repositories:** Uses direct Prisma ORM calls within the service file.
- **DTOs:** Typed arguments in service methods. Does not use Zod validation schemas explicitly in a dedicated file.
- **Entities/Models Used:** 
  - `TrainingCourse`: Represents a course.
  - `WorkerTrainingProgress`: Represents a worker's progression through a course.
  - Enums: `CourseLevel`, `CourseStatus`.
- **Events:** None.
- **Dependencies:** `@shared/db/prisma`.
- **Business Logic Owner:** `training.service.ts`

---

## 6. ULIP Module

- **Purpose:** Integrates with India's Unified Logistics Interface Platform (ULIP) to verify driver credentials (SARATHI), vehicle details (VAHAN, FASTAG, E-CHALLAN), and perform KYC via DIGILOCKER (Aadhaar & PAN).
- **Responsibilities:** 
  - Enqueue asynchronous background verification jobs for Sarathi (DL), Vahan (RC), Fastag, and E-Challan using BullMQ.
  - Provide a complex, synchronous, multi-step PKCE-based OAuth flow for Digilocker KYC integration:
    - Step 01: Initiate session with demographic data.
    - Step 02: Verify OTP (for new users).
    - Step 03: Exchange Code for Access Token (internal).
    - Step 04 & 05: Fetch PAN PDF and Aadhaar XML data using the token.
  - Support manual document upload fallback if the Digilocker API is unreachable or fails.
  - Centralize ULIP token retrieval, caching, and renewal (delegated to `ulipAuth.service`).
  - Parse and store government documents (e.g., base64 PDFs and JPEGs) directly in the database (or prepare them for S3 upload).
- **Public Services:**
  - *Async:* `verifySarathi`, `verifyVahan`, `verifyFastag`, `verifyEchallan`.
  - *Digilocker:* `initDigilockerSession`, `verifyDigilockerOtp`, `exchangeDigilockerToken`, `fetchDigilockerPan`, `fetchDigilockerAadhaar`.
- **Controllers:** `ulip.controller.ts` maps API requests to either background queue dispatches or synchronous service calls.
  - Routes include `/verify-dl`, `/verify-rc`, `/verify-fastag`, `/verify-echallan`, `/digilocker/init`, `/digilocker/verify-otp`, `/digilocker/fetch-docs`, `/digilocker/manual-upload`, `/digilocker/status`, `/digilocker/document/:type`.
- **Repositories:** Direct Prisma ORM calls within the controller and service files.
- **DTOs:** Validated using Zod in `ulip.schema.ts`:
  - `verifyDlSchema`, `verifyRcSchema`, `verifyFastagSchema`, `verifyEchallanSchema`.
  - `digilockerInitSchema`, `digilockerVerifyOtpSchema`, `digilockerFetchDocsSchema`, `manualKycUploadSchema`.
- **Entities/Models Used:** 
  - `Driver`, `Vehicle`, `Worker`.
  - Enums: `UlipVerifStatus` (PENDING, VERIFIED, etc.), `DigiKycStatus`.
- **Events/Queues:** 
  - Heavily relies on `ulipVerificationQueue` (BullMQ) for dispatching `sarathi-verify`, `vahan-verify`, `fastag-verify`, and `echallan-verify` jobs.
  - The worker processes (outside this module) emit `ulip_verification_result` Socket.IO events when completed.
- **Dependencies:** `axios`, `https`, `@shared/db/prisma`, `@config/env`, `@shared/logger`, `@shared/errors/AppError`, `@shared/queue`, `@shared/utils/response`, `zod`, `@modules/fleet/ulipAuth.service`.
- **Business Logic Owner:** 
  - `ulip.controller.ts` handles request orchestration, status updates, and queue dispatching.
  - `ulip.service.ts` owns the pure external API communication logic, request retries, timeout management, mock environments, and XML/response parsing.
