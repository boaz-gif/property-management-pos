const Database = require('../utils/database');
const ReceiptService = require('./ReceiptService');
const NotificationService = require('./notificationService');
const MpesaSettingsService = require('./mpesaSettingsService');
const MpesaClient = require('./mpesaClient');

class MpesaService {
  static async initiateStkPush({ tenantId, paymentId, amount, phone, propertyId, organizationId }) {
    const settings = await MpesaSettingsService.getEffectiveSettings({ propertyId, organizationId });
    if (!settings.callback_base_url) throw new Error('M-Pesa callback base URL not configured');

    const callbackUrl = this.buildCallbackUrl(settings);
    const client = new MpesaClient(settings);

    const accountReference = `${settings.account_reference_prefix}-${tenantId}-${paymentId}`;
    const transactionDesc = `Rent payment ${paymentId}`;

    const response = await client.stkPush({
      amount,
      phone,
      accountReference,
      transactionDesc,
      callbackUrl,
    });

    return {
      merchant_request_id: response?.MerchantRequestID || null,
      checkout_request_id: response?.CheckoutRequestID || null,
      response_code: response?.ResponseCode || null,
      response_description: response?.ResponseDescription || null,
      customer_message: response?.CustomerMessage || null,
    };
  }

  static buildCallbackUrl(settings) {
    const base = String(settings.callback_base_url || '').replace(/\/+$/, '');
    const token = settings.webhook_token;
    if (token) return `${base}/api/payments/mpesa/callback?token=${encodeURIComponent(token)}`;
    return `${base}/api/payments/mpesa/callback`;
  }

  static parseStkCallback(body) {
    const callback = body?.Body?.stkCallback;
    if (!callback) return null;

    const items = Array.isArray(callback.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];
    const itemValue = (name) => items.find((i) => i?.Name === name)?.Value;

    return {
      merchant_request_id: callback.MerchantRequestID || null,
      checkout_request_id: callback.CheckoutRequestID || null,
      result_code: callback.ResultCode !== undefined && callback.ResultCode !== null ? String(callback.ResultCode) : null,
      result_desc: callback.ResultDesc || null,
      amount: itemValue('Amount') !== undefined ? Number(itemValue('Amount')) : null,
      mpesa_receipt_number: itemValue('MpesaReceiptNumber') || null,
      phone: itemValue('PhoneNumber') ? String(itemValue('PhoneNumber')) : null,
      transaction_date: itemValue('TransactionDate') ? String(itemValue('TransactionDate')) : null,
      raw: body,
    };
  }

  static async handleStkCallback({ token, queryToken, body }) {
    if (token && token !== queryToken) {
      const err = new Error('Invalid webhook token');
      err.status = 403;
      throw err;
    }

    const parsed = this.parseStkCallback(body);
    if (!parsed?.checkout_request_id) {
      const err = new Error('Invalid callback payload');
      err.status = 400;
      throw err;
    }

    await Database.query('BEGIN');
    try {
      const txRes = await Database.query(
        `
        SELECT *
        FROM payment_provider_transactions
        WHERE provider = 'mpesa' AND checkout_request_id = $1
        FOR UPDATE
        `,
        [parsed.checkout_request_id]
      );
      if (txRes.rows.length === 0) {
        await Database.query('ROLLBACK');
        return { ok: true };
      }
      const tx = txRes.rows[0];

      await Database.query(
        `
        UPDATE payment_provider_transactions
        SET status = $1,
            mpesa_receipt_number = COALESCE($2, mpesa_receipt_number),
            result_code = $3,
            result_desc = $4,
            raw_callback = $5,
            updated_at = NOW()
        WHERE id = $6
        `,
        [
          parsed.result_code === '0' ? 'success' : 'failed',
          parsed.mpesa_receipt_number,
          parsed.result_code,
          parsed.result_desc,
          parsed.raw,
          tx.id,
        ]
      );

      const paymentRes = await Database.query(
        `
        SELECT p.*, t.name AS tenant_name, t.user_id AS tenant_user_id, t.property_id AS property_id, t.unit AS unit
        FROM payments p
        JOIN tenants t ON t.id = p.tenant_id
        WHERE p.id = $1
        FOR UPDATE
        `,
        [tx.payment_id]
      );
      if (paymentRes.rows.length === 0) {
        await Database.query('COMMIT');
        return { ok: true };
      }
      const payment = paymentRes.rows[0];

      if (payment.status === 'completed') {
        await Database.query('COMMIT');
        return { ok: true };
      }

      if (parsed.result_code === '0') {
        const amount = parsed.amount !== null && parsed.amount !== undefined ? parsed.amount : Number(payment.amount);

        await Database.query(
          `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
          [payment.id]
        );

        await Database.query(
          `
          UPDATE tenants
          SET balance = balance - $1, updated_at = NOW()
          WHERE id = $2
          `,
          [amount, payment.tenant_id]
        );

        let receiptUrl = null;
        try {
          payment.amount = amount;
          const doc = await ReceiptService.generateReceipt(payment, { id: null, role: 'system' });
          const receiptNumber = `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${payment.id}`;
          await Database.query(
            `
            INSERT INTO payment_receipts (payment_id, receipt_number, pdf_url, created_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (receipt_number) DO NOTHING
            `,
            [payment.id, receiptNumber, doc.filePath]
          );
          receiptUrl = doc.filePath;
        } catch (e) {
          receiptUrl = null;
        }

        await NotificationService.createNotification({
          tenant_id: payment.tenant_id,
          user_id: payment.tenant_user_id,
          title: 'Payment Successful',
          message: `Your payment of KES ${Number(amount).toFixed(2)} has been received.`,
          type: 'payment_received',
          priority: 'normal',
          action_label: receiptUrl ? 'View Receipt' : null,
          action_url: receiptUrl ? `/tenant/payments/${payment.id}/receipt` : null,
        });
      } else {
        await Database.query(
          `UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = $1`,
          [payment.id]
        );

        await NotificationService.createNotification({
          tenant_id: payment.tenant_id,
          user_id: payment.tenant_user_id,
          title: 'Payment Failed',
          message: `M-Pesa payment failed: ${parsed.result_desc || 'Unknown error'}`,
          type: 'payment_failed',
          priority: 'high',
        });
      }

      await Database.query('COMMIT');
      return { ok: true };
    } catch (error) {
      await Database.query('ROLLBACK');
      throw error;
    }
  }
}

module.exports = MpesaService;

