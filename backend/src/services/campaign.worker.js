const campaignRepository = require("../repositories/campaign.repository");
const campaignRecipientRepository = require("../repositories/campaignRecipient.repository");
const whatsappRepository = require("../repositories/whatsapp.repository");
const mediaService = require("./media.service");
const storageService = require("./storage.service");
const metaWhatsAppService = require("./meta.whatsapp.service");
const AppError = require("../utils/appError");

const BATCH_SIZE = 25;
const queue = new Map();
let draining = false;

function customerValue(customer, field) {
  const value = customer?.[field];
  return value === undefined || value === null ? "" : String(value);
}

function resolveComponents(template, mapping, customer) {
  const variables = Array.isArray(template.variables) ? template.variables : [];
  const mappings = mapping || {};
  const required = variables.map((variable, index) => typeof variable === "string" ? { index, key: variable } : { index, key: variable.key || variable.name || String(index + 1), required: variable.required !== false });
  const parameters = [];
  for (const variable of required) {
    const field = mappings[String(variable.index + 1)] || mappings[variable.key];
    const value = field ? customerValue(customer, field) : "";
    if (variable.required && !value) throw new AppError(`Required template variable ${variable.key} is unresolved`, 422);
    parameters.push({ type: "text", text: value });
  }
  if (!parameters.length) return [];
  return [{ type: "body", parameters }];
}

class CampaignWorker {
  enqueue(companyId, campaignId) {
    const key = `${companyId}:${campaignId}`;
    if (queue.has(key)) return false;
    queue.set(key, { companyId, campaignId });
    void this.drain();
    return true;
  }

  async drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.size) {
        const [, job] = queue.entries().next().value;
        queue.delete(`${job.companyId}:${job.campaignId}`);
        try { await this.process(job.companyId, job.campaignId); }
        catch (error) { await this.failCampaign(job.companyId, job.campaignId, error); }
      }
    } finally { draining = false; }
  }

  async process(companyId, campaignId) {
    const campaign = await campaignRepository.findById(companyId, campaignId);
    if (!campaign || campaign.status !== "RUNNING") return;
    const connection = await whatsappRepository.findByCompanyId(companyId);
    if (!connection || connection.status !== "CONNECTED") throw new AppError("WhatsApp Business is not connected", 409);

    let uploadedMediaId = null;
    let media = null;
    if (campaign.mediaId) {
      media = await mediaService.assertOwnedByCompany(companyId, campaign.mediaId);
      if (!(await storageService.exists(media.storageKey))) throw new AppError("Campaign media file is unavailable", 422);
    }

    let processed = 0;
    while (true) {
      const recipients = await campaignRecipientRepository.claimPending(companyId, campaignId, BATCH_SIZE);
      if (!recipients.length) break;
      for (const recipient of recipients) {
        await this.processRecipient(companyId, connection, campaign, recipient, media, uploadedMediaId)
          .then((result) => { uploadedMediaId = result.mediaId || uploadedMediaId; })
          .catch(async (error) => { await campaignRecipientRepository.update(recipient.id, companyId, { status: "FAILED", failureReason: error.message }); });
        processed += 1;
        await campaignRepository.syncCounters(campaignId);
        await campaignRepository.update(campaignId, companyId, { progress: Math.min(99, Math.round((processed / Math.max(campaign.totalRecipients || processed, 1)) * 100)), status: "RUNNING" });
      }
    }

    const latest = await campaignRepository.syncCounters(campaignId);
    const finalStatus = latest.sentCount > 0 ? "COMPLETED" : "FAILED";
    await campaignRepository.update(campaignId, companyId, { status: finalStatus, progress: 100, completedAt: new Date() });
  }

  async processRecipient(companyId, connection, campaign, recipient, media, uploadedMediaId) {
    const customer = recipient.customer;
    if (!customer?.mobile) throw new AppError("Customer mobile number is unavailable", 422);
    const variableData = {};
    const mappings = campaign.variableMappings || {};
    for (const field of Object.values(mappings)) variableData[field] = customerValue(customer, field);
    const components = resolveComponents(campaign.template, mappings, customer);
    let metaMediaId = uploadedMediaId;
    if (media && !metaMediaId) {
      const buffer = await storageService.readBuffer(media.storageKey);
      metaMediaId = await metaWhatsAppService.uploadMedia(connection, { buffer, mimeType: media.mimeType, size: media.size, originalName: media.originalName });
    }
    await campaignRecipientRepository.update(recipient.id, companyId, { variableData, phoneSnapshot: customer.mobile });
    const response = await metaWhatsAppService.sendTemplateMessage(connection, { to: customer.mobile, templateName: campaign.template.metaTemplateName, languageCode: campaign.template.language, components, mediaId: metaMediaId, mediaType: media?.mediaType });
    const metaMessageId = response.messages[0].id;
    await campaignRecipientRepository.update(recipient.id, companyId, { status: "SENT", sentAt: new Date(), whatsappMessageId: metaMessageId });
    return { mediaId: metaMediaId };
  }

  async failCampaign(companyId, campaignId, error) {
    await campaignRepository.update(campaignId, companyId, { status: "FAILED", progress: 100, completedAt: new Date() });
  }
}

module.exports = new CampaignWorker();
