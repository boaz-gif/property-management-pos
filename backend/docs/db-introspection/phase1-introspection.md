# Phase 1 Database Introspection Report

Generated at: 2026-02-02T22:27:35.898Z

## Tables (with row counts and sizes)

| schema | table | rows | size |
| --- | --- | --- | --- |
| public | tenants | 18 | 352 kB |
| public | maintenance | 6 | 208 kB |
| public | payments | 5 | 200 kB |
| public | users | 52 | 192 kB |
| public | notifications | 27 | 152 kB |
| public | properties | 5 | 144 kB |
| public | documents | 6 | 144 kB |
| public | audit_logs | 36 | 128 kB |
| public | admin_dashboard_metrics | 10 | 104 kB |
| public | property_units | 0 | 72 kB |
| public | token_blacklist | 24 | 64 kB |
| public | expense_categories | 8 | 64 kB |
| public | property_expenses | 0 | 64 kB |
| public | lease_expiration_reminders | 0 | 56 kB |
| public | property_metrics | 0 | 48 kB |
| public | admin_action_items | 0 | 48 kB |
| public | expense_budgets | 0 | 40 kB |
| public | recurring_expenses | 0 | 40 kB |
| public | leases | 0 | 32 kB |
| public | disputes | 0 | 32 kB |
| public | property_images_archive | 0 | 32 kB |
| public | lease_history | 0 | 32 kB |
| public | unit_status_history | 0 | 32 kB |
| public | tenant_notifications | 0 | 32 kB |
| public | tenant_dashboard_widgets | 0 | 32 kB |
| public | tenant_announcement_reads | 0 | 24 kB |
| public | payment_receipts | 0 | 24 kB |
| public | admin_quick_actions | 0 | 24 kB |
| public | property_announcements | 0 | 24 kB |
| public | tenant_preferences | 0 | 16 kB |
| public | tenant_quick_actions_log | 0 | 16 kB |
| public | tenant_payment_methods | 0 | 16 kB |
| public | tenant_autopay | 0 | 16 kB |

## Foreign Keys

| from_table | from_column | to_table | to_column | constraint |
| --- | --- | --- | --- | --- |
| admin_action_items | admin_id | users | id | admin_action_items_admin_id_fkey |
| admin_action_items | property_id | properties | id | admin_action_items_property_id_fkey |
| admin_action_items | tenant_id | tenants | id | admin_action_items_tenant_id_fkey |
| admin_dashboard_metrics | admin_id | users | id | admin_dashboard_metrics_admin_id_fkey |
| admin_quick_actions | admin_id | users | id | admin_quick_actions_admin_id_fkey |
| audit_logs | user_id | users | id | audit_logs_user_id_fkey |
| disputes | created_by | users | id | disputes_created_by_fkey |
| disputes | resolved_by | users | id | disputes_resolved_by_fkey |
| disputes | tenant_id | tenants | id | disputes_tenant_id_fkey |
| disputes | deleted_by | users | id | fk_disputes_deleted_by |
| documents | property_id | properties | id | documents_property_id_fkey |
| documents | tenant_id | tenants | id | documents_tenant_id_fkey |
| documents | uploaded_by | users | id | documents_uploaded_by_fkey |
| documents | deleted_by | users | id | fk_documents_deleted_by |
| expense_budgets | approved_by | users | id | expense_budgets_approved_by_fkey |
| expense_budgets | property_id | properties | id | expense_budgets_property_id_fkey |
| lease_expiration_reminders | deleted_by | users | id | fk_lease_exp_rem_deleted_by |
| lease_expiration_reminders | property_id | properties | id | lease_expiration_reminders_property_id_fkey |
| lease_expiration_reminders | tenant_id | tenants | id | lease_expiration_reminders_tenant_id_fkey |
| lease_history | tenant_id | tenants | id | lease_history_tenant_id_fkey |
| leases | deleted_by | users | id | fk_leases_deleted_by |
| leases | property_id | properties | id | leases_property_id_fkey |
| leases | tenant_id | tenants | id | leases_tenant_id_fkey |
| maintenance | deleted_by | users | id | fk_maintenance_deleted_by |
| maintenance | property_id | properties | id | maintenance_property_id_fkey |
| maintenance | tenant_id | tenants | id | maintenance_tenant_id_fkey |
| notifications | deleted_by | users | id | fk_notifications_deleted_by |
| notifications | user_id | users | id | notifications_user_id_fkey |
| payment_receipts | payment_id | payments | id | payment_receipts_payment_id_fkey |
| payments | deleted_by | users | id | fk_payments_deleted_by |
| payments | tenant_id | tenants | id | payments_tenant_id_fkey |
| properties | deleted_by | users | id | fk_properties_deleted_by |
| property_announcements | created_by | users | id | property_announcements_created_by_fkey |
| property_announcements | property_id | properties | id | property_announcements_property_id_fkey |
| property_expenses | approved_by | users | id | property_expenses_approved_by_fkey |
| property_expenses | property_id | properties | id | property_expenses_property_id_fkey |
| property_expenses | recorded_by | users | id | property_expenses_recorded_by_fkey |
| property_images_archive | deleted_by | users | id | property_images_archive_deleted_by_fkey |
| property_images_archive | property_id | properties | id | property_images_archive_property_id_fkey |
| property_metrics | property_id | properties | id | property_metrics_property_id_fkey |
| property_units | current_tenant_id | tenants | id | property_units_current_tenant_id_fkey |
| property_units | property_id | properties | id | property_units_property_id_fkey |
| recurring_expenses | created_by | users | id | recurring_expenses_created_by_fkey |
| recurring_expenses | property_id | properties | id | recurring_expenses_property_id_fkey |
| tenant_announcement_reads | announcement_id | property_announcements | id | tenant_announcement_reads_announcement_id_fkey |
| tenant_announcement_reads | tenant_id | tenants | id | tenant_announcement_reads_tenant_id_fkey |
| tenant_autopay | payment_method_id | tenant_payment_methods | id | tenant_autopay_payment_method_id_fkey |
| tenant_autopay | tenant_id | tenants | id | tenant_autopay_tenant_id_fkey |
| tenant_dashboard_widgets | tenant_id | tenants | id | tenant_dashboard_widgets_tenant_id_fkey |
| tenant_notifications | tenant_id | tenants | id | tenant_notifications_tenant_id_fkey |
| tenant_payment_methods | tenant_id | tenants | id | tenant_payment_methods_tenant_id_fkey |
| tenant_preferences | tenant_id | tenants | id | tenant_preferences_tenant_id_fkey |
| tenant_quick_actions_log | tenant_id | tenants | id | tenant_quick_actions_log_tenant_id_fkey |
| tenants | user_id | users | id | fk_tenant_user |
| tenants | deleted_by | users | id | fk_tenants_deleted_by |
| tenants | user_id | users | id | fk_tenants_user_id |
| tenants | property_id | properties | id | tenants_property_id_fkey |
| token_blacklist | user_id | users | id | token_blacklist_user_id_fkey |
| unit_status_history | changed_by | users | id | unit_status_history_changed_by_fkey |
| unit_status_history | tenant_id | tenants | id | unit_status_history_tenant_id_fkey |
| unit_status_history | unit_id | property_units | id | unit_status_history_unit_id_fkey |
| users | property_id | properties | id | fk_users_property |

## Indexes

| table | index | definition |
| --- | --- | --- |
| admin_action_items | admin_action_items_pkey | CREATE UNIQUE INDEX admin_action_items_pkey ON public.admin_action_items USING btree (id) |
| admin_action_items | idx_action_items_admin_status | CREATE INDEX idx_action_items_admin_status ON public.admin_action_items USING btree (admin_id, status, priority, due_date) |
| admin_action_items | idx_action_items_priority | CREATE INDEX idx_action_items_priority ON public.admin_action_items USING btree (priority, due_date) |
| admin_action_items | idx_action_items_property | CREATE INDEX idx_action_items_property ON public.admin_action_items USING btree (property_id, status) |
| admin_action_items | idx_action_items_type | CREATE INDEX idx_action_items_type ON public.admin_action_items USING btree (item_type, status) |
| admin_dashboard_metrics | admin_dashboard_metrics_admin_id_metric_date_key | CREATE UNIQUE INDEX admin_dashboard_metrics_admin_id_metric_date_key ON public.admin_dashboard_metrics USING btree (admin_id, metric_date) |
| admin_dashboard_metrics | admin_dashboard_metrics_pkey | CREATE UNIQUE INDEX admin_dashboard_metrics_pkey ON public.admin_dashboard_metrics USING btree (id) |
| admin_dashboard_metrics | idx_admin_dashboard_admin_date | CREATE INDEX idx_admin_dashboard_admin_date ON public.admin_dashboard_metrics USING btree (admin_id, metric_date DESC) |
| admin_dashboard_metrics | idx_admin_dashboard_collection | CREATE INDEX idx_admin_dashboard_collection ON public.admin_dashboard_metrics USING btree (collection_rate DESC) |
| admin_dashboard_metrics | idx_admin_dashboard_date | CREATE INDEX idx_admin_dashboard_date ON public.admin_dashboard_metrics USING btree (metric_date DESC) |
| admin_dashboard_metrics | idx_admin_dashboard_occupancy | CREATE INDEX idx_admin_dashboard_occupancy ON public.admin_dashboard_metrics USING btree (occupancy_rate DESC) |
| admin_quick_actions | admin_quick_actions_pkey | CREATE UNIQUE INDEX admin_quick_actions_pkey ON public.admin_quick_actions USING btree (id) |
| admin_quick_actions | idx_quick_actions_admin | CREATE INDEX idx_quick_actions_admin ON public.admin_quick_actions USING btree (admin_id, created_at DESC) |
| admin_quick_actions | idx_quick_actions_type | CREATE INDEX idx_quick_actions_type ON public.admin_quick_actions USING btree (action_type, created_at DESC) |
| audit_logs | audit_logs_pkey | CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id) |
| audit_logs | idx_audit_action | CREATE INDEX idx_audit_action ON public.audit_logs USING btree (action) |
| audit_logs | idx_audit_created_at | CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at DESC) |
| audit_logs | idx_audit_logs_table_created | CREATE INDEX idx_audit_logs_table_created ON public.audit_logs USING btree (action, created_at DESC) |
| audit_logs | idx_audit_resource | CREATE INDEX idx_audit_resource ON public.audit_logs USING btree (resource_type, resource_id) |
| audit_logs | idx_audit_user_date | CREATE INDEX idx_audit_user_date ON public.audit_logs USING btree (user_id, created_at DESC) |
| audit_logs | idx_audit_user_id | CREATE INDEX idx_audit_user_id ON public.audit_logs USING btree (user_id) |
| disputes | disputes_pkey | CREATE UNIQUE INDEX disputes_pkey ON public.disputes USING btree (id) |
| disputes | idx_disputes_active | CREATE INDEX idx_disputes_active ON public.disputes USING btree (id) WHERE (deleted_at IS NULL) |
| disputes | idx_disputes_deleted_at | CREATE INDEX idx_disputes_deleted_at ON public.disputes USING btree (deleted_at) |
| documents | documents_pkey | CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id) |
| documents | idx_documents_active | CREATE INDEX idx_documents_active ON public.documents USING btree (id) WHERE (deleted_at IS NULL) |
| documents | idx_documents_deleted_at | CREATE INDEX idx_documents_deleted_at ON public.documents USING btree (deleted_at) |
| documents | idx_documents_entity | CREATE INDEX idx_documents_entity ON public.documents USING btree (entity_type, entity_id) |
| documents | idx_documents_property_id | CREATE INDEX idx_documents_property_id ON public.documents USING btree (property_id) |
| documents | idx_documents_tenant_id | CREATE INDEX idx_documents_tenant_id ON public.documents USING btree (tenant_id) |
| documents | idx_documents_type | CREATE INDEX idx_documents_type ON public.documents USING btree (type) |
| documents | idx_documents_uploaded_by | CREATE INDEX idx_documents_uploaded_by ON public.documents USING btree (uploaded_by) |
| expense_budgets | expense_budgets_pkey | CREATE UNIQUE INDEX expense_budgets_pkey ON public.expense_budgets USING btree (id) |
| expense_budgets | idx_expense_budgets_property_period | CREATE INDEX idx_expense_budgets_property_period ON public.expense_budgets USING btree (property_id, budget_year, budget_period) |
| expense_budgets | idx_expense_budgets_status | CREATE INDEX idx_expense_budgets_status ON public.expense_budgets USING btree (budget_status) |
| expense_budgets | idx_expense_budgets_unique | CREATE UNIQUE INDEX idx_expense_budgets_unique ON public.expense_budgets USING btree (property_id, budget_year, budget_period, COALESCE(budget_month, 0)) |
| expense_categories | expense_categories_category_name_key | CREATE UNIQUE INDEX expense_categories_category_name_key ON public.expense_categories USING btree (category_name) |
| expense_categories | expense_categories_pkey | CREATE UNIQUE INDEX expense_categories_pkey ON public.expense_categories USING btree (id) |
| expense_categories | idx_expense_categories_parent | CREATE INDEX idx_expense_categories_parent ON public.expense_categories USING btree (parent_category) |
| lease_expiration_reminders | idx_lease_exp_rem_active | CREATE INDEX idx_lease_exp_rem_active ON public.lease_expiration_reminders USING btree (id) WHERE (deleted_at IS NULL) |
| lease_expiration_reminders | idx_lease_exp_rem_deleted_at | CREATE INDEX idx_lease_exp_rem_deleted_at ON public.lease_expiration_reminders USING btree (deleted_at) |
| lease_expiration_reminders | idx_lease_expiration_reminders_reminder_type | CREATE INDEX idx_lease_expiration_reminders_reminder_type ON public.lease_expiration_reminders USING btree (reminder_type) |
| lease_expiration_reminders | idx_lease_expiration_reminders_sent_at | CREATE INDEX idx_lease_expiration_reminders_sent_at ON public.lease_expiration_reminders USING btree (sent_at) |
| lease_expiration_reminders | idx_lease_expiration_reminders_tenant_id | CREATE INDEX idx_lease_expiration_reminders_tenant_id ON public.lease_expiration_reminders USING btree (tenant_id) |
| lease_expiration_reminders | lease_expiration_reminders_pkey | CREATE UNIQUE INDEX lease_expiration_reminders_pkey ON public.lease_expiration_reminders USING btree (id) |
| lease_expiration_reminders | lease_expiration_reminders_tenant_id_reminder_type_key | CREATE UNIQUE INDEX lease_expiration_reminders_tenant_id_reminder_type_key ON public.lease_expiration_reminders USING btree (tenant_id, reminder_type) |
| lease_history | idx_lease_history_status | CREATE INDEX idx_lease_history_status ON public.lease_history USING btree (status) |
| lease_history | idx_lease_history_tenant_id | CREATE INDEX idx_lease_history_tenant_id ON public.lease_history USING btree (tenant_id) |
| lease_history | lease_history_pkey | CREATE UNIQUE INDEX lease_history_pkey ON public.lease_history USING btree (id) |
| leases | idx_leases_active | CREATE INDEX idx_leases_active ON public.leases USING btree (id) WHERE (deleted_at IS NULL) |
| leases | idx_leases_deleted_at | CREATE INDEX idx_leases_deleted_at ON public.leases USING btree (deleted_at) |
| leases | leases_pkey | CREATE UNIQUE INDEX leases_pkey ON public.leases USING btree (id) |
| maintenance | idx_maintenance_active | CREATE INDEX idx_maintenance_active ON public.maintenance USING btree (id) WHERE (deleted_at IS NULL) |
| maintenance | idx_maintenance_deleted_at | CREATE INDEX idx_maintenance_deleted_at ON public.maintenance USING btree (deleted_at) |
| maintenance | idx_maintenance_open_property | CREATE INDEX idx_maintenance_open_property ON public.maintenance USING btree (property_id, created_at DESC) WHERE ((deleted_at IS NULL) AND ((status)::text = 'open'::text)) |
| maintenance | idx_maintenance_priority | CREATE INDEX idx_maintenance_priority ON public.maintenance USING btree (priority) |
| maintenance | idx_maintenance_property_deleted | CREATE INDEX idx_maintenance_property_deleted ON public.maintenance USING btree (property_id, deleted_at) WHERE (deleted_at IS NULL) |
| maintenance | idx_maintenance_property_id | CREATE INDEX idx_maintenance_property_id ON public.maintenance USING btree (property_id) |
| maintenance | idx_maintenance_status | CREATE INDEX idx_maintenance_status ON public.maintenance USING btree (status) |
| maintenance | idx_maintenance_status_deleted | CREATE INDEX idx_maintenance_status_deleted ON public.maintenance USING btree (status, deleted_at) WHERE (deleted_at IS NULL) |
| maintenance | idx_maintenance_tenant_deleted | CREATE INDEX idx_maintenance_tenant_deleted ON public.maintenance USING btree (tenant_id, deleted_at) WHERE (deleted_at IS NULL) |
| maintenance | idx_maintenance_tenant_id | CREATE INDEX idx_maintenance_tenant_id ON public.maintenance USING btree (tenant_id) |
| maintenance | idx_maintenance_tenant_status_created | CREATE INDEX idx_maintenance_tenant_status_created ON public.maintenance USING btree (tenant_id, status, created_at DESC, deleted_at) WHERE (deleted_at IS NULL) |
| maintenance | maintenance_pkey | CREATE UNIQUE INDEX maintenance_pkey ON public.maintenance USING btree (id) |
| mv_property_expense_summary | idx_mv_property_expense_summary_admin | CREATE INDEX idx_mv_property_expense_summary_admin ON public.mv_property_expense_summary USING btree (admin_id) |
| mv_property_expense_summary | idx_mv_property_expense_summary_property_id | CREATE UNIQUE INDEX idx_mv_property_expense_summary_property_id ON public.mv_property_expense_summary USING btree (property_id) |
| mv_unit_performance | idx_mv_unit_performance_property | CREATE INDEX idx_mv_unit_performance_property ON public.mv_unit_performance USING btree (property_id, status) |
| mv_unit_performance | idx_mv_unit_performance_status | CREATE INDEX idx_mv_unit_performance_status ON public.mv_unit_performance USING btree (status, days_vacant) |
| mv_unit_performance | idx_mv_unit_performance_unit_id | CREATE UNIQUE INDEX idx_mv_unit_performance_unit_id ON public.mv_unit_performance USING btree (unit_id) |
| notifications | idx_notifications_active | CREATE INDEX idx_notifications_active ON public.notifications USING btree (id) WHERE (deleted_at IS NULL) |
| notifications | idx_notifications_created | CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC) |
| notifications | idx_notifications_deleted_at | CREATE INDEX idx_notifications_deleted_at ON public.notifications USING btree (deleted_at) |
| notifications | idx_notifications_tenant_read | CREATE INDEX idx_notifications_tenant_read ON public.notifications USING btree (tenant_id, is_read) WHERE (tenant_id IS NOT NULL) |
| notifications | idx_notifications_user_created | CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC) WHERE (deleted_at IS NULL) |
| notifications | idx_notifications_user_read | CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read) |
| notifications | notifications_pkey | CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id) |
| payment_receipts | payment_receipts_pkey | CREATE UNIQUE INDEX payment_receipts_pkey ON public.payment_receipts USING btree (id) |
| payment_receipts | payment_receipts_receipt_number_key | CREATE UNIQUE INDEX payment_receipts_receipt_number_key ON public.payment_receipts USING btree (receipt_number) |
| payments | idx_payments_active | CREATE INDEX idx_payments_active ON public.payments USING btree (id) WHERE (deleted_at IS NULL) |
| payments | idx_payments_completed_tenant_date | CREATE INDEX idx_payments_completed_tenant_date ON public.payments USING btree (tenant_id, date DESC) WHERE ((deleted_at IS NULL) AND ((status)::text = 'completed'::text)) |
| payments | idx_payments_covering_history | CREATE INDEX idx_payments_covering_history ON public.payments USING btree (tenant_id, deleted_at, date DESC) INCLUDE (amount, type, method, status) WHERE (deleted_at IS NULL) |
| payments | idx_payments_date | CREATE INDEX idx_payments_date ON public.payments USING btree (date) |
| payments | idx_payments_date_deleted | CREATE INDEX idx_payments_date_deleted ON public.payments USING btree (date, deleted_at) WHERE (deleted_at IS NULL) |
| payments | idx_payments_deleted_at | CREATE INDEX idx_payments_deleted_at ON public.payments USING btree (deleted_at) |
| payments | idx_payments_status | CREATE INDEX idx_payments_status ON public.payments USING btree (status) |
| payments | idx_payments_status_deleted | CREATE INDEX idx_payments_status_deleted ON public.payments USING btree (status, deleted_at) WHERE (deleted_at IS NULL) |
| payments | idx_payments_tenant_deleted | CREATE INDEX idx_payments_tenant_deleted ON public.payments USING btree (tenant_id, deleted_at) WHERE (deleted_at IS NULL) |
| payments | idx_payments_tenant_id | CREATE INDEX idx_payments_tenant_id ON public.payments USING btree (tenant_id) |
| payments | idx_payments_tenant_status_created | CREATE INDEX idx_payments_tenant_status_created ON public.payments USING btree (tenant_id, status, created_at DESC, deleted_at) WHERE (deleted_at IS NULL) |
| payments | payments_pkey | CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id) |
| properties | idx_properties_active | CREATE INDEX idx_properties_active ON public.properties USING btree (id) WHERE (deleted_at IS NULL) |
| properties | idx_properties_admin_created | CREATE INDEX idx_properties_admin_created ON public.properties USING btree (admin_id, created_at DESC, deleted_at) WHERE (deleted_at IS NULL) |
| properties | idx_properties_admin_deleted | CREATE INDEX idx_properties_admin_deleted ON public.properties USING btree (admin_id, deleted_at) WHERE (deleted_at IS NULL) |
| properties | idx_properties_covering_dashboard | CREATE INDEX idx_properties_covering_dashboard ON public.properties USING btree (admin_id, deleted_at, created_at DESC) INCLUDE (name, address, units, rent, status) WHERE (deleted_at IS NULL) |
| properties | idx_properties_deleted_at | CREATE INDEX idx_properties_deleted_at ON public.properties USING btree (deleted_at) |
| properties | idx_properties_id_deleted | CREATE INDEX idx_properties_id_deleted ON public.properties USING btree (id, deleted_at) WHERE (deleted_at IS NULL) |
| properties | idx_properties_images | CREATE INDEX idx_properties_images ON public.properties USING gin (images) |
| properties | properties_pkey | CREATE UNIQUE INDEX properties_pkey ON public.properties USING btree (id) |
| property_announcements | idx_announcements_property_published | CREATE INDEX idx_announcements_property_published ON public.property_announcements USING btree (property_id, published, published_at DESC) |
| property_announcements | property_announcements_pkey | CREATE UNIQUE INDEX property_announcements_pkey ON public.property_announcements USING btree (id) |
| property_expenses | idx_property_expenses_capital | CREATE INDEX idx_property_expenses_capital ON public.property_expenses USING btree (is_capital_expense, expense_date DESC) |
| property_expenses | idx_property_expenses_category | CREATE INDEX idx_property_expenses_category ON public.property_expenses USING btree (expense_category, expense_date DESC) |
| property_expenses | idx_property_expenses_property_date | CREATE INDEX idx_property_expenses_property_date ON public.property_expenses USING btree (property_id, expense_date DESC) |
| property_expenses | idx_property_expenses_recurring | CREATE INDEX idx_property_expenses_recurring ON public.property_expenses USING btree (is_recurring, expense_date) |
| property_expenses | idx_property_expenses_status | CREATE INDEX idx_property_expenses_status ON public.property_expenses USING btree (payment_status) |
| property_expenses | idx_property_expenses_vendor | CREATE INDEX idx_property_expenses_vendor ON public.property_expenses USING btree (vendor_name, expense_date DESC) |
| property_expenses | property_expenses_pkey | CREATE UNIQUE INDEX property_expenses_pkey ON public.property_expenses USING btree (id) |
| property_images_archive | idx_property_images_archive_deleted_at | CREATE INDEX idx_property_images_archive_deleted_at ON public.property_images_archive USING btree (deleted_at) |
| property_images_archive | idx_property_images_archive_property_id | CREATE INDEX idx_property_images_archive_property_id ON public.property_images_archive USING btree (property_id) |
| property_images_archive | property_images_archive_pkey | CREATE UNIQUE INDEX property_images_archive_pkey ON public.property_images_archive USING btree (id) |
| property_metrics | idx_property_metrics_date | CREATE INDEX idx_property_metrics_date ON public.property_metrics USING btree (metric_date DESC) |
| property_metrics | idx_property_metrics_occupancy | CREATE INDEX idx_property_metrics_occupancy ON public.property_metrics USING btree (occupancy_rate DESC) |
| property_metrics | idx_property_metrics_property_date | CREATE INDEX idx_property_metrics_property_date ON public.property_metrics USING btree (property_id, metric_date DESC) |
| property_metrics | idx_property_metrics_revenue | CREATE INDEX idx_property_metrics_revenue ON public.property_metrics USING btree (revenue DESC) |
| property_metrics | property_metrics_pkey | CREATE UNIQUE INDEX property_metrics_pkey ON public.property_metrics USING btree (id) |
| property_metrics | property_metrics_property_id_metric_date_key | CREATE UNIQUE INDEX property_metrics_property_id_metric_date_key ON public.property_metrics USING btree (property_id, metric_date) |
| property_units | idx_property_units_property | CREATE INDEX idx_property_units_property ON public.property_units USING btree (property_id, status) |
| property_units | idx_property_units_rent | CREATE INDEX idx_property_units_rent ON public.property_units USING btree (base_rent) |
| property_units | idx_property_units_status | CREATE INDEX idx_property_units_status ON public.property_units USING btree (status) WHERE ((status)::text = 'vacant'::text) |
| property_units | idx_property_units_tenant | CREATE INDEX idx_property_units_tenant ON public.property_units USING btree (current_tenant_id) |
| property_units | idx_property_units_type | CREATE INDEX idx_property_units_type ON public.property_units USING btree (unit_type) |
| property_units | idx_property_units_vacant | CREATE INDEX idx_property_units_vacant ON public.property_units USING btree (property_id, days_vacant) WHERE ((status)::text = 'vacant'::text) |
| property_units | property_units_pkey | CREATE UNIQUE INDEX property_units_pkey ON public.property_units USING btree (id) |
| property_units | property_units_property_id_unit_number_key | CREATE UNIQUE INDEX property_units_property_id_unit_number_key ON public.property_units USING btree (property_id, unit_number) |
| recurring_expenses | idx_recurring_expenses_category | CREATE INDEX idx_recurring_expenses_category ON public.recurring_expenses USING btree (expense_category) |
| recurring_expenses | idx_recurring_expenses_next_due | CREATE INDEX idx_recurring_expenses_next_due ON public.recurring_expenses USING btree (next_due_date) WHERE (is_active = true) |
| recurring_expenses | idx_recurring_expenses_property | CREATE INDEX idx_recurring_expenses_property ON public.recurring_expenses USING btree (property_id, is_active) |
| recurring_expenses | recurring_expenses_pkey | CREATE UNIQUE INDEX recurring_expenses_pkey ON public.recurring_expenses USING btree (id) |
| tenant_announcement_reads | idx_announcement_reads_tenant | CREATE INDEX idx_announcement_reads_tenant ON public.tenant_announcement_reads USING btree (tenant_id, viewed_at DESC) |
| tenant_announcement_reads | tenant_announcement_reads_announcement_id_tenant_id_key | CREATE UNIQUE INDEX tenant_announcement_reads_announcement_id_tenant_id_key ON public.tenant_announcement_reads USING btree (announcement_id, tenant_id) |
| tenant_announcement_reads | tenant_announcement_reads_pkey | CREATE UNIQUE INDEX tenant_announcement_reads_pkey ON public.tenant_announcement_reads USING btree (id) |
| tenant_autopay | tenant_autopay_pkey | CREATE UNIQUE INDEX tenant_autopay_pkey ON public.tenant_autopay USING btree (id) |
| tenant_autopay | tenant_autopay_tenant_id_key | CREATE UNIQUE INDEX tenant_autopay_tenant_id_key ON public.tenant_autopay USING btree (tenant_id) |
| tenant_dashboard_widgets | idx_dashboard_widgets_tenant | CREATE INDEX idx_dashboard_widgets_tenant ON public.tenant_dashboard_widgets USING btree (tenant_id, "position") |
| tenant_dashboard_widgets | tenant_dashboard_widgets_pkey | CREATE UNIQUE INDEX tenant_dashboard_widgets_pkey ON public.tenant_dashboard_widgets USING btree (id) |
| tenant_dashboard_widgets | tenant_dashboard_widgets_tenant_id_widget_type_key | CREATE UNIQUE INDEX tenant_dashboard_widgets_tenant_id_widget_type_key ON public.tenant_dashboard_widgets USING btree (tenant_id, widget_type) |
| tenant_home_summary | idx_tenant_home_summary_property | CREATE INDEX idx_tenant_home_summary_property ON public.tenant_home_summary USING btree (property_id) |
| tenant_home_summary | idx_tenant_home_summary_tenant | CREATE UNIQUE INDEX idx_tenant_home_summary_tenant ON public.tenant_home_summary USING btree (tenant_id) |
| tenant_notifications | idx_tenant_notifications_priority | CREATE INDEX idx_tenant_notifications_priority ON public.tenant_notifications USING btree (priority, created_at DESC) WHERE (read = false) |
| tenant_notifications | idx_tenant_notifications_tenant_read | CREATE INDEX idx_tenant_notifications_tenant_read ON public.tenant_notifications USING btree (tenant_id, read, created_at DESC) |
| tenant_notifications | tenant_notifications_pkey | CREATE UNIQUE INDEX tenant_notifications_pkey ON public.tenant_notifications USING btree (id) |
| tenant_payment_methods | idx_tenant_payment_methods_tenant | CREATE INDEX idx_tenant_payment_methods_tenant ON public.tenant_payment_methods USING btree (tenant_id) |
| tenant_payment_methods | tenant_payment_methods_pkey | CREATE UNIQUE INDEX tenant_payment_methods_pkey ON public.tenant_payment_methods USING btree (id) |
| tenant_preferences | tenant_preferences_pkey | CREATE UNIQUE INDEX tenant_preferences_pkey ON public.tenant_preferences USING btree (id) |
| tenant_preferences | tenant_preferences_tenant_id_key | CREATE UNIQUE INDEX tenant_preferences_tenant_id_key ON public.tenant_preferences USING btree (tenant_id) |
| tenant_quick_actions_log | idx_tenant_quick_actions_tenant | CREATE INDEX idx_tenant_quick_actions_tenant ON public.tenant_quick_actions_log USING btree (tenant_id, created_at DESC) |
| tenant_quick_actions_log | tenant_quick_actions_log_pkey | CREATE UNIQUE INDEX tenant_quick_actions_log_pkey ON public.tenant_quick_actions_log USING btree (id) |
| tenants | idx_tenant_user | CREATE INDEX idx_tenant_user ON public.tenants USING btree (user_id) |
| tenants | idx_tenants_active | CREATE INDEX idx_tenants_active ON public.tenants USING btree (id) WHERE (deleted_at IS NULL) |
| tenants | idx_tenants_active_property | CREATE INDEX idx_tenants_active_property ON public.tenants USING btree (property_id, created_at DESC) WHERE ((deleted_at IS NULL) AND ((status)::text = 'active'::text)) |
| tenants | idx_tenants_covering_list | CREATE INDEX idx_tenants_covering_list ON public.tenants USING btree (property_id, deleted_at, created_at DESC) INCLUDE (name, email, unit, status, rent, balance) WHERE (deleted_at IS NULL) |
| tenants | idx_tenants_deleted_at | CREATE INDEX idx_tenants_deleted_at ON public.tenants USING btree (deleted_at) |
| tenants | idx_tenants_email | CREATE INDEX idx_tenants_email ON public.tenants USING btree (email) |
| tenants | idx_tenants_lease_end_date | CREATE INDEX idx_tenants_lease_end_date ON public.tenants USING btree (lease_end_date) |
| tenants | idx_tenants_lease_status | CREATE INDEX idx_tenants_lease_status ON public.tenants USING btree (lease_status) |
| tenants | idx_tenants_property_created | CREATE INDEX idx_tenants_property_created ON public.tenants USING btree (property_id, created_at DESC, deleted_at) WHERE (deleted_at IS NULL) |
| tenants | idx_tenants_property_deleted | CREATE INDEX idx_tenants_property_deleted ON public.tenants USING btree (property_id, deleted_at) WHERE (deleted_at IS NULL) |
| tenants | idx_tenants_property_id | CREATE INDEX idx_tenants_property_id ON public.tenants USING btree (property_id) |
| tenants | idx_tenants_status | CREATE INDEX idx_tenants_status ON public.tenants USING btree (status) |
| tenants | idx_tenants_status_deleted | CREATE INDEX idx_tenants_status_deleted ON public.tenants USING btree (status, deleted_at) WHERE (deleted_at IS NULL) |
| tenants | idx_tenants_user_deleted | CREATE INDEX idx_tenants_user_deleted ON public.tenants USING btree (user_id, deleted_at) WHERE (deleted_at IS NULL) |
| tenants | idx_tenants_user_id | CREATE INDEX idx_tenants_user_id ON public.tenants USING btree (user_id) |
| tenants | tenants_email_key | CREATE UNIQUE INDEX tenants_email_key ON public.tenants USING btree (email) |
| tenants | tenants_pkey | CREATE UNIQUE INDEX tenants_pkey ON public.tenants USING btree (id) |
| tenants | unique_tenant_per_user | CREATE UNIQUE INDEX unique_tenant_per_user ON public.tenants USING btree (user_id) |
| tenants | unique_user_tenant | CREATE UNIQUE INDEX unique_user_tenant ON public.tenants USING btree (user_id) |
| token_blacklist | idx_token_blacklist_token | CREATE INDEX idx_token_blacklist_token ON public.token_blacklist USING btree (token) |
| token_blacklist | token_blacklist_pkey | CREATE UNIQUE INDEX token_blacklist_pkey ON public.token_blacklist USING btree (id) |
| token_blacklist | token_blacklist_token_key | CREATE UNIQUE INDEX token_blacklist_token_key ON public.token_blacklist USING btree (token) |
| unit_status_history | idx_unit_status_history_tenant | CREATE INDEX idx_unit_status_history_tenant ON public.unit_status_history USING btree (tenant_id) |
| unit_status_history | idx_unit_status_history_unit | CREATE INDEX idx_unit_status_history_unit ON public.unit_status_history USING btree (unit_id, changed_at DESC) |
| unit_status_history | unit_status_history_pkey | CREATE UNIQUE INDEX unit_status_history_pkey ON public.unit_status_history USING btree (id) |
| users | idx_users_active | CREATE INDEX idx_users_active ON public.users USING btree (id) WHERE (deleted_at IS NULL) |
| users | idx_users_deleted_at | CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at) |
| users | idx_users_email | CREATE INDEX idx_users_email ON public.users USING btree (email) |
| users | idx_users_property_id | CREATE INDEX idx_users_property_id ON public.users USING btree (property_id) |
| users | idx_users_role | CREATE INDEX idx_users_role ON public.users USING btree (role) |
| users | idx_users_role_deleted | CREATE INDEX idx_users_role_deleted ON public.users USING btree (role, deleted_at) WHERE (deleted_at IS NULL) |
| users | idx_users_status | CREATE INDEX idx_users_status ON public.users USING btree (status) |
| users | users_email_key | CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email) |
| users | users_pkey | CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id) |

## Triggers

| table | trigger | event | timing | statement |
| --- | --- | --- | --- | --- |
| admin_action_items | trigger_action_items_timestamp | UPDATE | BEFORE | EXECUTE FUNCTION update_action_items_timestamp() |
| expense_budgets | trigger_expense_budgets_timestamp | UPDATE | BEFORE | EXECUTE FUNCTION update_expenses_timestamp() |
| payments | trg_payment_completed_balance_update | UPDATE | AFTER | EXECUTE FUNCTION update_tenant_balance_on_payment_completion() |
| property_expenses | trigger_property_expenses_timestamp | UPDATE | BEFORE | EXECUTE FUNCTION update_expenses_timestamp() |
| property_units | trigger_property_units_timestamp | UPDATE | BEFORE | EXECUTE FUNCTION update_units_timestamp() |
| property_units | trigger_unit_status_logging | UPDATE | AFTER | EXECUTE FUNCTION log_unit_status_change() |
| tenants | trigger_update_lease_status | INSERT | BEFORE | EXECUTE FUNCTION update_lease_status() |
| tenants | trigger_update_lease_status | UPDATE | BEFORE | EXECUTE FUNCTION update_lease_status() |

## Audit/Log Tables

- audit_logs
- tenant_quick_actions_log

## Soft Delete (deleted_at present)

- disputes
- documents
- lease_expiration_reminders
- leases
- maintenance
- notifications
- payments
- properties
- property_expenses
- property_images_archive
- property_units
- tenants
- users

## Enums

- document_category: lease, receipt, invoice, legal, photo, identification, other
- document_entity_type: property, tenant, maintenance, payment, user

## ERD (Mermaid)

```mermaid
erDiagram
  tenants {
    INTEGER id
    CHARACTER_VARYING name
    CHARACTER_VARYING email
    INTEGER property_id
    CHARACTER_VARYING unit
    NUMERIC rent
    CHARACTER_VARYING status
    DATE move_in
    NUMERIC balance
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
    INTEGER user_id
    DATE lease_start_date
    DATE lease_end_date
    CHARACTER_VARYING lease_status
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  maintenance {
    INTEGER id
    INTEGER tenant_id
    INTEGER property_id
    CHARACTER_VARYING unit
    TEXT issue
    CHARACTER_VARYING priority
    CHARACTER_VARYING status
    DATE date
    CHARACTER_VARYING assigned_to
    DATE completed_date
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
    CHARACTER_VARYING title
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  payments {
    INTEGER id
    INTEGER tenant_id
    NUMERIC amount
    DATE date
    CHARACTER_VARYING type
    CHARACTER_VARYING method
    CHARACTER_VARYING status
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  users {
    INTEGER id
    CHARACTER_VARYING name
    CHARACTER_VARYING email
    CHARACTER_VARYING password
    CHARACTER_VARYING role
    ARRAY properties
    INTEGER property_id
    CHARACTER_VARYING unit
    CHARACTER_VARYING status
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  notifications {
    INTEGER id
    INTEGER user_id
    INTEGER tenant_id
    CHARACTER_VARYING title
    TEXT message
    BOOLEAN is_read
    CHARACTER_VARYING type
    JSONB data
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  properties {
    INTEGER id
    CHARACTER_VARYING name
    TEXT address
    INTEGER units
    NUMERIC rent
    CHARACTER_VARYING status
    INTEGER admin_id
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
    JSONB images
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  documents {
    INTEGER id
    CHARACTER_VARYING name
    CHARACTER_VARYING type
    CHARACTER_VARYING file_path
    INTEGER file_size
    CHARACTER_VARYING mime_type
    INTEGER uploaded_by
    INTEGER tenant_id
    INTEGER property_id
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
    USER_DEFINED entity_type
    INTEGER entity_id
    USER_DEFINED category
    TEXT description
  }
  audit_logs {
    INTEGER id
    INTEGER user_id
    CHARACTER_VARYING user_email
    CHARACTER_VARYING user_role
    CHARACTER_VARYING action
    CHARACTER_VARYING resource_type
    INTEGER resource_id
    JSONB old_values
    JSONB new_values
    CHARACTER_VARYING ip_address
    TEXT user_agent
    CHARACTER_VARYING status
    TEXT error_message
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
  }
  admin_dashboard_metrics {
    INTEGER id
    INTEGER admin_id
    DATE metric_date
    INTEGER total_properties
    INTEGER total_units
    INTEGER occupied_units
    INTEGER vacant_units
    NUMERIC occupancy_rate
    NUMERIC monthly_revenue
    NUMERIC collected_revenue
    NUMERIC pending_revenue
    NUMERIC collection_rate
    NUMERIC total_expenses
    NUMERIC net_income
    INTEGER active_maintenance_requests
    INTEGER overdue_maintenance_requests
    NUMERIC avg_maintenance_resolution_hours
    INTEGER total_tenants
    INTEGER new_tenants_this_month
    INTEGER churned_tenants_this_month
    INTEGER leases_expiring_30_days
    INTEGER leases_expiring_60_days
    INTEGER late_payments_count
    INTEGER urgent_maintenance_count
    INTEGER compliance_issues_count
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
  }
  property_units {
    INTEGER id
    INTEGER property_id
    CHARACTER_VARYING unit_number
    INTEGER floor
    NUMERIC bedrooms
    NUMERIC bathrooms
    INTEGER square_feet
    CHARACTER_VARYING unit_type
    JSONB amenities
    CHARACTER_VARYING status
    CHARACTER_VARYING condition
    NUMERIC base_rent
    NUMERIC market_rent
    NUMERIC deposit_amount
    INTEGER current_tenant_id
    DATE occupied_since
    DATE last_vacated
    INTEGER days_vacant
    BOOLEAN listed
    DATE listed_date
    JSONB listing_platforms
    TEXT notes
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  token_blacklist {
    INTEGER id
    CHARACTER_VARYING token
    INTEGER user_id
    TIMESTAMP_WITHOUT_TIME_ZONE blacklisted_at
    TIMESTAMP_WITHOUT_TIME_ZONE expires_at
  }
  expense_categories {
    INTEGER id
    CHARACTER_VARYING category_name
    CHARACTER_VARYING parent_category
    TEXT description
    BOOLEAN is_capital_expense
    BOOLEAN tax_deductible
    BOOLEAN budget_required
    JSONB standard_subcategories
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  property_expenses {
    INTEGER id
    INTEGER property_id
    CHARACTER_VARYING expense_category
    CHARACTER_VARYING subcategory
    TEXT description
    NUMERIC amount
    DATE expense_date
    CHARACTER_VARYING vendor_name
    CHARACTER_VARYING vendor_contact
    CHARACTER_VARYING payment_method
    CHARACTER_VARYING payment_status
    DATE paid_date
    CHARACTER_VARYING receipt_url
    CHARACTER_VARYING invoice_number
    BOOLEAN is_recurring
    BOOLEAN is_capital_expense
    CHARACTER_VARYING recurrence_pattern
    CHARACTER_VARYING budget_category
    NUMERIC budget_amount
    NUMERIC variance_amount
    TEXT notes
    INTEGER recorded_by
    INTEGER approved_by
    DATE approved_date
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  lease_expiration_reminders {
    INTEGER id
    INTEGER tenant_id
    INTEGER property_id
    CHARACTER_VARYING reminder_type
    TIMESTAMP_WITHOUT_TIME_ZONE sent_at
    CHARACTER_VARYING sent_to_email
    BOOLEAN acknowledged
    TIMESTAMP_WITHOUT_TIME_ZONE acknowledged_at
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  property_metrics {
    INTEGER id
    INTEGER property_id
    DATE metric_date
    INTEGER total_units
    INTEGER occupied_units
    NUMERIC occupancy_rate
    NUMERIC avg_days_to_fill_vacancy
    NUMERIC revenue
    NUMERIC collected
    NUMERIC collection_rate
    NUMERIC expenses
    NUMERIC net_operating_income
    INTEGER maintenance_requests
    INTEGER maintenance_resolved
    NUMERIC maintenance_cost
    NUMERIC avg_resolution_time_hours
    NUMERIC avg_tenant_satisfaction
    NUMERIC renewal_rate
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
  }
  admin_action_items {
    INTEGER id
    INTEGER admin_id
    INTEGER property_id
    INTEGER tenant_id
    CHARACTER_VARYING item_type
    CHARACTER_VARYING priority
    CHARACTER_VARYING title
    TEXT description
    CHARACTER_VARYING status
    DATE due_date
    TIMESTAMP_WITHOUT_TIME_ZONE completed_at
    TIMESTAMP_WITHOUT_TIME_ZONE dismissed_at
    TEXT dismissal_reason
    JSONB metadata
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  expense_budgets {
    INTEGER id
    INTEGER property_id
    INTEGER budget_year
    CHARACTER_VARYING budget_period
    INTEGER budget_month
    NUMERIC maintenance_budget
    NUMERIC utilities_budget
    NUMERIC insurance_budget
    NUMERIC tax_budget
    NUMERIC management_fee_budget
    NUMERIC marketing_budget
    NUMERIC repairs_budget
    NUMERIC other_budget
    NUMERIC total_budget
    CHARACTER_VARYING budget_status
    INTEGER approved_by
    DATE approved_date
    TEXT notes
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  recurring_expenses {
    INTEGER id
    INTEGER property_id
    CHARACTER_VARYING expense_category
    CHARACTER_VARYING subcategory
    TEXT description
    NUMERIC amount
    CHARACTER_VARYING recurrence_type
    INTEGER recurrence_interval
    INTEGER day_of_month
    INTEGER month_of_year
    DATE start_date
    DATE end_date
    DATE next_due_date
    DATE last_generated_date
    CHARACTER_VARYING vendor_name
    CHARACTER_VARYING vendor_contact
    BOOLEAN is_active
    BOOLEAN auto_generate
    TEXT notes
    INTEGER created_by
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  leases {
    INTEGER id
    INTEGER tenant_id
    INTEGER property_id
    CHARACTER_VARYING unit
    NUMERIC rent
    DATE start_date
    DATE end_date
    CHARACTER_VARYING status
    TEXT document_url
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  disputes {
    INTEGER id
    INTEGER tenant_id
    INTEGER charge_id
    TEXT reason
    CHARACTER_VARYING status
    TEXT resolution
    INTEGER resolved_by
    TIMESTAMP_WITHOUT_TIME_ZONE resolved_at
    INTEGER created_by
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
  }
  property_images_archive {
    INTEGER id
    INTEGER property_id
    UUID image_id
    CHARACTER_VARYING image_url
    INTEGER size
    CHARACTER_VARYING mime_type
    TIMESTAMP_WITHOUT_TIME_ZONE uploaded_at
    TIMESTAMP_WITHOUT_TIME_ZONE deleted_at
    INTEGER deleted_by
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
  }
  lease_history {
    INTEGER id
    INTEGER tenant_id
    DATE lease_start_date
    DATE lease_end_date
    CHARACTER_VARYING status
    TEXT notes
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  unit_status_history {
    INTEGER id
    INTEGER unit_id
    CHARACTER_VARYING old_status
    CHARACTER_VARYING new_status
    TIMESTAMP_WITHOUT_TIME_ZONE changed_at
    INTEGER changed_by
    INTEGER tenant_id
    TEXT reason
    TEXT notes
    NUMERIC rent_change
    NUMERIC old_rent
    NUMERIC new_rent
  }
  tenant_notifications {
    INTEGER id
    INTEGER tenant_id
    CHARACTER_VARYING notification_type
    CHARACTER_VARYING priority
    CHARACTER_VARYING title
    TEXT message
    CHARACTER_VARYING action_url
    CHARACTER_VARYING action_label
    BOOLEAN read
    TIMESTAMP_WITHOUT_TIME_ZONE read_at
    BOOLEAN dismissed
    JSONB delivered_via
    TIMESTAMP_WITHOUT_TIME_ZONE sent_at
    JSONB metadata
    TIMESTAMP_WITHOUT_TIME_ZONE expires_at
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
  }
  tenant_dashboard_widgets {
    INTEGER id
    INTEGER tenant_id
    CHARACTER_VARYING widget_type
    INTEGER position
    BOOLEAN visible
    JSONB settings
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  tenant_announcement_reads {
    INTEGER id
    INTEGER announcement_id
    INTEGER tenant_id
    TIMESTAMP_WITHOUT_TIME_ZONE viewed_at
    BOOLEAN acknowledged
    TIMESTAMP_WITHOUT_TIME_ZONE acknowledged_at
  }
  payment_receipts {
    INTEGER id
    INTEGER payment_id
    CHARACTER_VARYING receipt_number
    TEXT pdf_url
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
  }
  admin_quick_actions {
    INTEGER id
    INTEGER admin_id
    CHARACTER_VARYING action_type
    CHARACTER_VARYING entity_type
    INTEGER entity_id
    INTEGER execution_time_ms
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
  }
  property_announcements {
    INTEGER id
    INTEGER property_id
    CHARACTER_VARYING title
    TEXT content
    CHARACTER_VARYING announcement_type
    CHARACTER_VARYING priority
    BOOLEAN target_all_tenants
    JSONB target_specific_units
    BOOLEAN published
    TIMESTAMP_WITHOUT_TIME_ZONE published_at
    TIMESTAMP_WITHOUT_TIME_ZONE expires_at
    INTEGER views_count
    INTEGER acknowledged_count
    JSONB attachments
    INTEGER created_by
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  tenant_preferences {
    INTEGER id
    INTEGER tenant_id
    BOOLEAN email_notifications
    BOOLEAN sms_notifications
    BOOLEAN push_notifications
    BOOLEAN payment_reminders
    BOOLEAN maintenance_updates
    BOOLEAN lease_reminders
    BOOLEAN community_announcements
    CHARACTER_VARYING preferred_contact_method
    CHARACTER_VARYING preferred_contact_time
    CHARACTER_VARYING dashboard_layout
    CHARACTER_VARYING theme
    CHARACTER_VARYING language
    BOOLEAN auto_pay_enabled
    CHARACTER_VARYING auto_pay_method
    INTEGER auto_pay_day_of_month
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  tenant_quick_actions_log {
    INTEGER id
    INTEGER tenant_id
    CHARACTER_VARYING action_type
    INTEGER execution_time_ms
    BOOLEAN success
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
  }
  tenant_payment_methods {
    INTEGER id
    INTEGER tenant_id
    CHARACTER_VARYING type
    CHARACTER_VARYING last4
    CHARACTER_VARYING brand
    CHARACTER_VARYING token
    BOOLEAN is_default
    BOOLEAN is_active
    CHARACTER_VARYING nickname
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  tenant_autopay {
    INTEGER id
    INTEGER tenant_id
    INTEGER payment_method_id
    BOOLEAN is_enabled
    INTEGER day_of_month
    CHARACTER_VARYING amount_type
    NUMERIC fixed_amount
    DATE next_execution_date
    INTEGER consecutive_failures
    TIMESTAMP_WITHOUT_TIME_ZONE last_executed_at
    TIMESTAMP_WITHOUT_TIME_ZONE created_at
    TIMESTAMP_WITHOUT_TIME_ZONE updated_at
  }
  admin_action_items }o--|| users : "admin_id -> id"
  admin_action_items }o--|| properties : "property_id -> id"
  admin_action_items }o--|| tenants : "tenant_id -> id"
  admin_dashboard_metrics }o--|| users : "admin_id -> id"
  admin_quick_actions }o--|| users : "admin_id -> id"
  audit_logs }o--|| users : "user_id -> id"
  disputes }o--|| users : "created_by -> id"
  disputes }o--|| users : "resolved_by -> id"
  disputes }o--|| tenants : "tenant_id -> id"
  disputes }o--|| users : "deleted_by -> id"
  documents }o--|| properties : "property_id -> id"
  documents }o--|| tenants : "tenant_id -> id"
  documents }o--|| users : "uploaded_by -> id"
  documents }o--|| users : "deleted_by -> id"
  expense_budgets }o--|| users : "approved_by -> id"
  expense_budgets }o--|| properties : "property_id -> id"
  lease_expiration_reminders }o--|| users : "deleted_by -> id"
  lease_expiration_reminders }o--|| properties : "property_id -> id"
  lease_expiration_reminders }o--|| tenants : "tenant_id -> id"
  lease_history }o--|| tenants : "tenant_id -> id"
  leases }o--|| users : "deleted_by -> id"
  leases }o--|| properties : "property_id -> id"
  leases }o--|| tenants : "tenant_id -> id"
  maintenance }o--|| users : "deleted_by -> id"
  maintenance }o--|| properties : "property_id -> id"
  maintenance }o--|| tenants : "tenant_id -> id"
  notifications }o--|| users : "deleted_by -> id"
  notifications }o--|| users : "user_id -> id"
  payment_receipts }o--|| payments : "payment_id -> id"
  payments }o--|| users : "deleted_by -> id"
  payments }o--|| tenants : "tenant_id -> id"
  properties }o--|| users : "deleted_by -> id"
  property_announcements }o--|| users : "created_by -> id"
  property_announcements }o--|| properties : "property_id -> id"
  property_expenses }o--|| users : "approved_by -> id"
  property_expenses }o--|| properties : "property_id -> id"
  property_expenses }o--|| users : "recorded_by -> id"
  property_images_archive }o--|| users : "deleted_by -> id"
  property_images_archive }o--|| properties : "property_id -> id"
  property_metrics }o--|| properties : "property_id -> id"
  property_units }o--|| tenants : "current_tenant_id -> id"
  property_units }o--|| properties : "property_id -> id"
  recurring_expenses }o--|| users : "created_by -> id"
  recurring_expenses }o--|| properties : "property_id -> id"
  tenant_announcement_reads }o--|| property_announcements : "announcement_id -> id"
  tenant_announcement_reads }o--|| tenants : "tenant_id -> id"
  tenant_autopay }o--|| tenant_payment_methods : "payment_method_id -> id"
  tenant_autopay }o--|| tenants : "tenant_id -> id"
  tenant_dashboard_widgets }o--|| tenants : "tenant_id -> id"
  tenant_notifications }o--|| tenants : "tenant_id -> id"
  tenant_payment_methods }o--|| tenants : "tenant_id -> id"
  tenant_preferences }o--|| tenants : "tenant_id -> id"
  tenant_quick_actions_log }o--|| tenants : "tenant_id -> id"
  tenants }o--|| users : "user_id -> id"
  tenants }o--|| users : "deleted_by -> id"
  tenants }o--|| users : "user_id -> id"
  tenants }o--|| properties : "property_id -> id"
  token_blacklist }o--|| users : "user_id -> id"
  unit_status_history }o--|| users : "changed_by -> id"
  unit_status_history }o--|| tenants : "tenant_id -> id"
  unit_status_history }o--|| property_units : "unit_id -> id"
  users }o--|| properties : "property_id -> id"
```

## Data Dictionary

## tenants

- Rows: 18
- Size: 352 kB
- Primary key: id
- Unique constraints:
tenants_email_key: (email)
unique_tenant_per_user: (user_id)
unique_user_tenant: (user_id)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('tenants_id_seq'::regclass) |  |
| name | character varying | NO |  | 255 |
| email | character varying | NO |  | 255 |
| property_id | integer | NO |  |  |
| unit | character varying | NO |  | 50 |
| rent | numeric | NO |  |  |
| status | character varying | YES | 'active'::character varying | 50 |
| move_in | date | NO |  |  |
| balance | numeric | YES | 0.00 |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| user_id | integer | NO |  |  |
| lease_start_date | date | YES |  |  |
| lease_end_date | date | YES |  |  |
| lease_status | character varying | YES | 'active'::character varying | 50 |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## maintenance

- Rows: 6
- Size: 208 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('maintenance_id_seq'::regclass) |  |
| tenant_id | integer | NO |  |  |
| property_id | integer | NO |  |  |
| unit | character varying | NO |  | 50 |
| issue | text | NO |  |  |
| priority | character varying | YES | 'medium'::character varying | 20 |
| status | character varying | YES | 'open'::character varying | 20 |
| date | date | NO |  |  |
| assigned_to | character varying | YES |  | 255 |
| completed_date | date | YES |  |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| title | character varying | NO | 'Maintenance Request'::character varying | 255 |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## payments

- Rows: 5
- Size: 200 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('payments_id_seq'::regclass) |  |
| tenant_id | integer | NO |  |  |
| amount | numeric | NO |  |  |
| date | date | NO |  |  |
| type | character varying | NO |  | 50 |
| method | character varying | NO |  | 50 |
| status | character varying | YES | 'pending'::character varying | 50 |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## users

- Rows: 52
- Size: 192 kB
- Primary key: id
- Unique constraints:
users_email_key: (email)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('users_id_seq'::regclass) |  |
| name | character varying | NO |  | 255 |
| email | character varying | NO |  | 255 |
| password | character varying | NO |  | 255 |
| role | character varying | NO |  | 50 |
| properties | ARRAY | YES |  |  |
| property_id | integer | YES |  |  |
| unit | character varying | YES |  | 50 |
| status | character varying | YES | 'active'::character varying | 50 |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## notifications

- Rows: 27
- Size: 152 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('notifications_id_seq'::regclass) |  |
| user_id | integer | YES |  |  |
| tenant_id | integer | YES |  |  |
| title | character varying | NO |  | 255 |
| message | text | NO |  |  |
| is_read | boolean | YES | false |  |
| type | character varying | YES |  | 50 |
| data | jsonb | YES |  |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## properties

- Rows: 5
- Size: 144 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('properties_id_seq'::regclass) |  |
| name | character varying | NO |  | 255 |
| address | text | NO |  |  |
| units | integer | NO |  |  |
| rent | numeric | NO |  |  |
| status | character varying | YES | 'active'::character varying | 50 |
| admin_id | integer | YES |  |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| images | jsonb | NO | '[]'::jsonb |  |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## documents

- Rows: 6
- Size: 144 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('documents_id_seq'::regclass) |  |
| name | character varying | NO |  | 255 |
| type | character varying | NO |  | 50 |
| file_path | character varying | NO |  | 500 |
| file_size | integer | YES |  |  |
| mime_type | character varying | YES |  | 100 |
| uploaded_by | integer | NO |  |  |
| tenant_id | integer | YES |  |  |
| property_id | integer | YES |  |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |
| entity_type | USER-DEFINED | YES |  |  |
| entity_id | integer | YES |  |  |
| category | USER-DEFINED | YES | 'other'::document_category |  |
| description | text | YES |  |  |

## audit_logs

- Rows: 36
- Size: 128 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('audit_logs_id_seq'::regclass) |  |
| user_id | integer | YES |  |  |
| user_email | character varying | YES |  | 255 |
| user_role | character varying | YES |  | 50 |
| action | character varying | NO |  | 50 |
| resource_type | character varying | NO |  | 50 |
| resource_id | integer | YES |  |  |
| old_values | jsonb | YES |  |  |
| new_values | jsonb | YES |  |  |
| ip_address | character varying | YES |  | 50 |
| user_agent | text | YES |  |  |
| status | character varying | YES | 'success'::character varying | 20 |
| error_message | text | YES |  |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |

## admin_dashboard_metrics

- Rows: 10
- Size: 104 kB
- Primary key: id
- Unique constraints:
admin_dashboard_metrics_admin_id_metric_date_key: (admin_id, metric_date)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('admin_dashboard_metrics_id_seq'::regclass) |  |
| admin_id | integer | YES |  |  |
| metric_date | date | NO |  |  |
| total_properties | integer | YES | 0 |  |
| total_units | integer | YES | 0 |  |
| occupied_units | integer | YES | 0 |  |
| vacant_units | integer | YES | 0 |  |
| occupancy_rate | numeric | YES |  |  |
| monthly_revenue | numeric | YES | 0 |  |
| collected_revenue | numeric | YES | 0 |  |
| pending_revenue | numeric | YES | 0 |  |
| collection_rate | numeric | YES |  |  |
| total_expenses | numeric | YES | 0 |  |
| net_income | numeric | YES |  |  |
| active_maintenance_requests | integer | YES | 0 |  |
| overdue_maintenance_requests | integer | YES | 0 |  |
| avg_maintenance_resolution_hours | numeric | YES |  |  |
| total_tenants | integer | YES | 0 |  |
| new_tenants_this_month | integer | YES | 0 |  |
| churned_tenants_this_month | integer | YES | 0 |  |
| leases_expiring_30_days | integer | YES | 0 |  |
| leases_expiring_60_days | integer | YES | 0 |  |
| late_payments_count | integer | YES | 0 |  |
| urgent_maintenance_count | integer | YES | 0 |  |
| compliance_issues_count | integer | YES | 0 |  |
| created_at | timestamp without time zone | YES | now() |  |

## property_units

- Rows: 0
- Size: 72 kB
- Primary key: id
- Unique constraints:
property_units_property_id_unit_number_key: (property_id, unit_number)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('property_units_id_seq'::regclass) |  |
| property_id | integer | YES |  |  |
| unit_number | character varying | NO |  | 50 |
| floor | integer | YES |  |  |
| bedrooms | numeric | YES |  |  |
| bathrooms | numeric | YES |  |  |
| square_feet | integer | YES |  |  |
| unit_type | character varying | YES |  | 50 |
| amenities | jsonb | YES |  |  |
| status | character varying | YES | 'vacant'::character varying | 50 |
| condition | character varying | YES |  | 50 |
| base_rent | numeric | YES |  |  |
| market_rent | numeric | YES |  |  |
| deposit_amount | numeric | YES |  |  |
| current_tenant_id | integer | YES |  |  |
| occupied_since | date | YES |  |  |
| last_vacated | date | YES |  |  |
| days_vacant | integer | YES | 0 |  |
| listed | boolean | YES | false |  |
| listed_date | date | YES |  |  |
| listing_platforms | jsonb | YES |  |  |
| notes | text | YES |  |  |
| deleted_at | timestamp without time zone | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## token_blacklist

- Rows: 24
- Size: 64 kB
- Primary key: id
- Unique constraints:
token_blacklist_token_key: (token)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('token_blacklist_id_seq'::regclass) |  |
| token | character varying | NO |  | 500 |
| user_id | integer | YES |  |  |
| blacklisted_at | timestamp without time zone | YES | now() |  |
| expires_at | timestamp without time zone | NO |  |  |

## expense_categories

- Rows: 8
- Size: 64 kB
- Primary key: id
- Unique constraints:
expense_categories_category_name_key: (category_name)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('expense_categories_id_seq'::regclass) |  |
| category_name | character varying | NO |  | 100 |
| parent_category | character varying | YES |  | 100 |
| description | text | YES |  |  |
| is_capital_expense | boolean | YES | false |  |
| tax_deductible | boolean | YES | true |  |
| budget_required | boolean | YES | false |  |
| standard_subcategories | jsonb | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## property_expenses

- Rows: 0
- Size: 64 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('property_expenses_id_seq'::regclass) |  |
| property_id | integer | YES |  |  |
| expense_category | character varying | YES |  | 100 |
| subcategory | character varying | YES |  | 100 |
| description | text | YES |  |  |
| amount | numeric | NO |  |  |
| expense_date | date | NO |  |  |
| vendor_name | character varying | YES |  | 255 |
| vendor_contact | character varying | YES |  | 255 |
| payment_method | character varying | YES |  | 50 |
| payment_status | character varying | YES | 'pending'::character varying | 50 |
| paid_date | date | YES |  |  |
| receipt_url | character varying | YES |  | 500 |
| invoice_number | character varying | YES |  | 100 |
| is_recurring | boolean | YES | false |  |
| is_capital_expense | boolean | YES | false |  |
| recurrence_pattern | character varying | YES |  | 50 |
| budget_category | character varying | YES |  | 100 |
| budget_amount | numeric | YES |  |  |
| variance_amount | numeric | YES |  |  |
| notes | text | YES |  |  |
| recorded_by | integer | YES |  |  |
| approved_by | integer | YES |  |  |
| approved_date | date | YES |  |  |
| deleted_at | timestamp without time zone | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## lease_expiration_reminders

- Rows: 0
- Size: 56 kB
- Primary key: id
- Unique constraints:
lease_expiration_reminders_tenant_id_reminder_type_key: (tenant_id, reminder_type)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('lease_expiration_reminders_id_seq'::regclass) |  |
| tenant_id | integer | NO |  |  |
| property_id | integer | NO |  |  |
| reminder_type | character varying | NO |  | 50 |
| sent_at | timestamp without time zone | NO | now() |  |
| sent_to_email | character varying | YES |  | 255 |
| acknowledged | boolean | YES | false |  |
| acknowledged_at | timestamp without time zone | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## property_metrics

- Rows: 0
- Size: 48 kB
- Primary key: id
- Unique constraints:
property_metrics_property_id_metric_date_key: (property_id, metric_date)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('property_metrics_id_seq'::regclass) |  |
| property_id | integer | YES |  |  |
| metric_date | date | NO |  |  |
| total_units | integer | YES |  |  |
| occupied_units | integer | YES |  |  |
| occupancy_rate | numeric | YES |  |  |
| avg_days_to_fill_vacancy | numeric | YES |  |  |
| revenue | numeric | YES | 0 |  |
| collected | numeric | YES | 0 |  |
| collection_rate | numeric | YES |  |  |
| expenses | numeric | YES | 0 |  |
| net_operating_income | numeric | YES |  |  |
| maintenance_requests | integer | YES | 0 |  |
| maintenance_resolved | integer | YES | 0 |  |
| maintenance_cost | numeric | YES | 0 |  |
| avg_resolution_time_hours | numeric | YES |  |  |
| avg_tenant_satisfaction | numeric | YES |  |  |
| renewal_rate | numeric | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |

## admin_action_items

- Rows: 0
- Size: 48 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('admin_action_items_id_seq'::regclass) |  |
| admin_id | integer | YES |  |  |
| property_id | integer | YES |  |  |
| tenant_id | integer | YES |  |  |
| item_type | character varying | YES |  | 50 |
| priority | character varying | YES |  | 20 |
| title | character varying | YES |  | 255 |
| description | text | YES |  |  |
| status | character varying | YES | 'pending'::character varying | 20 |
| due_date | date | YES |  |  |
| completed_at | timestamp without time zone | YES |  |  |
| dismissed_at | timestamp without time zone | YES |  |  |
| dismissal_reason | text | YES |  |  |
| metadata | jsonb | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## expense_budgets

- Rows: 0
- Size: 40 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('expense_budgets_id_seq'::regclass) |  |
| property_id | integer | YES |  |  |
| budget_year | integer | NO |  |  |
| budget_period | character varying | YES |  | 20 |
| budget_month | integer | YES |  |  |
| maintenance_budget | numeric | YES | 0 |  |
| utilities_budget | numeric | YES | 0 |  |
| insurance_budget | numeric | YES | 0 |  |
| tax_budget | numeric | YES | 0 |  |
| management_fee_budget | numeric | YES | 0 |  |
| marketing_budget | numeric | YES | 0 |  |
| repairs_budget | numeric | YES | 0 |  |
| other_budget | numeric | YES | 0 |  |
| total_budget | numeric | YES |  |  |
| budget_status | character varying | YES | 'active'::character varying | 50 |
| approved_by | integer | YES |  |  |
| approved_date | date | YES |  |  |
| notes | text | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## recurring_expenses

- Rows: 0
- Size: 40 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('recurring_expenses_id_seq'::regclass) |  |
| property_id | integer | YES |  |  |
| expense_category | character varying | YES |  | 100 |
| subcategory | character varying | YES |  | 100 |
| description | text | YES |  |  |
| amount | numeric | NO |  |  |
| recurrence_type | character varying | YES |  | 20 |
| recurrence_interval | integer | YES | 1 |  |
| day_of_month | integer | YES |  |  |
| month_of_year | integer | YES |  |  |
| start_date | date | NO |  |  |
| end_date | date | YES |  |  |
| next_due_date | date | YES |  |  |
| last_generated_date | date | YES |  |  |
| vendor_name | character varying | YES |  | 255 |
| vendor_contact | character varying | YES |  | 255 |
| is_active | boolean | YES | true |  |
| auto_generate | boolean | YES | false |  |
| notes | text | YES |  |  |
| created_by | integer | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## leases

- Rows: 0
- Size: 32 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('leases_id_seq'::regclass) |  |
| tenant_id | integer | YES |  |  |
| property_id | integer | YES |  |  |
| unit | character varying | YES |  | 50 |
| rent | numeric | NO |  |  |
| start_date | date | NO |  |  |
| end_date | date | NO |  |  |
| status | character varying | YES | 'active'::character varying | 50 |
| document_url | text | YES |  |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## disputes

- Rows: 0
- Size: 32 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('disputes_id_seq'::regclass) |  |
| tenant_id | integer | YES |  |  |
| charge_id | integer | YES |  |  |
| reason | text | NO |  |  |
| status | character varying | YES | 'pending'::character varying | 50 |
| resolution | text | YES |  |  |
| resolved_by | integer | YES |  |  |
| resolved_at | timestamp without time zone | YES |  |  |
| created_by | integer | YES |  |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |  |
| deleted_at | timestamp without time zone | YES |  |  |
| deleted_by | integer | YES |  |  |

## property_images_archive

- Rows: 0
- Size: 32 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('property_images_archive_id_seq'::regclass) |  |
| property_id | integer | NO |  |  |
| image_id | uuid | NO |  |  |
| image_url | character varying | NO |  | 500 |
| size | integer | YES |  |  |
| mime_type | character varying | YES |  | 50 |
| uploaded_at | timestamp without time zone | YES |  |  |
| deleted_at | timestamp without time zone | YES | now() |  |
| deleted_by | integer | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |

## lease_history

- Rows: 0
- Size: 32 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('lease_history_id_seq'::regclass) |  |
| tenant_id | integer | NO |  |  |
| lease_start_date | date | NO |  |  |
| lease_end_date | date | NO |  |  |
| status | character varying | YES | 'active'::character varying | 50 |
| notes | text | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## unit_status_history

- Rows: 0
- Size: 32 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('unit_status_history_id_seq'::regclass) |  |
| unit_id | integer | YES |  |  |
| old_status | character varying | YES |  | 50 |
| new_status | character varying | YES |  | 50 |
| changed_at | timestamp without time zone | YES | now() |  |
| changed_by | integer | YES |  |  |
| tenant_id | integer | YES |  |  |
| reason | text | YES |  |  |
| notes | text | YES |  |  |
| rent_change | numeric | YES |  |  |
| old_rent | numeric | YES |  |  |
| new_rent | numeric | YES |  |  |

## tenant_notifications

- Rows: 0
- Size: 32 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('tenant_notifications_id_seq'::regclass) |  |
| tenant_id | integer | YES |  |  |
| notification_type | character varying | YES |  | 100 |
| priority | character varying | YES | 'normal'::character varying | 20 |
| title | character varying | NO |  | 255 |
| message | text | NO |  |  |
| action_url | character varying | YES |  | 500 |
| action_label | character varying | YES |  | 100 |
| read | boolean | YES | false |  |
| read_at | timestamp without time zone | YES |  |  |
| dismissed | boolean | YES | false |  |
| delivered_via | jsonb | YES |  |  |
| sent_at | timestamp without time zone | YES | now() |  |
| metadata | jsonb | YES |  |  |
| expires_at | timestamp without time zone | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |

## tenant_dashboard_widgets

- Rows: 0
- Size: 32 kB
- Primary key: id
- Unique constraints:
tenant_dashboard_widgets_tenant_id_widget_type_key: (tenant_id, widget_type)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('tenant_dashboard_widgets_id_seq'::regclass) |  |
| tenant_id | integer | YES |  |  |
| widget_type | character varying | YES |  | 50 |
| position | integer | YES | 0 |  |
| visible | boolean | YES | true |  |
| settings | jsonb | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## tenant_announcement_reads

- Rows: 0
- Size: 24 kB
- Primary key: id
- Unique constraints:
tenant_announcement_reads_announcement_id_tenant_id_key: (announcement_id, tenant_id)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('tenant_announcement_reads_id_seq'::regclass) |  |
| announcement_id | integer | YES |  |  |
| tenant_id | integer | YES |  |  |
| viewed_at | timestamp without time zone | YES | now() |  |
| acknowledged | boolean | YES | false |  |
| acknowledged_at | timestamp without time zone | YES |  |  |

## payment_receipts

- Rows: 0
- Size: 24 kB
- Primary key: id
- Unique constraints:
payment_receipts_receipt_number_key: (receipt_number)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('payment_receipts_id_seq'::regclass) |  |
| payment_id | integer | YES |  |  |
| receipt_number | character varying | NO |  | 100 |
| pdf_url | text | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |

## admin_quick_actions

- Rows: 0
- Size: 24 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('admin_quick_actions_id_seq'::regclass) |  |
| admin_id | integer | YES |  |  |
| action_type | character varying | YES |  | 100 |
| entity_type | character varying | YES |  | 50 |
| entity_id | integer | YES |  |  |
| execution_time_ms | integer | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |

## property_announcements

- Rows: 0
- Size: 24 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('property_announcements_id_seq'::regclass) |  |
| property_id | integer | YES |  |  |
| title | character varying | NO |  | 255 |
| content | text | NO |  |  |
| announcement_type | character varying | YES |  | 50 |
| priority | character varying | YES | 'normal'::character varying | 20 |
| target_all_tenants | boolean | YES | true |  |
| target_specific_units | jsonb | YES |  |  |
| published | boolean | YES | false |  |
| published_at | timestamp without time zone | YES |  |  |
| expires_at | timestamp without time zone | YES |  |  |
| views_count | integer | YES | 0 |  |
| acknowledged_count | integer | YES | 0 |  |
| attachments | jsonb | YES |  |  |
| created_by | integer | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## tenant_preferences

- Rows: 0
- Size: 16 kB
- Primary key: id
- Unique constraints:
tenant_preferences_tenant_id_key: (tenant_id)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('tenant_preferences_id_seq'::regclass) |  |
| tenant_id | integer | YES |  |  |
| email_notifications | boolean | YES | true |  |
| sms_notifications | boolean | YES | false |  |
| push_notifications | boolean | YES | true |  |
| payment_reminders | boolean | YES | true |  |
| maintenance_updates | boolean | YES | true |  |
| lease_reminders | boolean | YES | true |  |
| community_announcements | boolean | YES | true |  |
| preferred_contact_method | character varying | YES | 'email'::character varying | 50 |
| preferred_contact_time | character varying | YES |  | 50 |
| dashboard_layout | character varying | YES | 'default'::character varying | 50 |
| theme | character varying | YES | 'light'::character varying | 50 |
| language | character varying | YES | 'en'::character varying | 10 |
| auto_pay_enabled | boolean | YES | false |  |
| auto_pay_method | character varying | YES |  | 50 |
| auto_pay_day_of_month | integer | YES | 1 |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## tenant_quick_actions_log

- Rows: 0
- Size: 16 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('tenant_quick_actions_log_id_seq'::regclass) |  |
| tenant_id | integer | YES |  |  |
| action_type | character varying | YES |  | 100 |
| execution_time_ms | integer | YES |  |  |
| success | boolean | YES | true |  |
| created_at | timestamp without time zone | YES | now() |  |

## tenant_payment_methods

- Rows: 0
- Size: 16 kB
- Primary key: id
- Unique constraints:
—

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('tenant_payment_methods_id_seq'::regclass) |  |
| tenant_id | integer | YES |  |  |
| type | character varying | NO |  | 50 |
| last4 | character varying | NO |  | 4 |
| brand | character varying | YES |  | 50 |
| token | character varying | NO |  | 255 |
| is_default | boolean | YES | false |  |
| is_active | boolean | YES | true |  |
| nickname | character varying | YES |  | 100 |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |

## tenant_autopay

- Rows: 0
- Size: 16 kB
- Primary key: id
- Unique constraints:
tenant_autopay_tenant_id_key: (tenant_id)

| column | type | nullable | default | max_len |
| --- | --- | --- | --- | --- |
| id | integer | NO | nextval('tenant_autopay_id_seq'::regclass) |  |
| tenant_id | integer | YES |  |  |
| payment_method_id | integer | YES |  |  |
| is_enabled | boolean | YES | false |  |
| day_of_month | integer | YES | 1 |  |
| amount_type | character varying | YES | 'full_balance'::character varying | 50 |
| fixed_amount | numeric | YES |  |  |
| next_execution_date | date | YES |  |  |
| consecutive_failures | integer | YES | 0 |  |
| last_executed_at | timestamp without time zone | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |
