# TIME-011 FLUTTER CONTRACT READINESS AUDIT

**Date:** 2026-08-11
**Module:** TIME-011 (Performance Engine)
**Status:** FRONTEND AUDIT COMPLETE

---

## 1. Executive Summary
The backend `TIME-011` module has successfully undergone a Global Worker remediation and exposes a robust, domain-driven API under `/api/v1/performance`. However, the Workforce Flutter application is currently **disconnected** from this engine. The existing `PerformanceScreen` relies entirely on hardcoded mockup widgets, except for one top-level score widget that hits a legacy aggregation endpoint (`/api/v1/workforce/performance/metrics`). The Flutter app possesses zero data models, API definitions, or state providers for the new TIME-011 infrastructure. 

## 2. Backend Contract Inventory
The remediated backend exposes the following endpoints (defined in `PerformanceRoutes.ts`):
- `POST /api/v1/performance/workers/:workerId/cycles`
- `GET /api/v1/performance/workers/:workerId/cycles`
- `GET /api/v1/performance/workers/:workerId/cycles/:cycleId`
- `POST /api/v1/performance/workers/:workerId/objectives`
- `POST /api/v1/performance/workers/:workerId/objectives/:objectiveId/key-results`
- `POST /api/v1/performance/workers/:workerId/objectives/:objectiveId/key-results/:keyResultId/progress`
- `GET /api/v1/performance/workers/:workerId/cycles/:cycleId/objectives`
- `POST /api/v1/performance/workers/:workerId/evaluations`
- `GET /api/v1/performance/workers/:workerId/dashboard`
- `GET /api/v1/performance/workers/:workerId/cycles/:cycleId/adherence`

## 3. Flutter TIME-011 Screen Inventory
Classification Key: C (Existing UI, disconnected from backend); D (Backend exists, UI does not).

- `PerformanceScreen`: **Class C** (Static shell, hardcoded tabs).
- `PerformanceHeroCard`: **Class A/B** (Connected, but to legacy `/workforce/performance/metrics`).
- `PerformanceSummaryGrid`: **Class C** (Hardcoded metrics).
- `RatingBreakdownCard`: **Class C** (Hardcoded UI).
- `PerformanceTrendChart`: **Class C** (Hardcoded chart plot points `[3.8, 3.4, 4.3...]`).
- `ImprovementTipsList`: **Class C** (Hardcoded tips).
- Cycles, Objectives, OKRs, Detailed Adherence Views: **Class D** (Not implemented).

## 4. Endpoint-to-Screen Mapping
| Screen / Widget | Current Endpoint | Target TIME-011 Endpoint |
| :--- | :--- | :--- |
| `PerformanceHeroCard` | `/workforce/performance/metrics` | N/A (Keep or migrate to `/dashboard`) |
| `PerformanceScreen` (Overview) | NONE | `/api/v1/performance/workers/:workerId/dashboard` |
| `PerformanceTrendChart` | NONE | `/api/v1/performance/workers/:workerId/cycles` |
| Deep OKR Views | NONE | `/api/v1/performance/workers/:workerId/cycles/:cycleId/objectives` |

## 5. Request/Response Contract Matrix
*(Matrix represents the delta between what exists and what is needed)*

| Target Endpoint | Auth | Input | Worker Identity | Required Flutter Model (To be built) |
| :--- | :--- | :--- | :--- | :--- |
| `GET /workers/:workerId/dashboard` | JWT | `workerId` path param | Path variable | `WorkerPerformanceDashboardModel` |
| `GET /workers/:workerId/cycles` | JWT | `workerId` path param | Path variable | `List<WorkerPerformanceCycleModel>` |
| `GET /workers/:workerId/cycles/:cycleId/objectives` | JWT | `workerId`, `cycleId` | Path variable | `List<ObjectiveModel>` |
| `POST /.../key-results/:id/progress` | JWT | `currentValue` JSON | Path variable | `ProgressUpdateResponseModel` |

## 6. Worker Identity Flow
**Current state:** The app relies on `/workforce/performance/metrics` which extracts identity strictly from the backend JWT (`req.user.id`).
**Target state:** The new TIME-011 API routes require `:workerId` in the path (e.g., `/api/v1/performance/workers/:workerId/dashboard`). 
**Rule adherence:** No `organizationId` or `membershipId` is requested, enforced, or expected by the API. Flutter will simply inject the authenticated user's ID into the URL path, strictly preserving the Global Worker constraint. 

## 7. Backend ↔ Flutter Mismatches
1. **Endpoint Disconnect:** Flutter is looking for a flattened metrics aggregate; the backend expects domain-driven API calls to fetch structured Dashboards, Cycles, and OKRs.
2. **Missing State:** Flutter has zero Riverpod providers mapped to the `TIME-011` lifecycle.
3. **Missing Models:** No Dart data classes exist to parse `WorkerPerformanceCycle`, `Objective`, `KeyResult`, or `AdherenceSnapshot`.

## 8. Missing Backend Contracts
- **None.** The backend API is complete and enforces the canonical Global Worker matrix.

## 9. Missing Flutter Contracts
- Add `api_endpoints.dart` string constants for `/api/v1/performance/*`.
- Create data classes (`lib/features/performance/data/models/...`).
- Create network repositories (`lib/features/performance/data/repositories/...`).
- Create Riverpod providers (`lib/features/performance/providers/...`).

## 10. Error/Loading/Empty State Requirements
- **Loading:** Shimmer loaders must be added over the Hero Card, Charts, and OKR lists while awaiting `dashboardProvider` yields.
- **Empty States:** The UI must handle "No Active Performance Cycle" smoothly instead of crashing or showing a 0/5 rating.
- **Error States:** 403 Forbidden (handled silently or via toast if an unexpected role switch occurs), 404 Not Found (when querying a non-existent cycle).

## 11. UI/UX Readiness Matrix

| Feature | Backend Ready | API Contract Ready | Flutter Existing | UI/UX Ready |
| :--- | :--- | :--- | :--- | :--- |
| Performance Dashboard | YES (TIME-011) | YES | Mocked/Legacy | NO |
| Current Cycle | YES | YES | NO | NO |
| Objectives / KRs | YES | YES | NO | NO |
| Evaluation / Rating | YES | YES | Mocked | NO |
| Adherence | YES | YES | NO | NO |

## 12. Files That Would Need Modification Later (Implementation Phase)
- `lib/core/api/api_endpoints.dart`
- `lib/features/performance/presentation/performance_screen.dart`
- `lib/features/performance/presentation/widgets/performance_trend_chart.dart`
- `lib/features/performance/presentation/widgets/performance_summary_grid.dart`
- New files under `lib/features/performance/data/` and `lib/features/performance/providers/`.

## 13. Files That Must NOT Be Modified During This Audit
- Any `.ts` file on the backend.
- Any `.dart` file on the frontend.
- `prisma/schema.prisma`

## 14. Known Unknowns
- How the legacy `/workforce/performance/metrics` (which tracks simple job completion rates) visually reconciles with the deeply structured `TIME-011` adherence and scoring formulas. The UI design phase will need to integrate these or deprecate the legacy widget.

## 15. Final GO/NO-GO

### CONDITIONAL GO
The UI/UX implementation phase can start immediately, but with a strict condition: **Flutter architectural scaffolding must occur first.** Because Flutter possesses no data models, providers, or API bindings for the TIME-011 domain, developers must begin by mapping the backend JSON responses into Dart models and wiring Riverpod before touching any pixels. The backend is 100% stable, secure, and ready to consume.
