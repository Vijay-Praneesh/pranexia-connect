const campaignRepository = require("../repositories/campaign.repository");
const campaignRecipientRepository = require("../repositories/campaignRecipient.repository");
const whatsappService = require("./whatsapp.service");

class CampaignService {
  // =====================================
  // Create Campaign
  // =====================================
  async createCampaign(companyId, data) {
    const existingCampaign = await campaignRepository.findByName(
      companyId,
      data.name
    );

    if (existingCampaign) {
      throw new Error("Campaign name already exists");
    }

    return await campaignRepository.create({
      ...data,
      companyId,
    });
  }

  // =====================================
  // Get All Campaigns
  // =====================================
  async getAllCampaigns(
    companyId,
    page,
    limit,
    sortBy,
    order,
    filters
  ) {
    return await campaignRepository.findAll(
      companyId,
      page,
      limit,
      sortBy,
      order,
      filters
    );
  }

  // =====================================
  // Get Campaign By ID
  // =====================================
  async getCampaignById(companyId, id) {
    const campaign = await campaignRepository.findById(
      companyId,
      id
    );

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    return campaign;
  }

// =====================================
// Update Campaign
// =====================================
async updateCampaign(companyId, id, data) {
  const campaign = await campaignRepository.findById(
    companyId,
    id
  );

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const updateData = {
    ...data,
  };

  // When campaign is changed to scheduled,
  // automatically move it to SCHEDULED status
  if (data.sendType === "SCHEDULED") {
    if (!data.scheduledAt) {
      throw new Error(
        "scheduledAt is required for scheduled campaigns"
      );
    }

    updateData.status = "SCHEDULED";
  }

  return await campaignRepository.update(
    id,
    companyId,
    updateData
  );
}

  // =====================================
  // Delete Campaign
  // =====================================
  async deleteCampaign(companyId, id) {
    const campaign = await campaignRepository.findById(
      companyId,
      id
    );

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    await campaignRepository.delete(id, companyId);

    return {
      message: "Campaign deleted successfully",
    };
  }

  // =====================================
  // Search Campaigns
  // =====================================
  async searchCampaigns(companyId, keyword) {
    return await campaignRepository.search(
      companyId,
      keyword
    );
  }

  // =====================================
  // Send Campaign
  // =====================================
  async sendCampaign(companyId, campaignId) {
    // =====================================
    // Get Campaign
    // =====================================
    const campaign = await campaignRepository.findById(
      companyId,
      campaignId
    );

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // =====================================
    // Campaign Status Validation
    // =====================================
    console.log(
      "🔎 Campaign Status Before Send:",
      campaign.status
    );

    if (campaign.status === "RUNNING") {
      throw new Error("Campaign is already running");
    }

    if (campaign.status === "COMPLETED") {
      throw new Error(
        "Campaign has already been completed"
      );
    }

    if (campaign.status === "FAILED") {
      throw new Error(
        "Campaign has already failed and cannot be sent"
      );
    }

    if (campaign.status === "CANCELLED") {
      throw new Error(
        "Campaign has been cancelled and cannot be sent"
      );
    }

    // =====================================
    // Template Validation
    // =====================================
    if (!campaign.template) {
      throw new Error("Template not found");
    }

    if (!campaign.template.metaTemplateName) {
      throw new Error(
        "Meta template name is missing"
      );
    }

    // =====================================
    // Store Original Campaign Counts
    // =====================================
    const initialSentCount =
      campaign.sentCount || 0;

    const initialFailedCount =
      campaign.failedCount || 0;

    // =====================================
    // Mark Campaign as Started
    // =====================================
    const startedAt = new Date();

    console.log(
      "🚀 Marking campaign as STARTED..."
    );

    await campaignRepository.update(
      campaign.id,
      companyId,
      {
        status: "RUNNING",
        startedAt,
        progress: 0,
      }
    );

    const startedCampaign =
      await campaignRepository.findById(
        companyId,
        campaign.id
      );

    console.log(
      "========== Campaign After START =========="
    );

    console.dir(
      startedCampaign.toJSON(),
      { depth: null }
    );

    console.log(
      "=========================================="
    );

    // =====================================
    // Get ALL Pending Recipients
    // =====================================
    const result =
      await campaignRecipientRepository.findAll(
        companyId,
        1,
        100000,
        "created_at",
        "ASC",
        {
          campaignId,
          status: "PENDING",
        }
      );

    const recipients = result.recipients;

    // =====================================
    // No Pending Recipients
    // =====================================
    if (!recipients.length) {
      await campaignRepository.update(
        campaign.id,
        companyId,
        {
          status: "FAILED",
          progress: 100,
          completedAt: new Date(),
        }
      );

      throw new Error(
        "No pending recipients found"
      );
    }

    // =====================================
    // Total Recipients
    // =====================================
    const totalRecipients = recipients.length;

    await campaignRepository.update(
      campaign.id,
      companyId,
      {
        totalRecipients,
      }
    );

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
          throw new Error(
            "Customer not found"
          );
        }

        if (!recipient.customer.mobile) {
          throw new Error(
            "Customer mobile number not found"
          );
        }

        console.log(
          "================================="
        );

        console.log(
          "Sending To :",
          recipient.customer.mobile
        );

        console.log(
          "Template   :",
          campaign.template.metaTemplateName
        );

        console.log(
          "================================="
        );

        // ---------------------------------
        // Send WhatsApp Template
        // ---------------------------------
        const response =
          await whatsappService.sendTemplateMessage(
            {
              to: recipient.customer.mobile,
              templateName:
                campaign.template
                  .metaTemplateName,
              languageCode:
                campaign.template.language ||
                "en_US",
              components: [],
            }
          );

        // ---------------------------------
        // Get WhatsApp Message ID
        // ---------------------------------
        const whatsappMessageId =
          response?.messages?.[0]?.id;

        if (!whatsappMessageId) {
          throw new Error(
            "WhatsApp message ID not returned"
          );
        }

        // ---------------------------------
        // Update Recipient - SENT
        // ---------------------------------
        await campaignRecipientRepository.update(
          recipient.id,
          companyId,
          {
            status: "SENT",
            sentAt: new Date(),
            whatsappMessageId,
          }
        );

        sentCount++;
        processedCount++;

        successRecipients.push({
          customerId:
            recipient.customer.id,

          mobile:
            recipient.customer.mobile,

          whatsappMessageId,
        });

        console.log(
          `✅ Sent to ${recipient.customer.mobile}`
        );
      } catch (error) {
        // ---------------------------------
        // Recipient Failed
        // ---------------------------------
        failedCount++;
        processedCount++;

        await campaignRecipientRepository.update(
          recipient.id,
          companyId,
          {
            status: "FAILED",
            failureReason: error.message,
          }
        );

        failedRecipients.push({
          customerId:
            recipient.customer?.id || null,

          mobile:
            recipient.customer?.mobile || null,

          reason: error.message,
        });

        console.log(
          `❌ Failed : ${error.message}`
        );
      }

      // =====================================
      // Calculate Live Progress
      // =====================================
      const progress = Math.round(
        (processedCount /
          totalRecipients) *
          100
      );

      // =====================================
      // Update Live Campaign Statistics
      // =====================================
      await campaignRepository.update(
        campaign.id,
        companyId,
        {
          sentCount:
            initialSentCount +
            sentCount,

          failedCount:
            initialFailedCount +
            failedCount,

          progress,

          status: "RUNNING",
        }
      );

      console.log(
        `📊 Campaign Progress: ${progress}%`
      );

      console.log(
        `📤 Sent: ${sentCount}`
      );

      console.log(
        `❌ Failed: ${failedCount}`
      );
    }

    // =====================================
    // Determine Final Campaign Status
    // =====================================
    let finalStatus;

    if (
      sentCount === 0 &&
      failedCount > 0
    ) {
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
    await campaignRepository.update(
      campaign.id,
      companyId,
      {
        sentCount:
          initialSentCount +
          sentCount,

        failedCount:
          initialFailedCount +
          failedCount,

        progress: 100,

        status: finalStatus,

        completedAt,
      }
    );

    // =====================================
    // Final Logs
    // =====================================
    console.log(
      "=========================================="
    );

    console.log(
      "🏁 Campaign Processing Completed"
    );

    console.log(
      "Campaign ID :",
      campaign.id
    );

    console.log(
      "Total       :",
      totalRecipients
    );

    console.log(
      "Sent        :",
      sentCount
    );

    console.log(
      "Failed      :",
      failedCount
    );

    console.log(
      "Progress    :",
      100
    );

    console.log(
      "Status      :",
      finalStatus
    );

    console.log(
      "=========================================="
    );

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
  async cancelCampaign(
    companyId,
    campaignId
  ) {
    const campaign =
      await campaignRepository.findById(
        companyId,
        campaignId
      );

    if (!campaign) {
      throw new Error(
        "Campaign not found"
      );
    }

    // Only scheduled campaigns
    // can be cancelled
    if (
      campaign.status !== "SCHEDULED"
    ) {
      throw new Error(
        `Campaign cannot be cancelled because its current status is ${campaign.status}`
      );
    }

    const updatedCampaign =
      await campaignRepository.update(
        campaign.id,
        companyId,
        {
          status: "CANCELLED",
        }
      );

    return {
      campaignId:
        updatedCampaign.id,

      name:
        updatedCampaign.name,

      status:
        updatedCampaign.status,

      message:
        "Campaign cancelled successfully",
    };
  }

  // =====================================
  // Campaign Report
  // =====================================
  async getCampaignReport(
    companyId,
    campaignId
  ) {
    const campaign =
      await campaignRepository.findById(
        companyId,
        campaignId
      );

    if (!campaign) {
      throw new Error(
        "Campaign not found"
      );
    }

    // =====================================
    // Sync campaign counters
    // from recipient statuses
    // =====================================
    await campaignRepository.syncCounters(
      campaignId
    );

    // =====================================
    // Fetch updated campaign
    // =====================================
    const updatedCampaign =
      await campaignRepository.findById(
        companyId,
        campaignId
      );

    // =====================================
    // Campaign Statistics
    // =====================================
    const totalRecipients =
      updatedCampaign.totalRecipients || 0;

    const sentCount =
      updatedCampaign.sentCount || 0;

    const deliveredCount =
      updatedCampaign.deliveredCount || 0;

    const readCount =
      updatedCampaign.readCount || 0;

    const failedCount =
      updatedCampaign.failedCount || 0;

    // =====================================
    // Calculate Rates
    // =====================================
    const deliveryRate =
      totalRecipients > 0
        ? Math.round(
            (deliveredCount /
              totalRecipients) *
              100
          )
        : 0;

    const readRate =
      totalRecipients > 0
        ? Math.round(
            (readCount /
              totalRecipients) *
              100
          )
        : 0;

    const failureRate =
      totalRecipients > 0
        ? Math.round(
            (failedCount /
              totalRecipients) *
              100
          )
        : 0;

    // =====================================
    // Return Campaign Report
    // =====================================
    return {
      campaignId:
        updatedCampaign.id,

      campaignName:
        updatedCampaign.name,

      status:
        updatedCampaign.status,

      totalRecipients,

      sentCount,

      deliveredCount,

      readCount,

      failedCount,

      progress:
        updatedCampaign.progress,

      deliveryRate,

      readRate,

      failureRate,

      startedAt:
        updatedCampaign.startedAt,

      completedAt:
        updatedCampaign.completedAt,
    };
  }
}

module.exports = new CampaignService();