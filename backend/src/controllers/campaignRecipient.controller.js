const campaignRecipientService = require("../services/campaignRecipient.service");
const ApiResponse = require("../helpers/apiResponse");

class CampaignRecipientController {
  async assignRecipients(req, res, next) {
    try {
      const { campaignId, customerIds } = req.body;

      const result = await campaignRecipientService.assignRecipients(
        req.user.companyId,
        campaignId,
        customerIds
      );

      return ApiResponse.success(
        res,
        "Recipients assigned successfully",
        result,
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const sortBy = req.query.sortBy || "createdAt";
      const order = req.query.order || "DESC";

      const filters = {
        campaignId: req.query.campaignId,
        customerId: req.query.customerId,
        status: req.query.status,
      };

      const recipients =
        await campaignRecipientService.getAllRecipients(
          req.user.companyId,
          page,
          limit,
          sortBy,
          order,
          filters
        );

      return ApiResponse.success(
        res,
        "Recipients fetched successfully",
        recipients
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const recipient =
        await campaignRecipientService.getRecipientById(
          req.user.companyId,
          req.params.id
        );

      return ApiResponse.success(
        res,
        "Recipient fetched successfully",
        recipient
      );
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const recipient =
        await campaignRecipientService.updateRecipient(
          req.user.companyId,
          req.params.id,
          req.body
        );

      return ApiResponse.success(
        res,
        "Recipient updated successfully",
        recipient
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result =
        await campaignRecipientService.deleteRecipient(
          req.user.companyId,
          req.params.id
        );

      return ApiResponse.success(
        res,
        result.message,
        null
      );
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const keyword = req.query.keyword || req.query.q || "";

      const recipients =
        await campaignRecipientService.searchRecipients(
          req.user.companyId,
          keyword
        );

      return ApiResponse.success(
        res,
        "Recipients fetched successfully",
        recipients
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CampaignRecipientController();