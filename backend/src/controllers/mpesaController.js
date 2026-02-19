const MpesaService = require('../services/payments/mpesaService');
const MpesaSettingsService = require('../services/payments/mpesaSettingsService');

class MpesaController {
  static async callback(req, res, next) {
    try {
      const settings = MpesaSettingsService.getEnvSettings();
      const token = settings.webhook_token;
      const queryToken = req.query?.token ? String(req.query.token) : null;

      await MpesaService.handleStkCallback({ token, queryToken, body: req.body });
      res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      if (error.status) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  }
}

module.exports = MpesaController;

