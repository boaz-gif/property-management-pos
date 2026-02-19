# Phase 4: Tenant Portal Completion

## Summary

Phase 4 completes the tenant portal data layer and adds missing backend support for:
- Tenant dashboard widgets and preferences
- Property announcements + tenant read tracking
- Tenant home summary (materialized view) used by the tenant dashboard
- Receipt generation backfill support (cron can generate missing receipts)

## Migrations

- [017_phase4_tenant_portal.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/017_phase4_tenant_portal.sql)
- [018_rbac_tenant_portal_permissions.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/018_rbac_tenant_portal_permissions.sql)

## Admin Property Announcements API

Routes (property-scoped RBAC via `property` permissions):
- `GET /api/properties/:propertyId/announcements`
- `POST /api/properties/:propertyId/announcements`
- `PUT /api/properties/:propertyId/announcements/:id`
- `POST /api/properties/:propertyId/announcements/:id/publish`
- `DELETE /api/properties/:propertyId/announcements/:id`

Implementation:
- [properties.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/properties.js)
- [propertyAnnouncementController.js](file:///c:/Users/HP/property-management-pos/backend/src/controllers/propertyAnnouncementController.js)
- [propertyAnnouncementService.js](file:///c:/Users/HP/property-management-pos/backend/src/services/propertyAnnouncementService.js)
- [PropertyAnnouncement.js](file:///c:/Users/HP/property-management-pos/backend/src/models/PropertyAnnouncement.js)

## Tenant Notifications

Tenant dashboard endpoints now source notifications from the main `notifications` table (user-scoped), not the legacy `tenant_notifications` table:
- [tenantDashboardService.js](file:///c:/Users/HP/property-management-pos/backend/src/services/tenantDashboardService.js)

## Tenant Announcements

Tenant portal routes:
- `GET /api/tenant/announcements`
- `POST /api/tenant/announcements/:id/read` (records `viewed_at`)
- `POST /api/tenant/announcements/:id/ack` (sets `acknowledged` + `acknowledged_at`)

Implementation:
- [tenant-portal.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/tenant-portal.js)
- [tenantDashboardController.js](file:///c:/Users/HP/property-management-pos/backend/src/controllers/tenantDashboardController.js)
- [tenantDashboardService.js](file:///c:/Users/HP/property-management-pos/backend/src/services/tenantDashboardService.js)

## Receipts

Receipt ownership is resolved via `tenants.user_id`, so the created document is associated with the correct user:
- [ReceiptService.js](file:///c:/Users/HP/property-management-pos/backend/src/services/ReceiptService.js)

Tenant payment receipts can be generated after-the-fact:
- [tenantPaymentService.js](file:///c:/Users/HP/property-management-pos/backend/src/services/tenantPaymentService.js)
- [tenantPaymentCron.js](file:///c:/Users/HP/property-management-pos/backend/src/jobs/tenantPaymentCron.js)

Tenant portal receipt endpoint:
- `GET /api/tenant/payments/:id/receipt`
- [tenantPaymentController.js](file:///c:/Users/HP/property-management-pos/backend/src/controllers/tenantPaymentController.js)

## Tenant Portal Permissions

Tenant portal mutations use explicit permission verbs:
- Widgets ordering: `dashboard:update`
- Quick actions logging: `dashboard:create`

This is enabled by:
- [018_rbac_tenant_portal_permissions.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/018_rbac_tenant_portal_permissions.sql)

## Tenant Home Summary Refresh

`tenant_home_summary` is refreshed by cron (daily + monthly) using a CONCURRENTLY-first strategy with a safe fallback:
- [tenantPaymentCron.js](file:///c:/Users/HP/property-management-pos/backend/src/jobs/tenantPaymentCron.js)
