# Phase 3: Organizations, Teams, and Workflows

## Summary

Phase 3 introduces organization-level structure and a lightweight workflow engine.

Key capabilities:
- Organizations and membership
- Teams inside organizations
- Workflow definitions (states + transitions)
- Work items attaching a workflow/state to existing resources (e.g. maintenance)

## Migrations

- [015_phase3_organizations_workflows.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/015_phase3_organizations_workflows.sql)
- [016_phase3_org_role_backfill.sql](file:///c:/Users/HP/property-management-pos/backend/database/migrations/016_phase3_org_role_backfill.sql)

## API Endpoints

Organizations:
- `GET /api/organizations`
- `POST /api/organizations`
- `GET /api/organizations/:id`
- `PUT /api/organizations/:id`
- `DELETE /api/organizations/:id`
- `GET /api/organizations/:organizationId/members`
- `POST /api/organizations/:organizationId/members`
- `DELETE /api/organizations/:organizationId/members/:userId`

Teams:
- `GET /api/organizations/:organizationId/teams`
- `POST /api/organizations/:organizationId/teams`
- `GET /api/organizations/:organizationId/teams/:teamId`
- `PUT /api/organizations/:organizationId/teams/:teamId`
- `DELETE /api/organizations/:organizationId/teams/:teamId`
- `GET /api/organizations/:organizationId/teams/:teamId/members`
- `POST /api/organizations/:organizationId/teams/:teamId/members`
- `DELETE /api/organizations/:organizationId/teams/:teamId/members/:userId`

Workflows and work items:
- `GET /api/organizations/:organizationId/workflows`
- `POST /api/organizations/:organizationId/workflows`
- `GET /api/organizations/:organizationId/workflows/:workflowId`
- `DELETE /api/organizations/:organizationId/workflows/:workflowId`
- `GET /api/organizations/:organizationId/work-items/:resourceType/:resourceId`

## RBAC Notes

- New resources: `organization`, `team`, `workflow`, `work_item`.
- Phase 3 adds optional organization scope to `user_roles.organization_id`.
- Organization-specific endpoints enforce both:
  - RBAC permission via `requirePermission(resource, action)`
  - organization boundary via `ensureOrganizationAccess(...)`

## Maintenance Integration

When a maintenance request is created, the service attempts to attach a work item using the org’s default maintenance workflow when available.

