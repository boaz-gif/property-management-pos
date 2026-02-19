
const TenantPaymentService = require('../services/tenantPaymentService');
const Tenant = require('../models/Tenant');

const getTenantId = async (req) => {
  if (req.user?.tenant_id) return req.user.tenant_id;
  if (req.user?.role !== 'tenant') return null;
  const tenant = await Tenant.findByUserId(req.user.id);
  return tenant ? tenant.id : null;
};

exports.getRentStatus = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

    const status = await TenantPaymentService.getRentStatus(tenantId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { amount, paymentMethodId } = req.body;
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    
    const result = await TenantPaymentService.processPayment(tenantId, amount, paymentMethodId, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    const methods = await TenantPaymentService.getPaymentMethods(tenantId);
    res.json(methods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    const method = await TenantPaymentService.savePaymentMethod(tenantId, req.body);
    res.json(method);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.setDefaultMethod = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    const result = await TenantPaymentService.setDefaultPaymentMethod(tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    await TenantPaymentService.deletePaymentMethod(tenantId, req.params.id);
    res.json({ message: 'Payment method deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAutoPay = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    const config = await TenantPaymentService.getAutoPay(tenantId);
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.setupAutoPay = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    const config = await TenantPaymentService.setupAutoPay(tenantId, req.body);
    res.json(config);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.disableAutoPay = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    // Reuse setup but set enabled=false
    const config = await TenantPaymentService.setupAutoPay(tenantId, { ...req.body, is_enabled: false });
    res.json(config);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    const history = await TenantPaymentService.getPaymentHistory(tenantId, req.query);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBalanceLedger = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    const ledger = await TenantPaymentService.getBalanceLedger(tenantId);
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);

    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });

    const receipt = await TenantPaymentService.generateReceipt(req.params.id, tenantId, req.user);
    res.json(receipt);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return res.status(404).json({ message: 'Tenant record not found' });
    const status = await TenantPaymentService.getPaymentStatus(tenantId, req.params.id);
    res.json(status);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
