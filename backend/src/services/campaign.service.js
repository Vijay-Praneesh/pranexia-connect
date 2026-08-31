const campaignRepository = require("../repositories/campaign.repository");
const campaignRecipientRepository = require("../repositories/campaignRecipient.repository");
const templateRepository = require("../repositories/template.repository");
const campaignWorker = require("./campaign.worker");
const whatsappRepository = require("../repositories/whatsapp.repository");
const mediaService = require("./media.service");
const usageService = require("./usage.service");
const planService = require("./plan.service");
const { METRIC_KEYS } = require("../config/plans.config");
const AppError = require("../utils/appError");

class CampaignService {
  // =====================================
  // Create Campaign
  // =====================================
  async createCampaign(companyId, data) {
    // Enforce Plan Monthly Campaign Limit
    await planService.assertWithinLimit(companyId, METRIC_KEYS.MONTHLY_CAMPAIGNS, 1);

    const template = await templateRepository.findById(
      companyId,
      data.templateId,
    );
    if (!template) {
      throw new AppError("Template not found", 404);
    }
    if (template.status !== "APPROVED")
      throw new AppError(
        "Only approved WhatsApp templates can be used in campaigns",
        422,
      );

    if (data.mediaId) {
      const media = await mediaService.assertOwnedByCompany(
        companyId,
        data.mediaId,
      );
      if (!(await require("./storage.service").exists(media.storageKey))) {
        throw new AppError("Campaign media file is unavailable", 422);
      }
    }

    const existingCampaign = await campaignRepository.findByName(
      companyId,
      data.name,
    );

    if (existingCampaign) {
      throw new AppError("Campaign name already exists", 409);
    }

    if (data.sendType === "SCHEDULED") {
      if (!data.scheduledAt || new Date(data.scheduledAt) <= new Date()) {
        throw new AppError(
          "A future scheduledAt is required for scheduled campaigns",
          400,
        );
      }
      data = { ...data, status: "SCHEDULED" };
    }

    const campaign = await campaignRepository.create({
      ...data,
      companyId,
    });

    // Record SaaS Usage
    void usageService.recordCampaignCreated(companyId, campaign.id);
    void usageService.recordTemplateUsed(companyId, {
      campaignId: campaign.id,
      templateId: campaign.templateId,
    });

    return campaign;
  }

  // =====================================
  // Get All Campaigns
  // =====================================
  async getAllCampaigns(companyId, page, limit, sortBy, order, filters) {
    return await campaignRepository.findAll(
      companyId,
      page,
      limit,
      sortBy,
      order,
      filters,
    );
  }

  // =====================================
  // Get Campaign By ID
  // =====================================
  async getCampaignById(companyId, id) {
    const campaign = await campaignRepository.findById(companyId, id);

    if (!campaign) {
      throw new AppError("Campaign not found", 404);
    }

    return campaign;
  }

  // =====================================
  // Update Campaign
  // =====================================
  async updateCampaign(companyId, id, data) {
    const campaign = await campaignRepository.findById(companyId, id);

    if (!campaign) {
      throw new AppError("Campaign not found", 404);
    }

    if (
      ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"].includes(campaign.status)
    ) {
      throw new AppError("Campaign cannot be edited in its current state", 409);
    }
    if (
      data.status &&
      !["DRAFT", "SCHEDULED", "CANCELLED"].includes(data.status)
    ) {
      throw new AppError("Invalid campaign state transition", 409);
    }

    if (data.templateId) {
      const template = await templateRepository.findById(
        companyId,
        data.templateId,
      );
      if (!template) {
        throw new AppError("Template not found", 404);
      }
      if (template.status !== "APPROVED") {
        throw new AppError(
          "Only approved WhatsApp templates can be used in campaigns",
          422,
        );
      }
    }

    if (data.mediaId) {
      const media = await mediaService.assertOwnedByCompany(
        companyId,
        data.mediaId,
      );
      if (!(await require("./storage.service").exists(media.storageKey))) {
        throw new AppError("Campaign media file is unavailable", 422);
      }
    }

    const updateData = {
      ...data,
    };

    // When campaign is changed to scheduled,
    // automatically move it to SCHEDULED status
    if (data.sendType === "SCHEDULED") {
      if (!data.scheduledAt) {
        throw new AppError(
          "scheduledAt is required for scheduled campaigns",
          400,
        );
      }
      if (new Date(data.scheduledAt) <= new Date())
        throw new AppError("scheduledAt must be in the future", 400);

      updateData.status = "SCHEDULED";
    }

    return await campaignRepository.update(id, companyId, updateData);
  }

  // =====================================
  // Delete Campaign
  // =====================================
  async deleteCampaign(companyId, id) {
    const campaign = await campaignRepository.findById(companyId, id);

    if (!campaign) {
      throw new AppError("Campaign not found", 404);
    }

    await campaignRepository.delete(id, companyId);

    return {
      message: "Campaign deleted successfully",
    };
  }

  // =====================================
  // Search Campaigns
  // =====================================
  async searchCampaigns(companyId, keyword, filters = {}) {
    return await campaignRepository.search(companyId, keyword, filters);
  }

  // =====================================
  // Send Campaign
  // =====================================
  async sendCampaign(companyId, campaignId) {
    const campaign = await campaignRepository.findById(companyId, campaignId);
    if (!campaign) throw new AppError("Campaign not found", 404);
    if (!["DRAFT", "SCHEDULED"].includes(campaign.status)) {
      throw new AppError("Campaign cannot be sent in its current state", 409);
    }
    if (
      campaign.status === "SCHEDULED" &&
      (!campaign.scheduledAt || new Date(campaign.scheduledAt) > new Date())
    ) {
      throw new AppError("Scheduled campaign is not due yet", 409);
    }
    if (
      !campaign.template ||
      campaign.template.status !== "APPROVED" ||
      !campaign.template.metaTemplateName
    ) {
      throw new AppError("Campaign template is not approved by Meta", 422);
    }
    const connection = await whatsappRepository.findByCompanyId(companyId);
    if (!connection || connection.status !== "CONNECTED")
      throw new AppError("WhatsApp Business is not connected", 409);
    if (campaign.mediaId)
      await mediaService.assertOwnedByCompany(companyId, campaign.mediaId);

    // Enforce Plan Monthly WhatsApp Message Limit before launching send
    const recipientCount = campaign.totalRecipients || 1;
    await planService.assertWithinLimit(
      companyId,
      METRIC_KEYS.MONTHLY_MESSAGES,
      recipientCount
    );

    const claimed = await campaignRepository.claimForSending(
      campaign.id,
      companyId,
      new Date(),
    );
    if (!claimed)
      throw new AppError(
        "Campaign is already being processed or cannot be sent",
        409,
      );
    campaignWorker.enqueue(companyId, campaignId);
    return {
      campaignId,
      status: "RUNNING",
      progress: 0,
      message: "Campaign processing started",
    };
  }

  // =====================================
  // Cancel Campaign
  // =====================================
  async cancelCampaign(companyId, campaignId) {
    const campaign = await campaignRepository.findById(companyId, campaignId);

    if (!campaign) {
      throw new AppError("Campaign not found", 404);
    }

    // Only scheduled campaigns
    // can be cancelled
    if (campaign.status !== "SCHEDULED") {
      throw new AppError(
        `Campaign cannot be cancelled because its current status is ${campaign.status}`,
        409,
      );
    }

    const claimed = await campaignRepository.claimScheduledCancellation(
      campaign.id,
      companyId,
    );
    if (!claimed)
      throw new AppError(
        "Campaign is already being processed or cannot be cancelled",
        409,
      );
    const updatedCampaign = await campaignRepository.findById(
      companyId,
      campaign.id,
    );

    return {
      campaignId: updatedCampaign.id,

      name: updatedCampaign.name,

      status: updatedCampaign.status,

      message: "Campaign cancelled successfully",
    };
  }

  // =====================================
  // Campaign Report
  // =====================================
  async getCampaignReport(companyId, campaignId) {
    const campaign = await campaignRepository.findById(companyId, campaignId);

    if (!campaign) {
      throw new AppError("Campaign not found", 404);
    }

    // =====================================
    // Sync campaign counters
    // from recipient statuses
    // =====================================
    await campaignRepository.syncCounters(campaignId);

    // =====================================
    // Fetch updated campaign
    // =====================================
    const updatedCampaign = await campaignRepository.findById(
      companyId,
      campaignId,
    );

    // =====================================
    // Campaign Statistics
    // =====================================
    const totalRecipients = updatedCampaign.totalRecipients || 0;

    const sentCount = updatedCampaign.sentCount || 0;

    const deliveredCount = updatedCampaign.deliveredCount || 0;

    const readCount = updatedCampaign.readCount || 0;

    const failedCount = updatedCampaign.failedCount || 0;

    // =====================================
    // Calculate Rates
    // =====================================
    const deliveryRate =
      totalRecipients > 0
        ? Math.round((deliveredCount / totalRecipients) * 100)
        : 0;

    const readRate =
      totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

    const failureRate =
      totalRecipients > 0
        ? Math.round((failedCount / totalRecipients) * 100)
        : 0;

    // =====================================
    // Return Campaign Report
    // =====================================
    return {
      campaignId: updatedCampaign.id,

      campaignName: updatedCampaign.name,

      status: updatedCampaign.status,

      totalRecipients,

      sentCount,

      deliveredCount,

      readCount,

      failedCount,

      progress: updatedCampaign.progress,

      deliveryRate,

      readRate,

      failureRate,

      startedAt: updatedCampaign.startedAt,

      completedAt: updatedCampaign.completedAt,
    };
  }
}

module.exports = new CampaignService();
