# Phase 2 RBAC

## Overview

This backend now supports a database-backed RBAC system based on:
- Roles (`roles`)
- Permissions (`permissions`)
- Role → Permission mapping (`role_permissions`)
- User → Role assignments, optionally scoped to a property (`user_roles`)

The existing legacy role string on `users.role` (`super_admin`, `admin`, `tenant`) still exists and is used as a fallback for compatibility, but route access is enforced via `requirePermission(resource, action)` where applied.

## Database Objects

SQL migrations:
- [013_rbac.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/013_rbac.sql)
- [014_rbac_tenant_portal_permissions.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/014_rbac_tenant_portal_permissions.sql)
- [015_phase3_organizations_workflows.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/015_phase3_organizations_workflows.sql)
- [016_phase3_org_role_backfill.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/016_phase3_org_role_backfill.sql)

These migrations:
- Create `roles`, `permissions`, `role_permissions`, `user_roles`
- Extend `user_roles` with optional `organization_id` for org-scoped access
- Seed the standard roles
- Seed a baseline permission matrix for resources/actions
- Backfill `user_roles` from existing `users.role`, `users.properties`, `users.property_id`

## Running Migrations

Migration runner:
- [run_sql_migration.js](file:///c:/Users/HP/property-management-pos/backend/scripts/run_sql_migration.js)

Examples:
- Apply: `node scripts/run_sql_migration.js up 013_rbac.sql`
- Rollback: `node scripts/run_sql_migration.js down 013_rbac.sql`

Applied migrations are tracked in `schema_migrations`.

## Permission Enforcement

Middleware:
- [permissionMiddleware.js](file:///c:/Users/HP/property-management-pos/backend/src/middleware/permissionMiddleware.js)

Service:
- [PermissionService.js](file:///c:/Users/HP/property-management-pos/backend/src/services/PermissionService.js)

Rules:
- `requirePermission(resource, action)` checks the user’s effective RBAC permissions.
- Where applicable, the middleware also enforces row-level boundaries by delegating to:
  - property access checks (`ensurePropertyAccess`)
  - tenant access checks (`ensureTenantAccess`)
- Property scope resolution uses (in order): URL param override (if configured), `req.activeProperty`, `X-Property-ID`, and then `req.user.property_id`.

## Resources and Actions

Resources:
- `property`
- `tenant`
- `payment`
- `maintenance`
- `document`
- `audit_log`
- `dashboard`
- `user` (reserved; currently only seeded for `SUPER_ADMIN`)

Actions:
- `create`, `read`, `update`, `delete`, `manage`

## Routes Updated to RBAC

Routes now using `requirePermission(...)`:
- [properties.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/properties.js)
- [tenants.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/tenants.js)
- [payments.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/payments.js)
- [maintenance.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/maintenance.js)
- [documents.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/documents.js)
- [audit.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/audit.js)
- [tenant-portal.js](file:///c:/Users/HP/property-management-pos/backend/src/routes/tenant-portal.js)

## Notes / Next Steps

- Phase 3 introduces `organizations` and workflow tables. These are intentionally not applied in Phase 2.
- After Phase 2 is stable, legacy checks using `users.role` can be progressively replaced with RBAC-native lookups.
