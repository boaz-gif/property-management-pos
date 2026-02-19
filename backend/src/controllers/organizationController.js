const OrganizationService = require('../services/auth/organizationService');
const { HTTP_STATUS } = require('../utils/constants');

class OrganizationController {
  static async listOrganizations(req, res, next) {
    try {
      const data = await OrganizationService.listOrganizations(req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  static async getOrganizationById(req, res, next) {
    try {
      const org = await OrganizationService.getOrganizationById(req.params.id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data: org });
    } catch (err) {
      next(err);
    }
  }

  static async createOrganization(req, res, next) {
    try {
      const org = await OrganizationService.createOrganization(req.body, req.user);
      res.status(HTTP_STATUS.CREATED).json({ success: true, data: org });
    } catch (err) {
      next(err);
    }
  }

  static async updateOrganization(req, res, next) {
    try {
      const org = await OrganizationService.updateOrganization(req.params.id, req.body, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data: org });
    } catch (err) {
      next(err);
    }
  }

  static async deleteOrganization(req, res, next) {
    try {
      const org = await OrganizationService.deleteOrganization(req.params.id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data: org });
    } catch (err) {
      next(err);
    }
  }

  static async listMembers(req, res, next) {
    try {
      const data = await OrganizationService.listMembers(req.params.organizationId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  static async addMember(req, res, next) {
    try {
      const data = await OrganizationService.addMember(
        req.params.organizationId,
        req.body?.userId ?? req.body?.user_id,
        req.body?.memberRole ?? req.body?.member_role,
        req.user
      );
      res.status(HTTP_STATUS.CREATED).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async removeMember(req, res, next) {
    try {
      const data = await OrganizationService.removeMember(req.params.organizationId, req.params.userId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OrganizationController;

