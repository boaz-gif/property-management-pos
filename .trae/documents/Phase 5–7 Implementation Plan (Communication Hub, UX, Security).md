## Current State (What’s Already in Place)
- Backend is Node/Express + Postgres (raw SQL), with JWT auth and DB-backed RBAC ([auth middleware](file:///c:/Users/HP/property-management-pos/backend/src/middleware/auth.js), [PermissionService](file:///c:/Users/HP/property-management-pos/backend/src/services/PermissionService.js)).
- Real-time plumbing already exists via Socket.IO with per-user rooms `user-<id>` and notification emission ([socketIOConfig](file:///c:/Users/HP/property-management-pos/backend/src/utils/socketIOConfig.js), [NotificationService](file:///c:/Users/HP/property-management-pos/backend/src/services/notificationService.js)).
- Notifications are already persisted in `notifications` (jsonb `data`) and rendered globally in the frontend header ([NotificationContext](file:///c:/Users/HP/property-management-pos/src/context/NotificationContext.jsx), [Notification dropdown](file:///c:/Users/HP/property-management-pos/src/components/notifications/NotificationDropdown.jsx)).
- Tenant dashboard already has a widget persistence backend; frontend currently renders widgets but doesn’t support reordering/toggling and is missing the backend default `quick_actions` widget ([tenant dashboard](file:///c:/Users/HP/property-management-pos/src/pages/tenant/Dashboard.jsx), [tenantDashboardService defaults](file:///c:/Users/HP/property-management-pos/backend/src/services/tenantDashboardService.js)).
- PWA/service worker exists, but offline “POST queue + background sync” is stubbed (and `sw.js` currently has two `fetch` handlers that should be consolidated) ([sw.js](file:///c:/Users/HP/property-management-pos/public/sw.js), [service-worker-registration](file:///c:/Users/HP/property-management-pos/src/services/service-worker-registration.js)).
- Auditing exists via `audit_logs` + middleware on many mutating routes, but there is no field-level encryption for PII and audit logs can currently capture PII in cleartext ([auditMiddleware](file:///c:/Users/HP/property-management-pos/backend/src/middleware/auditMiddleware.js), [auditService](file:///c:/Users/HP/property-management-pos/backend/src/services/auditService.js)).

## Phase 5.1 — Unified Communication Hub (Messaging)
### Database (additive migrations)
- Create tables (Postgres-first design; avoids array FKs):
  - `conversations` (id uuid pk, entity_type, entity_id, subject, organization_id, property_id, created_by, created_at, updated_at, archived_at)
  - `conversation_participants` (conversation_id, user_id, role_at_time, joined_at, left_at, last_read_message_id)
  - `messages` (id uuid pk, conversation_id, sender_id, content, attachments jsonb, created_at, deleted_at)
  - Optional: `message_reads` (message_id, user_id, read_at) if we need per-message receipts beyond `last_read_message_id`.
- Add indexes:
  - `messages(conversation_id, created_at desc)`, `conversation_participants(user_id)`, `conversations(entity_type, entity_id)` plus org/property scope indexes.
- RBAC resources/actions:
  - Add RBAC entries for `conversation` and `message` (read/create/update as needed), aligned with existing `requirePermission(resource, action)`.

### Backend API
- Add routes/controllers/services for:
  - `GET /api/conversations` (scoped by org/property + participation)
  - `POST /api/conversations` (create thread for an entity or “general”)
  - `GET /api/conversations/:id` (details + participants)
  - `GET /api/conversations/:id/messages` (paged)
  - `POST /api/conversations/:id/messages` (send)
  - `POST /api/conversations/:id/participants` / `DELETE .../:userId` (admin/manager adds/removes)
- Enforce boundaries using existing scope + PermissionService patterns:
  - Only participants can read/post.
  - For entity-tied conversations, validate the user has access to that entity (maintenance/property/lease/etc) before allowing join/read.

### Real-time (Socket.IO)
- Add hub events (server authoritatively checks permissions):
  - client→server: `hub:join_conversation`, `hub:leave_conversation`, `hub:send_message`, `hub:typing`
  - server→client: `hub:message_created`, `hub:conversation_updated`, `hub:typing`
- Room strategy:
  - Keep `user-<id>` (existing) for alerts.
  - Add `conversation-<id>` for live thread updates.
- Notification integration:
  - On message create, insert a `notifications` row for other participants (type like `message_received`) and embed `{ conversation_id, message_id }` in `notifications.data`; emit via existing NotificationService.

### Frontend
- Add Communication Hub page:
  - Thread list + search + filters by entity type.
  - Thread view with message timeline, attachments, typing indicators.
  - Entity-linked deep links from notifications.
- Wire to existing sockets:
  - Reuse `SocketContext` and add hub event handlers.
- Attachment strategy:
  - Reuse existing document upload pipeline to produce URLs, then store those URLs in `messages.attachments` (jsonb) (keeps changes additive).

## Phase 5.2 — Mobile-Responsive + Accessibility + PWA/Offline
- Consolidate service worker fetch handling and implement real offline queue:
  - Store pending maintenance submissions (and optionally outbound messages) in IndexedDB.
  - When offline, enqueue the request; when online, flush via Background Sync.
- UI improvements:
  - Ensure hub and maintenance submission are touch-friendly and keyboard accessible.
  - Add/verify dark mode support via Tailwind + user preference (tenant already has `theme` in preferences).
- Validation:
  - Manual offline test: create maintenance request offline → reconnect → auto-sync → appears in list.

## Phase 5.3 — Dashboard Personalization
- Tenant dashboard:
  - Implement missing `quick_actions` widget rendering.
  - Add “Edit dashboard” mode (toggle visibility + reorder) and persist via existing `PUT /api/tenant/widgets/order`.
- Admin + Super Admin:
  - Introduce a shared widget grid component.
  - Add a minimal per-user widget preference table (or reuse a generalized dashboard_widgets table) so hide/reorder works consistently for all roles.

## Phase 6 — Security & Compliance Enhancements
### 6.1 Encryption & Privacy
- Implement application-level field encryption utility (AES-256-GCM) and apply to a defined allowlist of sensitive columns actually present in the DB (validated via schema introspection before editing models).
- Documents:
  - Phase 6A: keep storage location but add optional encryption-at-rest for newly uploaded “sensitive” documents (add columns like `is_encrypted`, `iv`, `auth_tag`, `key_id` as additive).
- Audit data minimization:
  - Redact sensitive fields from audit payloads (allowlist safe keys) to prevent PII leakage into logs.

### 6.2 Audit Trail Expansion
- Add `detailed_audit_logs` table exactly as required (additive) and indexes.
- Update audit pipeline:
  - Extend middleware/service to write both `audit_logs` (existing) and `detailed_audit_logs` (new) during transition.
  - Add optional “view auditing” for sensitive GET endpoints (documents, payments, exports).

### GDPR/CCPA workflows (practical first slice)
- Add export endpoints for tenant/user data bundles and deletion/anonymization workflow (role protected), with auditable events.

## Phase 7 — Verification (Key)
- DB validation:
  - Migration up/down scripts for each new table with rollback.
  - Index checks for new high-volume tables (messages, participants).
- Backend tests (Jest + Supertest):
  - Permission and boundary tests for conversation/message endpoints using the existing `expectedPermissions` mocking pattern.
  - Audit logging tests for create/update/delete and view actions.
- Frontend tests (RTL):
  - ProtectedRoute access tests and basic hub rendering/notification deep-link test.
- Manual smoke:
  - Socket messaging between two roles.
  - Notification preferences gating (at least tenant preferences + a new generic preference path for non-tenants).

## Deliverables You’ll Get At The End
- SQL migrations + rollback for hub tables, preferences, detailed audit logs.
- Backend routes/controllers/services with RBAC + scope enforcement.
- Frontend Communication Hub UI + dashboard personalization enhancements.
- Updated API docs (new endpoints + permission requirements).
- Test suite updates covering RBAC, boundaries, and audit behavior.