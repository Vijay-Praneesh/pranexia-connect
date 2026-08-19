const campaignService = require("../services/campaign.service");
const ApiResponse = require("../helpers/apiResponse");

class CampaignController {
  async create(req, res, next) {
    try {
      const campaign = await campaignService.createCampaign(
        req.user.companyId,
        req.body
      );

      return ApiResponse.success(
        res,
        "Campaign created successfully",
        campaign,
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      // TEMPORARY DEBUG
      console.log("==================================");
      console.log("JWT USER =>", req.user);
      console.log("==================================");

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const sortBy = req.query.sortBy || "created_at";
      const order = req.query.order || "DESC";

      const filters = {
        status: req.query.status,
        sendType: req.query.sendType,
        templateId: req.query.templateId,
      };

      const campaigns = await campaignService.getAllCampaigns(
        req.user.companyId,
        page,
        limit,
        sortBy,
        order,
        filters
      );

      return ApiResponse.success(
        res,
        "Campaigns fetched successfully",
        campaigns
      );
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const campaign = await campaignService.getCampaignById(
        req.user.companyId,
        req.params.id
      );

      return ApiResponse.success(
        res,
        "Campaign fetched successfully",
        campaign
      );
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const campaign = await campaignService.updateCampaign(
        req.user.companyId,
        req.params.id,
        req.body
      );

      return ApiResponse.success(
        res,
        "Campaign updated successfully",
        campaign
      );
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await campaignService.deleteCampaign(
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

      const campaigns = await campaignService.searchCampaigns(
        req.user.companyId,
        keyword
      );

      return ApiResponse.success(
        res,
        "Campaigns fetched successfully",
        campaigns
      );
    } catch (error) {
      next(error);
    }
  }

  async sendCampaign(req, res, next) {
  try {
    const result = await campaignService.sendCampaign(
      req.user.companyId,
      req.params.id
    );

    return ApiResponse.success(
      res,
      "Campaign sent successfully",
      result
    );
  } catch (error) {
    next(error);
  }
  }

  async cancel(req, res, next) {
  try {
    const result = await campaignService.cancelCampaign(
      req.user.companyId,
      req.params.id
    );

    return ApiResponse.success(
      res,
      "Campaign cancelled successfully",
      result
    );
  } catch (error) {
    next(error);
  }
  }

  async getReport(req, res, next) {
  try {
    const report = await campaignService.getCampaignReport(
      req.user.companyId,
      req.params.id
    );

    return ApiResponse.success(
      res,
      "Campaign report fetched successfully",
      report
    );
  } catch (error) {
    next(error);
  }
}
}

module.exports = new CampaignController();