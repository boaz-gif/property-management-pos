const DashboardWidgetService = require('../services/dashboard/dashboardWidgetService');
const { HTTP_STATUS } = require('../utils/constants');

class DashboardWidgetController {
  static async getWidgets(req, res, next) {
    try {
      const user = req.user;
      const widgets = await DashboardWidgetService.getWidgets(user);
      res.status(HTTP_STATUS.OK).json({ success: true, data: widgets, count: widgets.length });
    } catch (error) {
      next(error);
    }
  }

  static async updateWidgets(req, res, next) {
    try {
      const user = req.user;
      await DashboardWidgetService.updateWidgetOrder(user, req.body.widgets);
      res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardWidgetController;
