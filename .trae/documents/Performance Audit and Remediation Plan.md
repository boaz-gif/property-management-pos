# Performance Audit and Remediation Plan

## Objective

Reduce median user-action-to-visual-feedback time to **<200 ms** and eliminate runaway backend request chains, while preserving all existing external API contracts and user-visible URLs, and shipping changes incrementally behind feature flags with rollback possible within one minute.

## Success Metrics (Gates)

- Lighthouse Performance score **≥ 90** for key flows (logged-in dashboard, property list, tenant list, payments, chat).
- Median user-action-to-visual-feedback **< 200 ms** for common actions (navigation, table filtering, opening detail panels, submit forms).
- Stable **60 fps** during navigation actions (no long frames > 50 ms in typical interactions on target hardware).
- Backend CPU usage per user session **-70%** (measured with consistent synthetic workload and production-like data).
- No HTTP request cascade exceeds **3 sequential calls** per user action (trace-proven).
- **Zero** browser console warnings in CI and in manual smoke.
- **100% unit-test coverage on every touched file** (enforced by an automated “touched files coverage gate”).

## Current Observability Anchors (Existing Code)

- Frontend entry + web vitals: [index.js](file:///c:/Users/HP/property-management-pos/src/index.js), [reportWebVitals.js](file:///c:/Users/HP/property-management-pos/src/reportWebVitals.js)
- Frontend routing: [App.js](file:///c:/Users/HP/property-management-pos/src/App.js)
- Frontend data layer: [api.js](file:///c:/Users/HP/property-management-pos/src/services/api.js), [query-client.js](file:///c:/Users/HP/property-management-pos/src/services/query-client.js)
- Backend server: [server.js](file:///c:/Users/HP/property-management-pos/backend/server.js), [server-production.js](file:///c:/Users/HP/property-management-pos/backend/server-production.js)
- Backend performance monitor: [performance-monitor.js](file:///c:/Users/HP/property-management-pos/backend/src/utils/performance-monitor.js)
- Backend monitoring endpoints: [monitoring-routes.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/monitoring-routes.js)

## Deliverables

- Instrumentation layer (frontend + backend) with request correlation IDs, timing spans, render-cycle logging, and repeatable capture scripts.
- Structured findings report with ranked issues and measured before/after metrics.
- Phased remediation implementation behind feature flags.
- Automated test suites per phase, including unit tests and regression gates (performance, cascade depth, console warnings, touched-file coverage).
- File-structure refactor that makes feature modules discoverable in <30 seconds for a new developer.

## Feature Flag Strategy (Rollback in < 1 Minute)

- Centralized feature flag module with sources:
  - Frontend: build-time env + runtime localStorage override for QA.
  - Backend: env vars (and optionally DB-driven flags later) with safe defaults.
- Every remediation that changes behavior (caching, batching, prefetching, rendering strategy, request consolidation) ships behind a named flag.
- Rollback path:
  - Frontend: disable flag(s) without changing URLs or route structure.
  - Backend: disable flag(s) via env/config and restart (or hot reload if supported).

## Diagnostic Baseline (Phase 1)

### A. Frontend Instrumentation (Precise Timing + Render Diagnostics)

Add instrumentation that can be enabled in:
- Development: always on (but not noisy).
- Production: enabled only when a diagnostic flag is set.

Planned instrumentation capabilities:
- **User-action markers:** wrap key interactions (navigation, button clicks, form submit) with `performance.mark()` and `performance.measure()`.
- **Request tracing:** attach `X-Trace-Id` (and optionally `X-Request-Id`) header from the frontend for every HTTP call, propagated across retries.
- **Render-cycle logging:** React Profiler integration (per-route and per-heavy-component), emitting:
  - commit duration
  - render reason (props/state/context) where feasible
  - count of re-renders per interaction
- **Console warnings gate:** treat console.warn/error as test failures in CI (scoped and allowlisted where needed).

Primary integration points:
- Axios interceptors in [api.js](file:///c:/Users/HP/property-management-pos/src/services/api.js)
- React Query defaults and query observers in [query-client.js](file:///c:/Users/HP/property-management-pos/src/services/query-client.js)
- App route boundaries in [App.js](file:///c:/Users/HP/property-management-pos/src/App.js)
- Web vitals bridge in [reportWebVitals.js](file:///c:/Users/HP/property-management-pos/src/reportWebVitals.js)

### B. Backend Instrumentation (Request Tracing + Span Timing)

Leverage and extend the existing backend monitor framework:
- Ensure **every request** has a trace ID (accept inbound `X-Trace-Id`, generate if missing).
- Log and attach trace IDs to:
  - response headers
  - request logs (morgan/custom logger)
  - performance monitor samples
- Track per-request spans:
  - middleware chain time
  - route handler time
  - DB query time/count (detect N+1 patterns)
  - cache hits/misses where Redis is used
- Provide trace-based cascade detection:
  - infer “action root” spans from `X-Action-Id` emitted by frontend
  - count sequential calls and dependency chains within the same action

Primary integration points:
- Express middleware order in [server.js](file:///c:/Users/HP/property-management-pos/backend/server.js)
- Existing request tracking hooks in [performance-monitor.js](file:///c:/Users/HP/property-management-pos/backend/src/utils/performance-monitor.js)
- Monitoring endpoints in [monitoring-routes.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/monitoring-routes.js)

### C. Baseline Capture and Repeatability

Baseline data to capture before remediation:
- Frontend:
  - Lighthouse (Performance + key audits)
  - route-level commit durations (Profiler summary)
  - action-to-first-feedback timing distribution (median/p95)
  - bundle size + chunk graph
  - console warnings count
- Backend:
  - p50/p95/p99 latency per route
  - slow query samples + query count per request
  - CPU time approximations per route under synthetic load
  - cascade depth per user action

Repeatability requirements:
- A single command to run “diagnostic baseline” (dev and CI variants).
- Fixed seed data generator or fixture dataset for stable measurements.

## Findings Report Format (Produced After Phase 1)

For each issue discovered:
- **ID / Title**
- **Location** (file/module/route)
- **Symptom** (what the user experiences)
- **Evidence** (trace IDs, timings, profiler commits, network waterfalls)
- **Measured impact** (before metrics: median/p95, fps, CPU, request count)
- **Root cause** (why it happens, which triggers it)
- **Fix plan** (minimal change first, then structural if needed)
- **Feature flag** (name + default state)
- **Verification** (tests + metrics to rerun)
- **After metrics** (post-change measurements)
- **Impact ranking** on:
  - time-to-interactive
  - user-action-to-feedback
  - server load

## Phased Remediation Roadmap

### Phase 1: Diagnostic (No Behavior Change)

Scope:
- Add tracing/timing hooks and report generation without changing user-visible behavior.
- Build the automated gates that future phases must pass.

Exit criteria:
- Structured findings report completed.
- Baseline numbers captured for key flows.
- Automated test suite passes (see “Phase Gates”).

Phase gate test suite:
- Frontend unit tests (CRA/Jest).
- Backend unit/integration tests (Jest/Supertest).
- Console warnings gate.
- Touched-file coverage gate (infrastructure added now, enforced for subsequent phases).

### Phase 2: Quick Wins (High Impact, Low Risk)

Focus areas:
- **Request cascade reduction**
  - de-duplicate concurrent requests (React Query queryKey normalization, shared queries)
  - stop accidental refetch loops (enabled flags, staleTime, refetchOnWindowFocus defaults)
  - collapse sequential calls via backend aggregation endpoints only when contracts allow, otherwise add opt-in “include” parameters behind flags
- **Immediate visual feedback**
  - eliminate non-functional UI actions by disabling/hiding or adding immediate “in progress / coming soon” feedback
  - ensure every async action shows loading state within 100 ms
- **Re-render reduction**
  - stabilize context providers and memoize expensive trees
  - split large components; convert derived computations to memoized selectors
- **Backend hotspots**
  - fix obvious N+1 query paths (batching, joins, prefetch)
  - add caching for safe, read-heavy endpoints (Redis with explicit TTLs) behind flags

Exit criteria:
- Median user-action-to-feedback improved vs baseline on at least the top 5 flows.
- No cascade exceeds 3 sequential calls in those flows.
- No regressions in error rate or feature behavior (test + smoke).

Phase gate test suite:
- Phase 1 suite, plus:
  - cascade depth regression check from trace logs
  - performance budget smoke (action-to-feedback median budget on synthetic runs)

### Phase 3: Structural (Maintainability + Predictable Performance)

Scope:
- Refactor file structure to feature modules without changing URLs or API contracts.
- Standardize data access and state boundaries to prevent future cascade and re-render issues.

Frontend structure target:
- `src/features/<feature>/{pages,components,hooks,api,tests}` with a small `src/shared` for cross-cutting primitives.
- Routes remain defined in [App.js](file:///c:/Users/HP/property-management-pos/src/App.js) but pages import from feature modules.
- A consistent naming convention so “find feature in <30s” is realistic for new developers.

Backend structure target:
- `backend/src/features/<feature>/{routes,services,db,tests}` with shared middleware/utilities in `backend/src/middleware` and `backend/src/utils`.

Exit criteria:
- New structure adopted for at least the most-used features (dashboard, properties, tenants, payments, auth).
- Documented module map and import boundaries.
- No increase in median action-to-feedback time; ideally further improvements.

Phase gate test suite:
- Phase 2 suite, plus:
  - module-locating verification checklist (developer-experience gate)
  - routing contract checks (URLs unchanged)

### Phase 4: Optimization (Deep Performance Work)

Scope:
- Bundle and runtime optimizations:
  - tighten code-splitting boundaries and remove unused code paths
  - reduce main-thread work (virtualization already present via `react-window`; expand usage where needed)
  - optimize large lists, charts, heavy forms
- Backend optimizations:
  - targeted query/index work based on slow query samples
  - reduce serialization overhead and payload sizes (select fields, pagination)
  - improve caching strategy and invalidation

Exit criteria:
- Lighthouse Performance ≥ 90 for key flows.
- 60 fps navigation actions on target hardware under typical data loads.
- Backend CPU/session -70% on the defined workload.

Phase gate test suite:
- Phase 3 suite, plus:
  - Lighthouse CI (or equivalent automated Lighthouse run) with performance budgets
  - backend load test script with CPU/session reporting

## Coverage Policy (“100% on Touched Files”)

Implementation approach:
- Introduce a script that:
  - enumerates touched source files (git diff or a maintained manifest during this effort)
  - maps them to coverage entries from Jest `coverage-final.json`
  - fails CI if any touched file is <100% statements/branches/functions/lines
- Apply to:
  - frontend touched files (CRA/Jest coverage output)
  - backend touched files (Jest coverage output)

## Risk Management

- Keep Phase 1 behavior-neutral to avoid performance regressions during instrumentation.
- Use feature flags for all behavior changes; keep old code path available until metrics prove the new path.
- Avoid introducing new external observability dependencies unless required; prefer existing monitoring utilities first.
- Preserve API contracts and URLs by:
  - treating external request/response shapes as immutable
  - adding optional query params only behind flags and only when backward-compatible

## Execution Order (High-Level)

1. Implement Phase 1 instrumentation and gates, capture baseline, produce findings report.
2. Deliver Phase 2 quick wins in descending impact order (top issues first), with per-issue before/after metrics.
3. Execute Phase 3 structural refactor behind flags and with stable imports.
4. Finish with Phase 4 optimization and CI performance budgets.

