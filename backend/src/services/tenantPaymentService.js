
const Database = require('../utils/database');
const ReceiptService = require('./ReceiptService');
const NotificationService = require('./notificationService');
const Tenant = require('../models/Tenant');
const MpesaService = require('./mpesaService');
const MpesaClient = require('./mpesaClient');

class TenantPaymentService {
  
  static async getRentStatus(tenantId) {
    // Fetches tenant record with balance
    const tenantQuery = `
      SELECT t.id, t.rent, t.balance, t.lease_end_date,
             (SELECT COUNT(*) FROM payments p WHERE p.tenant_id = t.id AND p.status = 'pending' AND p.deleted_at IS NULL) as pending_payments_count
      FROM tenants t
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    const tenantResult = await Database.query(tenantQuery, [tenantId]);
    if (tenantResult.rows.length === 0) throw new Error('Tenant not found');
    const tenant = tenantResult.rows[0];

    // Calculate next payment due date (simplified: 1st of next month if active)
    const now = new Date();
    const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Amount breakdown
    // For now, assuming rent is the main component.
    // In a real system, we'd sum up unpaid invoices.
    const breakdown = {
      base_rent: parseFloat(tenant.rent),
      fees: 0,
      credits: 0,
      total_due: parseFloat(tenant.balance) > 0 ? parseFloat(tenant.balance) : 0 // Assuming balance tracks what is owed
    };

    // Auto-pay status
    const autoPayQuery = `SELECT * FROM tenant_autopay WHERE tenant_id = $1`;
    const autoPayResult = await Database.query(autoPayQuery, [tenantId]);
    
    return {
      tenant_id: tenant.id,
      balance: parseFloat(tenant.balance),
      rent_amount: parseFloat(tenant.rent),
      next_due_date: nextDue,
      breakdown,
      auto_pay: autoPayResult.rows[0] || null
    };
  }

  static async processPayment(tenantId, amount, paymentMethodId, user) {
    // 1. Fetch Payment Method
    const methodQuery = `SELECT * FROM tenant_payment_methods WHERE id = $1 AND tenant_id = $2`;
    const methodRes = await Database.query(methodQuery, [paymentMethodId, tenantId]);
    if (methodRes.rows.length === 0) throw new Error('Invalid payment method');
    const method = methodRes.rows[0];

    const methodType = String(method.type || '').toLowerCase();

    if (methodType === 'mpesa') {
      const phone = MpesaClient.normalizePhone(method.token);

      const tenantInfo = await Database.query('SELECT property_id FROM tenants WHERE id = $1', [tenantId]);
      const propertyId = tenantInfo.rows[0]?.property_id;

      const paymentRes = await Database.query(
        `
        INSERT INTO payments (tenant_id, amount, date, type, method, status, created_at, updated_at)
        VALUES ($1, $2, NOW(), 'rent', $3, 'pending', NOW(), NOW())
        RETURNING *
        `,
        [tenantId, amount, methodType]
      );
      const payment = paymentRes.rows[0];

      const txRes = await Database.query(
        `
        INSERT INTO payment_provider_transactions (payment_id, provider, status, phone, amount, created_at, updated_at)
        VALUES ($1, 'mpesa', 'initiated', $2, $3, NOW(), NOW())
        RETURNING *
        `,
        [payment.id, phone, amount]
      );
      const tx = txRes.rows[0];

      const stk = await MpesaService.initiateStkPush({
        tenantId,
        paymentId: payment.id,
        amount,
        phone,
        propertyId,
        organizationId: user?.organization_id,
      });

      await Database.query(
        `
        UPDATE payment_provider_transactions
        SET status = 'pending',
            merchant_request_id = $1,
            checkout_request_id = $2,
            result_code = $3,
            result_desc = $4,
            updated_at = NOW()
        WHERE id = $5
        `,
        [stk.merchant_request_id, stk.checkout_request_id, stk.response_code, stk.customer_message, tx.id]
      );

      return {
        payment_id: payment.id,
        status: 'pending',
        amount: payment.amount,
        checkout_request_id: stk.checkout_request_id,
        customer_message: stk.customer_message,
      };
    }

    const processorId = `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const status = 'completed';

    const paymentQuery = `
      INSERT INTO payments (tenant_id, amount, date, type, method, status, created_at, updated_at)
      VALUES ($1, $2, NOW(), 'rent', $3, $4, NOW(), NOW())
      RETURNING *
    `;
    const paymentRes = await Database.query(paymentQuery, [tenantId, amount, methodType || method.type, status]);
    const payment = paymentRes.rows[0];

    const updateBalanceQuery = `
      UPDATE tenants 
      SET balance = balance - $1, updated_at = NOW()
      WHERE id = $2
      RETURNING balance
    `;
    await Database.query(updateBalanceQuery, [amount, tenantId]);

    const tenantRes = await Database.query('SELECT name, user_id FROM tenants WHERE id = $1', [tenantId]);
    payment.tenant_name = tenantRes.rows[0]?.name || 'Tenant';
    payment.tenant_user_id = tenantRes.rows[0]?.user_id;
    
    let receiptUrl = null;
    try {
      const doc = await ReceiptService.generateReceipt(payment, user);
      
      const receiptNumber = `RCP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${payment.id}`;
      await Database.query(`
        INSERT INTO payment_receipts (payment_id, receipt_number, pdf_url, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [payment.id, receiptNumber, doc.filePath]);
      
      receiptUrl = doc.filePath;
    } catch (err) {
      console.error('Failed to generate receipt:', err);
    }

    await NotificationService.createNotification({
        tenant_id: tenantId,
        user_id: payment.tenant_user_id,
        title: 'Payment Successful',
        message: `Your payment of KES ${Number(amount).toFixed(2)} has been processed successfully.`,
        type: 'payment_received',
        priority: 'normal',
        action_label: receiptUrl ? 'View Receipt' : null,
        action_url: receiptUrl ? `/tenant/payments/${payment.id}/receipt` : null
    });

    return {
      payment_id: payment.id,
      status: payment.status,
      amount: payment.amount,
      receipt_url: receiptUrl,
      transaction_id: processorId
    };
  }

  static async savePaymentMethod(tenantId, methodData) {
    const { type, token, last4, brand, nickname } = methodData;
    const methodType = String(type || '').toLowerCase();

    if (!methodType) throw new Error('type is required');
    if (methodType === 'mpesa') {
      const phone = MpesaClient.normalizePhone(token || methodData.phone);
      const last4Phone = String(phone).slice(-4);
      const mpesaBrand = brand || 'M-Pesa';
      return await this._insertPaymentMethod(tenantId, {
        type: methodType,
        token: phone,
        last4: last4Phone,
        brand: mpesaBrand,
        nickname,
      });
    }
    
    if (!token) throw new Error('token is required');
    if (!last4) throw new Error('last4 is required');
    return await this._insertPaymentMethod(tenantId, {
      type: methodType,
      token,
      last4,
      brand,
      nickname,
    });
  }

  static async _insertPaymentMethod(tenantId, { type, token, last4, brand, nickname }) {
    const countRes = await Database.query('SELECT COUNT(*) FROM tenant_payment_methods WHERE tenant_id = $1', [tenantId]);
    const isDefault = parseInt(countRes.rows[0].count) === 0;

    const query = `
      INSERT INTO tenant_payment_methods (tenant_id, type, last4, brand, token, nickname, is_default, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;
    const result = await Database.query(query, [tenantId, type, last4, brand, token, nickname, isDefault]);
    return result.rows[0];
  }

  static async getPaymentMethods(tenantId) {
    const query = `
      SELECT id, type, last4, brand, nickname, is_default, created_at
      FROM tenant_payment_methods
      WHERE tenant_id = $1 AND is_active = TRUE
      ORDER BY is_default DESC, created_at DESC
    `;
    const result = await Database.query(query, [tenantId]);
    return result.rows;
  }

  static async getPaymentStatus(tenantId, paymentId) {
    const paymentIdInt = parseInt(paymentId, 10);
    if (!Number.isFinite(paymentIdInt)) throw new Error('Invalid payment id');

    const res = await Database.query(
      `
      SELECT
        p.id,
        p.status,
        p.amount,
        p.method,
        p.date,
        tx.provider,
        tx.status AS provider_status,
        tx.checkout_request_id,
        tx.mpesa_receipt_number,
        tx.result_code,
        tx.result_desc,
        pr.pdf_url AS receipt_url
      FROM payments p
      LEFT JOIN payment_provider_transactions tx ON tx.payment_id = p.id
      LEFT JOIN payment_receipts pr ON pr.payment_id = p.id
      WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL
      ORDER BY tx.id DESC
      LIMIT 1
      `,
      [paymentIdInt, tenantId]
    );

    if (res.rows.length === 0) throw new Error('Payment not found');
    return res.rows[0];
  }

  static async setDefaultPaymentMethod(tenantId, methodId) {
    await Database.query('BEGIN');
    try {
      // Unset all
      await Database.query(`UPDATE tenant_payment_methods SET is_default = FALSE WHERE tenant_id = $1`, [tenantId]);
      // Set new default
      const res = await Database.query(`
        UPDATE tenant_payment_methods 
        SET is_default = TRUE 
        WHERE id = $1 AND tenant_id = $2 
        RETURNING *
      `, [methodId, tenantId]);
      
      if (res.rows.length === 0) throw new Error('Payment method not found');
      
      await Database.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await Database.query('ROLLBACK');
      throw err;
    }
  }

  static async deletePaymentMethod(tenantId, methodId) {
    // Check if used in AutoPay
    const autoPayCheck = await Database.query(`
      SELECT id FROM tenant_autopay 
      WHERE tenant_id = $1 AND payment_method_id = $2 AND is_enabled = TRUE
    `, [tenantId, methodId]);

    if (autoPayCheck.rows.length > 0) {
      throw new Error('Cannot delete payment method currently used for AutoPay. Please disable AutoPay or change the method first.');
    }

    const query = `
      UPDATE tenant_payment_methods 
      SET is_active = FALSE, is_default = FALSE, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `;
    const result = await Database.query(query, [methodId, tenantId]);
    if (result.rows.length === 0) throw new Error('Payment method not found');
    return true;
  }

  static async setupAutoPay(tenantId, config) {
    const { payment_method_id, day_of_month, amount_type, fixed_amount, is_enabled } = config;

    // Validate payment method
    const methodCheck = await Database.query(`
      SELECT id FROM tenant_payment_methods WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE
    `, [payment_method_id, tenantId]);
    if (methodCheck.rows.length === 0) throw new Error('Invalid payment method');

    // Calculate next execution date
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), day_of_month);
    if (nextDate <= today) {
      nextDate = new Date(today.getFullYear(), today.getMonth() + 1, day_of_month);
    }

    const query = `
      INSERT INTO tenant_autopay (tenant_id, payment_method_id, is_enabled, day_of_month, amount_type, fixed_amount, next_execution_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (tenant_id) 
      DO UPDATE SET 
        payment_method_id = EXCLUDED.payment_method_id,
        is_enabled = EXCLUDED.is_enabled,
        day_of_month = EXCLUDED.day_of_month,
        amount_type = EXCLUDED.amount_type,
        fixed_amount = EXCLUDED.fixed_amount,
        next_execution_date = EXCLUDED.next_execution_date,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await Database.query(query, [tenantId, payment_method_id, is_enabled !== undefined ? is_enabled : true, day_of_month, amount_type, fixed_amount, nextDate]);
    return result.rows[0];
  }

  static async getAutoPay(tenantId) {
    const query = `
      SELECT tap.*, tpm.last4, tpm.brand, tpm.type as method_type
      FROM tenant_autopay tap
      JOIN tenant_payment_methods tpm ON tap.payment_method_id = tpm.id
      WHERE tap.tenant_id = $1
    `;
    const result = await Database.query(query, [tenantId]);
    return result.rows[0];
  }

  static async getPaymentHistory(tenantId, filters = {}) {
    let query = `
      SELECT p.*, pr.pdf_url
      FROM payments p
      LEFT JOIN payment_receipts pr ON p.id = pr.payment_id
      WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ` ORDER BY p.date DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const result = await Database.query(query, params);
    return result.rows;
  }

  static async getBalanceLedger(tenantId) {
    // This assumes a simple ledger where we just show payments and maybe rent charges if we had a charges table.
    // Since we don't have a specific 'charges' table in the provided schema (only recurring_expenses?),
    // we might have to construct it from payments and lease info, or just show payments.
    // The user prompt mentions "tenant_balance_ledger" but didn't define it. 
    // I'll return payments and synthesized rent charges.
    
    // For now, just return payments as ledger items
    const query = `
      SELECT id, date, 'payment' as type, amount, status, method as description
      FROM payments
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY date DESC
    `;
    const result = await Database.query(query, [tenantId]);
    return result.rows;
  }

  static async generateReceipt(paymentId, tenantIdOrUser, userMaybe) {
    const hasTenantId = userMaybe !== undefined;
    const tenantId = hasTenantId ? tenantIdOrUser : null;
    const user = hasTenantId ? userMaybe : tenantIdOrUser;

    const receiptCheck = await Database.query(
      'SELECT * FROM payment_receipts WHERE payment_id = $1 LIMIT 1',
      [paymentId]
    );
    if (receiptCheck.rows.length > 0) {
      return receiptCheck.rows[0];
    }

    const isSystem = user?.role === 'system';
    const paymentQuery = isSystem
      ? `
        SELECT p.*, t.name AS tenant_name, t.user_id AS tenant_user_id
        FROM payments p
        JOIN tenants t ON t.id = p.tenant_id AND t.deleted_at IS NULL
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `
      : `
        SELECT p.*, t.name AS tenant_name, t.user_id AS tenant_user_id
        FROM payments p
        JOIN tenants t ON t.id = p.tenant_id AND t.deleted_at IS NULL
        WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL
      `;
    const paymentParams = isSystem ? [paymentId] : [paymentId, tenantId];
    const paymentRes = await Database.query(paymentQuery, paymentParams);
    if (paymentRes.rows.length === 0) throw new Error('Payment not found');
    const payment = paymentRes.rows[0];

    const doc = await ReceiptService.generateReceipt(payment, user);
    const receiptNumber = `RCP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${payment.id}`;
    await Database.query(
      `
      INSERT INTO payment_receipts (payment_id, receipt_number, pdf_url, created_at)
      VALUES ($1, $2, $3, NOW())
      `,
      [payment.id, receiptNumber, doc.filePath]
    );
    return { payment_id: payment.id, receipt_number: receiptNumber, pdf_url: doc.filePath };
  }
}

module.exports = TenantPaymentService;
