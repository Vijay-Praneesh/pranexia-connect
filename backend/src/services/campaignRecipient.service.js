const campaignRecipientRepository = require("../repositories/campaignRecipient.repository");
const campaignRepository = require("../repositories/campaign.repository");
const customerRepository = require("../repositories/customer.repository");
const AppError = require("../utils/appError");

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
      throw new AppError("Campaign not found", 404);
    }

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      throw new AppError("Customer IDs are required", 400);
    }

    const uniqueCustomerIds = [...new Set(customerIds)];
    const assignedCustomerIds = new Set(
      await campaignRecipientRepository.findAssignedCustomerIds(
        companyId,
        campaignId,
        uniqueCustomerIds
      )
    );
    const recipients = [];

    for (const customerId of uniqueCustomerIds) {
      if (assignedCustomerIds.has(customerId)) continue;

      const customer = await customerRepository.findById(
        companyId,
        customerId
      );

      if (!customer) {
        throw new AppError(`Customer not found: ${customerId}`, 404);
      }

      recipients.push({
        companyId,
        campaignId,
        customerId,
        status: "PENDING",
      });
    }

    if (recipients.length > 0) {
      await campaignRecipientRepository.bulkCreate(recipients);
    }

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
      throw new AppError("Recipient not found", 404);
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
    throw new AppError("Recipient not found", 404);
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
      throw new AppError("Recipient not found", 404);
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
