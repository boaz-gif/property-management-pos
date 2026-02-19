# Phase 7 Manual Smoke Checks (Phase 5–6 Features)

This checklist is the manual validation companion to the automated Jest coverage. It focuses on behaviors that are hard to assert reliably in unit tests (real sockets, offline browser behavior, and file downloads).

## What Was Executed In This Environment

- Backend Jest suite executed and passed (includes new Phase 5 conversation boundary unit tests + Phase 6 audit tests).
- Frontend Jest suite executed and passed (includes Communication Hub render test + notification deep-link test).

## Preconditions

- DB migrations applied: `019_phase5_communication_hub.sql`, `020_phase5_dashboard_personalization.sql`, `021_phase6_security_compliance.sql`, `022_phase6_detailed_audit_logs.sql`.
- `DATA_ENCRYPTION_KEY` configured if encrypted document uploads are expected.
- Two test users available:
  - User A: tenant assigned to Property P
  - User B: admin/property_manager with access to Property P

## 1) Communication Hub (Messaging)

### 1.1 Basic messaging (REST + Socket.IO)

- Open two browser sessions (or incognito) and login as User A and User B.
- Navigate to **Messages** from the sidebar.
- Create a conversation (if UI flow is not present, create via API) and ensure both users are participants.
- In User A session:
  - Send a message and verify it appears immediately in the thread.
- In User B session:
  - Verify the message appears in real-time without refresh.
  - Verify the unread badge increments and then clears once the thread is opened.

### 1.2 Typing indicator

- In User A session:
  - Start typing in the input and pause.
- In User B session:
  - Verify “Someone is typing…” appears briefly.

### 1.3 Entity-boundary enforcement

- Attempt to access a conversation tied to a property/lease/payment/maintenance that the user should not be able to access:
  - Verify API returns **Access denied** and sockets join is rejected.

## 2) Message Attachments (Documents Pipeline)

### 2.1 Upload + send + view

- In a thread with User A:
  - Click **Attach**, select a file, and send.
  - Verify the message shows an **Attachments** section and the file name is visible.

### 2.2 Download

- Click the attachment chip/button.
- Verify the file downloads successfully.

### 2.3 Authorization

- As a non-participant user:
  - Attempt to download the attachment directly using `/api/documents/:id/download`.
  - Verify the request is denied.

## 3) Notification Deep-Link

- Ensure the recipient (User B) receives a `message_received` notification.
- Click the notification in the bell dropdown.
- Verify it navigates to `/messages/:conversationId` and opens the correct thread.

## 4) Notification Preferences Gating

This requires toggling the DB preference tables (no UI is currently provided).

- Disable message notifications for User B:
  - In `notification_preference_types`, set `enabled = false` for (`user_id = UserB`, `notification_type = 'message_received'`).
- Send a message from User A to User B.
- Verify:
  - No new in-app notification is created for User B.
  - Real-time message delivery still works in the thread (if joined).

## 5) Offline Queue (PWA / Background Sync)

### 5.1 Maintenance request offline → sync online

- In browser devtools, enable “Offline”.
- Create a tenant maintenance request.
- Verify:
  - UI shows the request as queued/pending sync.
- Disable “Offline” and wait ~5–30 seconds.
- Verify:
  - Request is synced and appears as a normal request after refresh.

### 5.2 Messaging offline behavior

- With “Offline” enabled, send a message without attachments.
- Verify:
  - The request is queued (202 Accepted from service worker).
  - After re-connecting, the message is delivered.

Note: offline queue supports JSON requests only; multipart uploads (attachments) will not queue offline.

## 6) Privacy Export \u0026 Deletion

### 6.1 Export

- As an authorized user (admin/super_admin or any role with `privacy:export`):
  - Call `/api/privacy/me/export` and verify data bundle is returned.

### 6.2 Deletion enforcement

- Call `/api/privacy/me` (DELETE) as a user without `privacy:delete`.
  - Verify access is denied.
- Call `/api/privacy/tenants/:id` (DELETE) as an admin with `privacy:delete`.
  - Verify tenant is soft-deleted and relevant records are updated.

## 7) View Auditing (Sensitive Reads)

### 7.1 Documents

- Download a document (`/api/documents/:id/download`).
- Verify `audit_logs` and `detailed_audit_logs` contain a **read** event for entity_type/document id.

### 7.2 Payments

- Fetch a payment detail (`/api/payments/:id`).
- Verify `audit_logs` and `detailed_audit_logs` contain a **read** event for entity_type/payment id.

