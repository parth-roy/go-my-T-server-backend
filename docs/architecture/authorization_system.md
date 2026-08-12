# Authorization System Architecture

This document details the authorization and access control mechanisms within the logistics backend.

## 1. User Roles

The system uses a strict role-based access control (RBAC) model driven by the `UserRole` Prisma enum. The defined roles are:

- **`CUSTOMER`**: End users who create bookings, request gig workers (loaders/unloaders), and interact with the marketplace to select bids.
- **`DRIVER`**: Individual driver-partners who execute bookings, update trip states, manage their wallets, and place bids on the marketplace.
- **`FLEET_OWNER`**: Business users managing multiple vehicles/drivers. They manage fleet wallets and participate in the marketplace on behalf of their fleet.
- **`ADMIN`**: Platform administrators who manage configurations, view analytics, reply to support tickets, and update system-wide variables (e.g., fuel prices, commission rates).
- **`WORKER`**: Laborers handling specific gig jobs (e.g., loading and unloading goods).

---

## 2. Authentication Middlewares

The authorization pipeline consists of three core middlewares found in `src/shared/middleware/auth.middleware.ts`:

### `authenticate`
- **Purpose**: Validates the JWT access token.
- **Behavior**: Expects an `Authorization: Bearer <token>` header. It decodes the JWT using the `JWT_ACCESS_SECRET` and populates the `req.user` object with `{ id, phone, role }`.
- **Errors**: Returns `401 Unauthorized` for missing, invalid, or expired tokens.

### `requireRole(...roles: UserRole[])`
- **Purpose**: Enforces RBAC on specific routes.
- **Behavior**: Must be chained after `authenticate`. It checks if `req.user.role` is included in the permitted `roles` array.
- **Errors**: Returns `403 Forbidden` if the user's role is not authorized.

### `optionalAuth`
- **Purpose**: Allows endpoints to act dynamically based on whether a user is logged in.
- **Behavior**: Attempts to verify the token if a `Bearer` header is present. If valid, populates `req.user`. If the header is missing or the token is invalid, it catches the error and safely proceeds to `next()` without setting `req.user`.

---

## 3. Permission Inheritance

**There is no permission inheritance or role hierarchy in this system.**

The backend relies on **explicit role array checking**. An `ADMIN` does not implicitly gain `CUSTOMER` or `DRIVER` privileges. If a route needs to be accessed by multiple roles, the router explicitly declares all allowed roles. 

*Example:*
```typescript
marketplaceRouter.get(
  '/bookings/:bookingId/bids',
  requireRole(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.FLEET_OWNER),
  controller.listBookingBids
);
```
Under the hood, the middleware evaluates `roles.includes(req.user.role)`. This strict, flat structure prevents privilege escalation and ensures clear boundaries between user contexts.

---

## 4. Ownership Validation

Merely having the correct role is not enough to mutate or view a resource; the system enforces strict **ownership validation** at the Service layer.

1. **Identity Extraction**: The `auth.middleware.ts` maps the JWT payload to `req.user.id`.
2. **Context Passing**: Controllers immediately pass `req.user.id` and `req.user.role` into the Service layer.
3. **Database Lookups & Conditionals**: 
   - **For Queries (Listings):** The `userId` is injected directly into the Prisma `where` clause to scope the results.
     ```typescript
     if (role === UserRole.CUSTOMER) {
         where.customerId = userId;
     } else if (role === UserRole.DRIVER) {
         const driver = await prisma.driver.findUnique({ where: { userId } });
         where.driverId = driver.id;
     }
     ```
   - **For Mutations / Lookups:** The service retrieves the resource and explicitly compares the relational foreign keys against the requesting user.
     ```typescript
     if (role === UserRole.CUSTOMER && booking.customerId !== userId) {
         throw AppError.forbidden('You do not have access to this booking');
     }
     ```

---

## 5. Permission Matrix

The following matrix maps primary API domains and endpoints to the roles that are permitted to access them.

| Resource / Endpoint Group | `CUSTOMER` | `DRIVER` | `FLEET_OWNER` | `WORKER` | `ADMIN` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Auth & Profile** | | | | | |
| `GET /auth/me` (Profile) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bookings** | | | | | |
| Create Booking | ✅ | ❌ | ❌ | ❌ | ❌ |
| List Bookings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancel Booking | ✅ | ✅ | ❌ | ❌ | ❌ |
| Driver Actions (Arrive, PickUp, Complete) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Get Invoice | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Marketplace (Bidding)** | | | | | |
| List Opportunities | ❌ | ✅ | ✅ | ❌ | ❌ |
| Place / Withdraw Bid | ❌ | ✅ | ✅ | ❌ | ❌ |
| View Bid Thread / Messages | ✅ | ✅ | ✅ | ❌ | ❌ |
| Revise Bid / Chat | ✅ | ✅ | ✅ | ❌ | ❌ |
| Accept / Reject Bid (Award) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Gigs (Labor)** | | | | | |
| Create / List Own Gigs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Find Nearby Gigs | ❌ | ❌ | ❌ | ✅ | ❌ |
| Accept Gig | ❌ | ❌ | ❌ | ✅ | ❌ |
| View All Gigs | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Wallets & Earnings** | | | | | |
| Driver Wallet / Withdrawals | ❌ | ✅ | ❌ | ❌ | ❌ |
| Fleet Wallet | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Fleet Management** | | | | | |
| Manage Fleet Profile / Drivers | ❌ | ❌ | ✅ | ❌ | ❌ |
| Driver Join Fleet | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Admin Operations** | | | | | |
| Configs, Pricing, Fuel Rates | ❌ | ❌ | ❌ | ❌ | ✅ |
| Support Tickets (Reply) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Leads & Admin Analytics | ❌ | ❌ | ❌ | ❌ | ✅ |
