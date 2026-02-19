const PaymentService = require('../services/payments/paymentService');
const ReceiptService = require('../services/payments/ReceiptService');
const { HTTP_STATUS } = require('../utils/constants');

class PaymentController {
  static async getAllPayments(req, res, next) {
    try {
      const user = req.user;
      const payments = await PaymentService.getAllPayments(user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: payments,
        count: payments.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentById(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const payment = await PaymentService.getPaymentById(id, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  static async createPayment(req, res, next) {
    try {
      const paymentData = req.body;
      const user = req.user;

      const payment = await PaymentService.createPayment(paymentData, user);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Payment processed successfully',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;

      const payment = await PaymentService.updatePaymentStatus(id, status, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Payment status updated',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      // 1. Get payment details (with access control)
      const payment = await PaymentService.getPaymentById(id, user);

      // 2. Generate or retrieve receipt
      const receiptDoc = await ReceiptService.generateReceipt(payment, user);

      // 3. Construct download URL
      // If we are serving static files from /uploads, we can return that URL.
      // Or we can return the Document object which contains the file_path.
      // Ideally, the frontend can use a separate route to download the file using the document ID,
      // but for now let's return the document metadata so the frontend can choose how to handle it.
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Receipt generated successfully',
        data: receiptDoc
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getPaymentStats(req, res, next) {
    try {
      const user = req.user;
      const stats = await PaymentService.getPaymentStats(user);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Soft Delete Methods
  static async archivePayment(req, res, next) {
    try {
      const { id } = req.params;
      const result = await PaymentService.archivePayment(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payment archived', data: result });
    } catch (error) { next(error); }
  }

  static async restorePayment(req, res, next) {
    try {
      const { id } = req.params;
      const result = await PaymentService.restorePayment(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payment restored', data: result });
    } catch (error) { next(error); }
  }

  static async permanentDeletePayment(req, res, next) {
    try {
      const { id } = req.params;
      if (req.user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Only super admins can permanently delete records' });
      }
      const result = await PaymentService.permanentDeletePayment(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Payment permanently deleted', data: result });
    } catch (error) { next(error); }
  }
}

module.exports = PaymentController;
