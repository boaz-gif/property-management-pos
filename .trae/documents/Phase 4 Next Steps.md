## Tenant Receipts
- Add tenant-portal endpoint for receipt retrieval
- Wire endpoint to existing receipt generator/backfill logic
- Return receipt metadata and/or stream PDF consistently

## Announcements Read/Acknowledge
- Decide and implement separate “viewed” vs “acknowledged” behavior
- Add distinct endpoints (e.g., /read for viewed_at, /ack for acknowledged)
- Update tenant announcement queries to reflect the chosen semantics

## Tenant Portal Permissions
- Review tenant-portal routes for correct permission verbs
- Change update/mutation routes that currently require only dashboard:read
- Add/adjust RBAC permission mapping where needed

## Tenant Payments Controller Cleanup
- Deduplicate repeated tenantId resolution in controller methods
- Standardize error handling and status codes

## Materialized View Maintenance
- Define refresh strategy for tenant_home_summary (cron vs write-time)
- Ensure refresh runs safely and doesn’t block critical paths

## Tests & Verification
- Add API tests for tenant receipt endpoint and announcement read/ack flows
- Add tests validating permission behavior for mutation routes
- Run full backend and frontend test suites

## Documentation
- Update Phase 4 docs to include tenant receipt endpoint + announcement semantics
- Document required permissions for tenant-portal routes