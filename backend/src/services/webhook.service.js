const logger = require("../config/logger");
const whatsappRepository = require("../repositories/whatsapp.repository");
const campaignRecipientRepository = require("../repositories/campaignRecipient.repository");
const campaignRepository = require("../repositories/campaign.repository");

const STATUS_RANK = {
  PENDING: 0,
  QUEUED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
};

class WebhookService {
  /**
   * Process incoming WhatsApp Cloud API webhook events.
   * @param {object} payload - Parsed JSON webhook payload from Meta.
   */
  async processWebhook(payload) {
    try {
      if (!payload || !Array.isArray(payload.entry) || payload.entry.length === 0) {
        return;
      }

      for (const entry of payload.entry) {
        const wabaId = entry.id ? String(entry.id) : null;

        for (const change of entry.changes || []) {
          if (change.field !== "messages" || !change.value) continue;

          const value = change.value;
          const phoneNumberId = value.metadata?.phone_number_id
            ? String(value.metadata.phone_number_id)
            : null;

          // ==============================================================
          // 1. Resolve Tenant / Company via Phone Number ID or WABA ID
          // ==============================================================
          let connection = null;
          if (phoneNumberId) {
            connection = await whatsappRepository.findByPhoneNumberId(phoneNumberId);
          }
          if (!connection && wabaId) {
            connection = await whatsappRepository.findByWabaId(wabaId);
          }

          if (!connection) {
            logger.warn(
              `[Webhook] Received event for unmapped tenant. phone_number_id: ${phoneNumberId || "N/A"}, waba_id: ${wabaId || "N/A"}`
            );
            continue;
          }

          const companyId = connection.companyId;

          // ==============================================================
          // 2. Process Status Updates (sent, delivered, read, failed)
          // ==============================================================
          if (Array.isArray(value.statuses) && value.statuses.length > 0) {
            for (const status of value.statuses) {
              await this.processStatusEvent(companyId, status);
            }
          }

          // Note: Future WhatsApp events (incoming messages, account updates) can be handled here safely.
        }
      }
    } catch (error) {
      logger.error(`[Webhook] Processing error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process an individual status update with tenant isolation and idempotency.
   * @param {string} companyId - Authenticated company UUID resolved from connection.
   * @param {object} status - Meta status object from webhook payload.
   */
  async processStatusEvent(companyId, status) {
    const messageId = status.id;
    if (!messageId) return;

    // Strict tenant-scoped recipient resolution
    const recipient = await campaignRecipientRepository.findByWhatsappMessageIdAndCompany(
      messageId,
      companyId
    );

    if (!recipient) {
      logger.info(
        `[Webhook] Recipient not found for message_id: ${messageId} in company: ${companyId}`
      );
      return;
    }

    const eventDate = this.parseTimestamp(status.timestamp);
    const rawStatus = String(status.status || "").toLowerCase();
    const currentStatus = recipient.status;
    const currentRank = STATUS_RANK[currentStatus] ?? -1;

    const updateData = {};
    let shouldUpdate = false;

    switch (rawStatus) {
      case "sent": {
        if (currentRank < STATUS_RANK.SENT && currentStatus !== "FAILED") {
          updateData.status = "SENT";
          updateData.sentAt = recipient.sentAt || eventDate;
          shouldUpdate = true;
        } else if (!recipient.sentAt) {
          updateData.sentAt = eventDate;
          shouldUpdate = true;
        }
        break;
      }

      case "delivered": {
        if (currentRank < STATUS_RANK.DELIVERED && currentStatus !== "FAILED") {
          updateData.status = "DELIVERED";
          updateData.deliveredAt = recipient.deliveredAt || eventDate;
          if (!recipient.sentAt) updateData.sentAt = eventDate;
          shouldUpdate = true;
        } else if (!recipient.deliveredAt) {
          updateData.deliveredAt = eventDate;
          shouldUpdate = true;
        }
        break;
      }

      case "read": {
        if (currentRank < STATUS_RANK.READ && currentStatus !== "FAILED") {
          updateData.status = "READ";
          updateData.readAt = recipient.readAt || eventDate;
          if (!recipient.deliveredAt) updateData.deliveredAt = eventDate;
          if (!recipient.sentAt) updateData.sentAt = eventDate;
          shouldUpdate = true;
        } else if (!recipient.readAt) {
          updateData.readAt = eventDate;
          shouldUpdate = true;
        }
        break;
      }

      case "failed": {
        // Only mark failed if message was not already delivered or read
        if (currentRank < STATUS_RANK.DELIVERED && currentStatus !== "FAILED") {
          updateData.status = "FAILED";
          updateData.failureReason = this.formatFailureReason(status.errors);
          if (!recipient.sentAt) updateData.sentAt = eventDate;
          shouldUpdate = true;
        }
        break;
      }

      default:
        // Unknown status event, ignore safely
        return;
    }

    if (shouldUpdate) {
      await campaignRecipientRepository.update(
        recipient.id,
        recipient.companyId,
        updateData
      );

      logger.info(
        `[Webhook] Recipient ${recipient.id} updated -> status: ${updateData.status || currentStatus} (Message: ${messageId})`
      );

      if (recipient.campaignId) {
        await campaignRepository.syncCounters(recipient.campaignId);
      }
    }
  }

  /**
   * Parse epoch seconds timestamp from Meta webhook to Date object safely.
   */
  parseTimestamp(timestamp) {
    if (!timestamp) return new Date();
    const num = Number(timestamp);
    if (!isNaN(num) && num > 0) {
      return new Date(num * 1000);
    }
    return new Date();
  }

  /**
   * Format Meta error array into safe, readable failure reason.
   */
  formatFailureReason(errors) {
    if (!Array.isArray(errors) || errors.length === 0) {
      return "Message delivery failed";
    }

    const err = errors[0];
    const code = err.code ? `(${err.code}) ` : "";
    const title = err.title || "";
    const details = err.error_data?.details || err.message || "";

    if (title && details) {
      return `${code}${title}: ${details}`;
    }
    return `${code}${title || details || "Message delivery failed"}`;
  }
}

module.exports = new WebhookService();
