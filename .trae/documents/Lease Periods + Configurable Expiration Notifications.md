## What’s Already True (Current Behavior)
- **Per unit/tenant lease period:** Yes. Admins can set lease start/end dates for an individual tenant (which maps to a unit via `tenants.property_id` + `tenants.unit` / `tenants.unit_id`).
  - Endpoint: [tenants.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/tenants.js#L163-L181) (`PUT /api/tenants/:id/lease` and `POST /api/tenants/:id/lease/renew`).
  - Implementation: [tenantController.updateLease](file:///c:/Users/HP/property-management-pos/backend/src/controllers/tenantController.js#L559-L596).
- **Automatic reminders before lease end:** Yes, the backend includes daily cron jobs that run **7/14/30-day** reminders and expired checks.
  - Scheduler: [leaseCronJobs.js](file:///c:/Users/HP/property-management-pos/backend/src/jobs/leaseCronJobs.js#L8-L61).
  - Notification sender: [notificationService.sendLeaseExpirationNotification](file:///c:/Users/HP/property-management-pos/backend/src/services/notificationService.js).
  - Cron is enabled in production unless `DISABLE_CRON=true`: [server.js](file:///c:/Users/HP/property-management-pos/backend/server.js#L8-L98).

## What’s NOT Yet Fully Supported
- **“Set for a whole property” lease period:** Not as a first-class admin feature. Lease dates live per tenant; there’s no property-level “default lease term” setting + bulk-apply endpoint.
- **“Choose the reminder window (e.g., exactly 7 days)” per property/unit:** The reminders are currently **hard-coded** to 30/14/7 days (not configurable per property).
- **Operational gap:** `LeaseCronJobs` attempts to write/read `lease_expiration_reminders`, but there is no migration for this table in `backend/database/migrations/`. That means in a fresh DB, the cron jobs would error until we add that table.

## Implementation Plan (DB first, app obeys)
### 1) Database: add missing tables + constraints
- Create `lease_expiration_reminders` table used by the cron job (with a uniqueness rule like `(tenant_id, reminder_type)` to prevent duplicates).
- Create `property_lease_settings` table:
  - `property_id` (unique FK)
  - `default_term_days` or `default_term_months`
  - `reminder_days` (e.g., `int[]` default `{30,14,7}`)
  - `notify_tenant` / `notify_admin` booleans
- (Optional) add `unit_lease_settings` if you want per-unit overrides separate from tenant records.

### 2) Backend: expose admin workflows
- Add endpoints for admins:
  - Set/update property lease defaults: `PUT /api/properties/:propertyId/lease-settings`
  - Bulk-apply lease dates to all active tenants in a property (intent-based operation): `POST /api/properties/:propertyId/leases/bulk-set` (with options like “only tenants missing lease dates”).
- Ensure property ownership checks reuse `PermissionService.ensurePropertyAccess`.

### 3) Cron: use configurable reminder windows
- Update `LeaseCronJobs` to:
  - Pull reminder windows from `property_lease_settings.reminder_days`.
  - Send reminders only to the configured targets.
  - Continue dedup using `lease_expiration_reminders`.

### 4) Notifications: target the right tenants/units
- Ensure the payload includes `property_id`, `unit`/`unit_id`, tenant user id, and admin id.
- Confirm the “affected units” are the tenants whose lease end date matches the reminder window.

### 5) Tests + verification
- Migration tests: table exists + uniqueness works.
- API tests: admin can set property defaults + bulk apply; tenant cannot.
- Cron logic test: configurable reminder windows are honored and dedup works.

If you confirm this plan, I’ll implement it so admins can (a) set lease periods per unit/tenant, (b) optionally set defaults per property and bulk-apply them, and (c) configure the reminder windows (like “7 days before”) that automatically notify affected tenants and the owning admin.