## What You Have Today
- Payments are currently **mocked** (instant “completed” status, fake transaction id) in [TenantPaymentService.processPayment](file:///c:/Users/HP/property-management-pos/backend/src/services/tenantPaymentService.js#L49-L120).
- UI assumes instant success (alerts “Payment successful!”) in [PayRent.jsx](file:///c:/Users/HP/property-management-pos/src/pages/tenant/PayRent.jsx#L39-L56).
- Receipts display **$** in PDFs ([ReceiptService.js](file:///c:/Users/HP/property-management-pos/backend/src/services/ReceiptService.js#L61-L70)) and the tenant dashboard card also shows **$** ([QuickPayCard.jsx](file:///c:/Users/HP/property-management-pos/src/components/tenant/QuickPayCard.jsx#L30-L64)).

## Goal (Kenyan Market)
- Add **M-Pesa** as a first-class payment option (primary), with a proper async payment lifecycle (pending → completed/failed), callbacks, and receipts.
- Update money formatting to **KES** across receipts + key UI surfaces.

## M-Pesa Approach (Recommended)
- Use Safaricom Daraja **STK Push** for tenant-initiated rent payment:
  - Tenant enters/chooses phone number.
  - App initiates STK push.
  - Tenant confirms on handset.
  - Daraja calls back to our webhook to confirm success/failure.
  - Only on confirmed success: mark payment completed, update tenant balance, generate receipt, notify tenant/admin.

## Backend Plan
### 1) Data Model (DB)
- Add a `payment_transactions` (or `payment_provider_transactions`) table to store:
  - `payment_id` (FK), `provider` (mpesa), `status` (initiated/pending/success/failed),
  - `merchant_request_id`, `checkout_request_id`, `mpesa_receipt_number`,
  - `phone`, `amount`, `raw_callback_payload`, timestamps.
- Add an `mpesa_settings` table scoped to **property or organization** (with env-var fallback):
  - `consumer_key`, `consumer_secret`, `passkey`, `shortcode`, `partyB`,
  - `callback_base_url`, `account_reference_prefix`, `is_live`.

### 2) M-Pesa Client + Service
- Implement `MpesaClient` using Node’s built-in `fetch` (no axios dependency in backend [package.json](file:///c:/Users/HP/property-management-pos/backend/package.json#L23-L51)):
  - Get OAuth token.
  - Initiate STK push.
  - (Optional) query STK status for reconciliation.

### 3) Payment Flow Refactor
- Update `TenantPaymentService.processPayment`:
  - If method `type === 'mpesa'`: create `payments` row as `pending`, create transaction row, initiate STK push, return `payment_id` + `checkout_request_id`.
  - Do **not** change tenant balance until callback confirms success.
  - If method is the old mocked card path: keep existing behavior for now (or also switch to “pending” if you want consistent lifecycle).

### 4) Webhooks / Callbacks
- Add endpoints:
  - `POST /api/payments/mpesa/callback` (STK result callback)
  - `POST /api/payments/mpesa/timeout` (optional)
  - (Optional) `GET /api/tenant/payments/:id/status` for polling from frontend.
- Callback handler will:
  - Validate the callback correlates to a known transaction.
  - Verify amount/tenant reference.
  - Mark `payments.status` = `completed` or `failed`.
  - On success: update tenant balance, generate receipt, create notifications.

### 5) KES Currency Normalization
- Replace hard-coded `$` in receipt generation and key UI components with a shared formatter:
  - Use `KES` (and optionally `Intl.NumberFormat('en-KE', { currency: 'KES' })` in frontend).

## Frontend Plan
### 1) Payment Methods UI
- Update [AddPaymentMethod.jsx](file:///c:/Users/HP/property-management-pos/src/components/tenant/AddPaymentMethod.jsx) to support selecting method type:
  - Add “M-Pesa” option.
  - Capture phone number (normalize to `2547XXXXXXXX`).
  - Save method as `type='mpesa'`, `brand='M-Pesa'`, `last4=last4(phone)`.

### 2) Pay Rent UX for STK Push
- Update [PayRent.jsx](file:///c:/Users/HP/property-management-pos/src/pages/tenant/PayRent.jsx) and [QuickPayCard.jsx](file:///c:/Users/HP/property-management-pos/src/components/tenant/QuickPayCard.jsx) to:
  - Initiate M-Pesa payment → show “Check your phone to complete payment”.
  - Poll payment status (or subscribe via sockets if we extend that) until `completed/failed`.
  - On completion: show receipt link.

## Testing & Verification
- Unit tests for `MpesaClient` (mock `global.fetch`).
- API tests:
  - Initiate STK push returns pending payment.
  - Callback transitions payment to completed and generates receipt.
  - Callback failure marks payment failed.
- UI smoke test: tenant can add M-Pesa method and complete a payment flow.

## Deployment Notes (Kenya)
- You’ll need:
  - Public HTTPS callback URL (for sandbox/dev use an HTTPS tunnel).
  - Safaricom Daraja app credentials + shortcode/passkey.
- Secrets will be stored securely (no logging of credentials; env vars recommended; DB only if needed per property).

If you approve, I’ll implement this end-to-end (DB → backend → frontend → tests) and leave the existing “mock card” path intact while M-Pesa becomes the primary Kenyan option.