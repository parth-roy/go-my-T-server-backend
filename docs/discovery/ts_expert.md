# TypeScript Expert Discovery Report: Organizations & Workforce

## 🔍 Scope of Analysis
- **Target Directories:** `src/shared/` (Middlewares, Types, Utils, Background Workers, Sockets, Eventbus)
- **Global Type Definitions:** `prisma/schema.prisma` (Source of truth for generated TS types/enums) & `src/shared/types/express.d.ts`.
- **Search Domains:** Organization, Company, Enterprise, Contractor, Vendor, Branch, Department, Team, Project, Shift, Worker, Ownership, Membership, Role, Permission, Invitation, Collaboration, Employment, Verification.

---

## 1. Concept Discoveries

### 🏢 Organization / Enterprise / Company
- **Exists:** Partially Implemented.
- **Location:** `prisma/schema.prisma`, `src/shared/middleware/auth.middleware.ts`
- **Details:** 
  - There is no standalone `Organization` or `Company` table. 
  - Instead, the concept is represented by the `UserRole.ENTERPRISE` enum.
  - Both `FleetOwner` and `User` models contain a loose `companyName (String?)` field.
  - A pseudo-organizational structure exists via the `TeamMember` model, which links users to an `ownerId` under an `EnterpriseTeamMembers` relation.
- **Production Readiness:** Basic data representation exists, but lacks deep organizational hierarchy types (Branch, Department).

### 👥 Team / Membership / Role / Ownership
- **Exists:** Yes.
- **Location:** `prisma/schema.prisma`, `src/shared/middleware/auth.middleware.ts`, `src/shared/types/express.d.ts`
- **Details:**
  - **Ownership:** Modeled via `ownerId` in the `TeamMember` model.
  - **Membership:** Exists conceptually as `TeamMember` and via the `fleetMemberships` relation for `FleetDriver`.
  - **Role:** Highly utilized. Prisma defines a global `UserRole` enum (`WORKER`, `CUSTOMER`, `FLEET_OWNER`, `ENTERPRISE`, `ADMIN`).
  - **Middleware:** `src/shared/middleware/auth.middleware.ts` uses `requireRole(...roles: UserRole[])` for endpoint authorization.
- **Production Readiness:** Roles are production-ready. However, `TeamMember.role` is typed as a loose `String @default("VIEWER")` rather than a strictly enforced Prisma Enum.

### 👷 Worker / Workforce
- **Exists:** Yes (Extensively).
- **Location:** `prisma/schema.prisma`, `src/shared/socket/socket.instance.ts`
- **Details:**
  - Dedicated `Worker` model tracking capacity, gamification, and skills.
  - Sockets: `emitToWorkerRoom(workerId, event, data)` in `socket.instance.ts` handles private, targeted push events directly to workers.
- **Enums:** `WorkerStatus`, `WorkerJobStatus`, `WorkerWalletReason`.
- **Production Readiness:** Fully implemented and integrated with realtime socket gateways.

### ✅ Verification
- **Exists:** Yes.
- **Location:** `src/shared/queue/workers/ulip.worker.ts`, `prisma/schema.prisma`
- **Details:**
  - Extensive queue-based verification for drivers and vehicles (SARATHI, VAHAN, FASTAG, ECHALLAN).
  - Background processes update the `VerificationLog` model and push WebSocket updates to drivers.
- **Enums:** `UlipVerifStatus` (VERIFIED, FAILED, MANUAL_REVIEW).
- **Production Readiness:** High. Robust async architecture using BullMQ to handle government API flakiness.

### ❌ Missing Concepts
The following concepts **DO NOT** exist in the shared codebase or global types:
- **Contractor, Vendor, Branch, Department, Project, Collaboration, Employment.**
- **Shift:** Appears only in notification bodies and usage type strings (e.g., "House Shifting Usage"), not as an organizational data structure.
- **Invitation:** Referenced vaguely in service notifications (`"Fleet Invitation"`), but lacks dedicated shared interfaces or schema types.

---

## 2. Tech Debt, TODOs, & Anomalies

### 🚩 Type/Enum Misalignments & Duplicate Types
1. **Express Request Type vs Prisma Enum:**
   - In `src/shared/types/express.d.ts`, `Request.user.role` is typed as `string`.
   - In `src/shared/middleware/auth.middleware.ts`, the `JwtPayload` correctly types `role` as the `UserRole` enum.
   - **Impact:** This discrepancy circumvents TypeScript's enum safety in controllers checking `req.user.role`.

2. **Loose String Typing for Team Roles:**
   - As noted, `TeamMember.role` in `schema.prisma` is a raw `String`. It lacks a defined enum (e.g., `TeamRole { ADMIN, MANAGER, VIEWER }`), which is a missed opportunity for strict type safety.

### 🛠️ TODOs & Mock Logic
- **`src/shared/queue/workers/otp.worker.ts`:**
  - Contains a direct TODO: `// TODO Phase 3b: Replace this with real MSG91 call`
  - Currently executes **Mock Logic** via `console.log` (`[MSG91-STUB] Sending OTP...`).

### 🤐 Commented Features & Suppressed Errors
- **`src/shared/middleware/auth.middleware.ts`:**
  - The `optionalAuth` middleware contains an empty catch block with a comment: `// Invalid token — continue without user (optional auth)`. While functionally intentional, it silently swallows potential JWT parsing errors.

### 🗑️ Unused / Dead Code
- No drastically unused interfaces were found in `src/shared`. The event bus (`AppEvents`) and queue interfaces (`UlipJobData`) are actively consumed by their respective systems.
