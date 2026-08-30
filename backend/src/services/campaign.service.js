const campaignRepository = require("../repositories/campaign.repository");
const campaignRecipientRepository = require("../repositories/campaignRecipient.repository");
const templateRepository = require("../repositories/template.repository");
const whatsappService = require("./whatsapp.service");
const AppError = require("../utils/appError");

class CampaignService {
  // =====================================
  // Create Campaign
  // =====================================
  async createCampaign(companyId, data) {
    const template = await templateRepository.findById(
      companyId,
      data.templateId,
    );
    if (!template) {
      throw new AppError("Template not found", 404);
    }
    if (template.status !== "APPROVED") throw new AppError("Only approved WhatsApp templates can be used in campaigns", 422);

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

    return await campaignRepository.create({
      ...data,
      companyId,
    });
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
    // =====================================
    // Get Campaign
    // =====================================
    const campaign = await campaignRepository.findById(companyId, campaignId);

    if (!campaign) {
      throw new AppError("Campaign not found", 404);
    }

    // =====================================
    // Campaign Status Validation
    // =====================================
    console.log("🔎 Campaign Status Before Send:", campaign.status);

    if (!["DRAFT", "SCHEDULED"].includes(campaign.status))
      throw new AppError("Campaign cannot be sent in its current state", 409);
    if (
      campaign.status === "SCHEDULED" &&
      (!campaign.scheduledAt || new Date(campaign.scheduledAt) > new Date())
    )
      throw new AppError("Scheduled campaign is not due yet", 409);

    // =====================================
    // Template Validation
    // =====================================
    if (!campaign.template) {
      throw new AppError("Template not found", 404);
    }

    if (!campaign.template.metaTemplateName) {
      throw new AppError("Meta template name is missing", 422);
    }
    if (campaign.template.status !== "APPROVED") throw new AppError("Campaign template is not approved by Meta", 422);

    // =====================================
    // Store Original Campaign Counts
    // =====================================
    const initialSentCount = campaign.sentCount || 0;

    const initialFailedCount = campaign.failedCount || 0;

    // =====================================
    // Mark Campaign as Started
    // =====================================
    const startedAt = new Date();

    console.log("🚀 Marking campaign as STARTED...");

    const claimed = await campaignRepository.claimForSending(
      campaign.id,
      companyId,
      startedAt,
    );
    if (!claimed)
      throw new AppError(
        "Campaign is already being processed or cannot be sent",
        409,
      );

    // =====================================
    // Get ALL Pending Recipients
    // =====================================
    const result = await campaignRecipientRepository.findAll(
      companyId,
      1,
      100000,
      "created_at",
      "ASC",
      {
        campaignId,
        status: "PENDING",
      },
    );

    const recipients = result.recipients;

    // =====================================
    // No Pending Recipients
    // =====================================
    if (!recipients.length) {
      await campaignRepository.update(campaign.id, companyId, {
        status: campaign.status,
        progress: 100,
        completedAt: new Date(),
      });

      throw new AppError("No pending recipients found", 422);
    }

    // =====================================
    // Total Recipients
    // =====================================
    const totalRecipients = recipients.length;

    await campaignRepository.update(campaign.id, companyId, {
      totalRecipients,
    });

    let sentCount = 0;
    let failedCount = 0;
    let processedCount = 0;

    const successRecipients = [];
    const failedRecipients = [];

    // =====================================
    // Send Messages
    // =====================================
    for (const recipient of recipients) {
      try {
        // ---------------------------------
        // Validate Customer
        // ---------------------------------
        if (!recipient.customer) {
          throw new Error("Customer not found");
        }

        if (!recipient.customer.mobile) {
          throw new Error("Customer mobile number not found");
        }

        console.log("=================================");

        console.log("Sending To :", recipient.customer.mobile);

        console.log("Template   :", campaign.template.metaTemplateName);

        console.log("=================================");

        // ---------------------------------
        // Send WhatsApp Template
        // ---------------------------------
        const response = await whatsappService.sendTemplateMessage({
          to: recipient.customer.mobile,
          templateName: campaign.template.metaTemplateName,
          languageCode: campaign.template.language || "en_US",
          components: [],
        });

        // ---------------------------------
        // Get WhatsApp Message ID
        // ---------------------------------
        const whatsappMessageId = response?.messages?.[0]?.id;

        if (!whatsappMessageId) {
          throw new Error("WhatsApp message ID not returned");
        }

        // ---------------------------------
        // Update Recipient - SENT
        // ---------------------------------
        await campaignRecipientRepository.update(recipient.id, companyId, {
          status: "SENT",
          sentAt: new Date(),
          whatsappMessageId,
        });

        sentCount++;
        processedCount++;

        successRecipients.push({
          customerId: recipient.customer.id,

          mobile: recipient.customer.mobile,

          whatsappMessageId,
        });

        console.log(`✅ Sent to ${recipient.customer.mobile}`);
      } catch (error) {
        // ---------------------------------
        // Recipient Failed
        // ---------------------------------
        failedCount++;
        processedCount++;

        await campaignRecipientRepository.update(recipient.id, companyId, {
          status: "FAILED",
          failureReason: error.message,
        });

        failedRecipients.push({
          customerId: recipient.customer?.id || null,

          mobile: recipient.customer?.mobile || null,

          reason: error.message,
        });

        console.log(`❌ Failed : ${error.message}`);
      }

      // =====================================
      // Calculate Live Progress
      // =====================================
      const progress = Math.round((processedCount / totalRecipients) * 100);

      // =====================================
      // Update Live Campaign Statistics
      // =====================================
      await campaignRepository.update(campaign.id, companyId, {
        sentCount: initialSentCount + sentCount,

        failedCount: initialFailedCount + failedCount,

        progress,

        status: "RUNNING",
      });

      console.log(`📊 Campaign Progress: ${progress}%`);

      console.log(`📤 Sent: ${sentCount}`);

      console.log(`❌ Failed: ${failedCount}`);
    }

    // =====================================
    // Determine Final Campaign Status
    // =====================================
    let finalStatus;

    if (sentCount === 0 && failedCount > 0) {
      // All recipients failed
      finalStatus = "FAILED";
    } else {
      // All succeeded OR mixed success/failure
      finalStatus = "COMPLETED";
    }

    const completedAt = new Date();

    // =====================================
    // Final Campaign Update
    // =====================================
    await campaignRepository.update(campaign.id, companyId, {
      sentCount: initialSentCount + sentCount,

      failedCount: initialFailedCount + failedCount,

      progress: 100,

      status: finalStatus,

      completedAt,
    });

    // =====================================
    // Final Logs
    // =====================================
    console.log("==========================================");

    console.log("🏁 Campaign Processing Completed");

    console.log("Campaign ID :", campaign.id);

    console.log("Total       :", totalRecipients);

    console.log("Sent        :", sentCount);

    console.log("Failed      :", failedCount);

    console.log("Progress    :", 100);

    console.log("Status      :", finalStatus);

    console.log("==========================================");

    // =====================================
    // Return Response
    // =====================================
    return {
      success: sentCount > 0,

      message:
        finalStatus === "FAILED"
          ? "Campaign failed. All recipients failed."
          : failedCount > 0
            ? "Campaign completed with some failed recipients."
            : "Campaign completed successfully.",

      campaignId: campaign.id,

      totalRecipients,

      sentCount,

      failedCount,

      progress: 100,

      startedAt,

      completedAt,

      status: finalStatus,

      successRecipients,

      failedRecipients,
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

    const updatedCampaign = await campaignRepository.update(
      campaign.id,
      companyId,
      {
        status: "CANCELLED",
      },
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
