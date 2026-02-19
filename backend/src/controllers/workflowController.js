const WorkflowService = require('../services/maintenance/workflowService');
const { HTTP_STATUS } = require('../utils/constants');

class WorkflowController {
  static async listWorkflows(req, res, next) {
    try {
      const data = await WorkflowService.listWorkflows(req.params.organizationId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  static async getWorkflow(req, res, next) {
    try {
      const data = await WorkflowService.getWorkflow(req.params.organizationId, req.params.workflowId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createWorkflow(req, res, next) {
    try {
      const data = await WorkflowService.createWorkflow(req.params.organizationId, req.body, req.user);
      res.status(HTTP_STATUS.CREATED).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async deleteWorkflow(req, res, next) {
    try {
      const data = await WorkflowService.deleteWorkflow(req.params.organizationId, req.params.workflowId, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getWorkItemForResource(req, res, next) {
    try {
      const data = await WorkflowService.getWorkItemByResource(
        req.params.organizationId,
        req.params.resourceType,
        req.params.resourceId,
        req.user
      );
      res.status(HTTP_STATUS.OK).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = WorkflowController;

