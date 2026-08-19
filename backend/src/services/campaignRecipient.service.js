const campaignRecipientRepository = require("../repositories/campaignRecipient.repository");
const campaignRepository = require("../repositories/campaign.repository");
const customerRepository = require("../repositories/customer.repository");

class CampaignRecipientService {
  // =====================================
  // Assign Recipients to Campaign
  // =====================================
  async assignRecipients(companyId, campaignId, customerIds) {
    const campaign = await campaignRepository.findById(
      companyId,
      campaignId
    );

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const recipients = [];

    for (const customerId of customerIds) {
      const customer = await customerRepository.findById(
        companyId,
        customerId
      );

      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      recipients.push({
        companyId,
        campaignId,
        customerId,
        status: "PENDING",
      });
    }

    // Create campaign recipients
    await campaignRecipientRepository.bulkCreate(recipients);

    // Sync campaign counters
    const updatedCampaign =
      await campaignRepository.syncCounters(campaignId);

    return {
      message: `${recipients.length} recipients assigned successfully`,
      totalRecipients: updatedCampaign.totalRecipients,
    };
  }

  // =====================================
  // Get All Recipients
  // =====================================
  async getAllRecipients(
    companyId,
    page,
    limit,
    sortBy,
    order,
    filters
  ) {
    return await campaignRecipientRepository.findAll(
      companyId,
      page,
      limit,
      sortBy,
      order,
      filters
    );
  }

  // =====================================
  // Get Recipient By ID
  // =====================================
  async getRecipientById(companyId, id) {
    const recipient = await campaignRecipientRepository.findById(
      companyId,
      id
    );

    if (!recipient) {
      throw new Error("Recipient not found");
    }

    return recipient;
  }

// =====================================
// Update Recipient
// =====================================
async updateRecipient(companyId, id, data) {
  const recipient = await campaignRecipientRepository.findById(
    companyId,
    id
  );

  if (!recipient) {
    throw new Error("Recipient not found");
  }

  const updatedRecipient =
    await campaignRecipientRepository.update(
      id,
      companyId,
      data
    );

  // Sync campaign counters after recipient update
  await campaignRepository.syncCounters(
    recipient.campaignId
  );

  return updatedRecipient;
}

  // =====================================
  // Delete Recipient
  // =====================================
  async deleteRecipient(companyId, id) {
    const recipient = await campaignRecipientRepository.findById(
      companyId,
      id
    );

    if (!recipient) {
      throw new Error("Recipient not found");
    }

    await campaignRecipientRepository.delete(
      id,
      companyId
    );

    // Sync campaign counters after deletion
    await campaignRepository.syncCounters(
      recipient.campaignId
    );

    return {
      message: "Recipient deleted successfully",
    };
  }

  // =====================================
  // Search Recipients
  // =====================================
  async searchRecipients(companyId, keyword) {
    return await campaignRecipientRepository.search(
      companyId,
      keyword
    );
  }
}

module.exports = new CampaignRecipientService();