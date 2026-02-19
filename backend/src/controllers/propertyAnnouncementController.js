const PropertyAnnouncementService = require('../services/propertyAnnouncementService');
const { HTTP_STATUS } = require('../utils/constants');

class PropertyAnnouncementController {
  static async listForProperty(req, res, next) {
    try {
      const data = await PropertyAnnouncementService.listForAdmin(req.params.propertyId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await PropertyAnnouncementService.create(req.params.propertyId, req.body, req.user);
      res.status(HTTP_STATUS.CREATED).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const data = await PropertyAnnouncementService.update(req.params.propertyId, req.params.id, req.body, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async publish(req, res, next) {
    try {
      const published = req.body?.published !== undefined ? !!req.body.published : true;
      const data = await PropertyAnnouncementService.publish(req.params.propertyId, req.params.id, published, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async archive(req, res, next) {
    try {
      const data = await PropertyAnnouncementService.archive(req.params.propertyId, req.params.id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PropertyAnnouncementController;

