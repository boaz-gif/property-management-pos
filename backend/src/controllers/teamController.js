const TeamService = require('../services/auth/teamService');
const { HTTP_STATUS } = require('../utils/constants');

class TeamController {
  static async listTeams(req, res, next) {
    try {
      const data = await TeamService.listTeams(req.params.organizationId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  static async getTeam(req, res, next) {
    try {
      const data = await TeamService.getTeam(req.params.organizationId, req.params.teamId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createTeam(req, res, next) {
    try {
      const data = await TeamService.createTeam(req.params.organizationId, req.body, req.user);
      res.status(HTTP_STATUS.CREATED).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async updateTeam(req, res, next) {
    try {
      const data = await TeamService.updateTeam(req.params.organizationId, req.params.teamId, req.body, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async deleteTeam(req, res, next) {
    try {
      const data = await TeamService.deleteTeam(req.params.organizationId, req.params.teamId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async listMembers(req, res, next) {
    try {
      const data = await TeamService.listMembers(req.params.organizationId, req.params.teamId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  static async addMember(req, res, next) {
    try {
      const data = await TeamService.addMember(
        req.params.organizationId,
        req.params.teamId,
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
      const data = await TeamService.removeMember(req.params.organizationId, req.params.teamId, req.params.userId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TeamController;

