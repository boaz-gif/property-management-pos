const PaymentService = require('../services/paymentService');
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
}

module.exports = PaymentController;
