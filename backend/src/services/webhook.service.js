const campaignRecipientRepository = require("../repositories/campaignRecipient.repository");
const campaignRepository = require("../repositories/campaign.repository");


class WebhookService {
  async processWebhook(payload) {
    try {
      console.log("========== PROCESSING WEBHOOK ==========");

      if (!payload.entry || !payload.entry.length) {
        console.log("No entry found in webhook payload.");
        return;
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;

          const value = change.value;

          if (value.statuses) {
            for (const status of value.statuses) {
              console.log("--------------------------------");
              console.log("Message ID :", status.id);
              console.log("Status     :", status.status);
              console.log("Recipient  :", status.recipient_id);
              console.log("Timestamp  :", status.timestamp);
              console.log("--------------------------------");

              // Find recipient using WhatsApp Message ID
              const recipient =
                await campaignRecipientRepository.findByWhatsappMessageId(
                  status.id
                );

              if (!recipient) {
                console.log("Recipient not found for Message ID:", status.id);
                continue;
              }

              const updateData = {};

              switch (status.status) {
                case "sent":
                  updateData.status = "SENT";
                  updateData.sentAt = new Date();
                  break;

                case "delivered":
                  updateData.status = "DELIVERED";
                  updateData.deliveredAt = new Date();
                  break;

                case "read":
                  updateData.status = "READ";
                  updateData.readAt = new Date();
                  break;

                case "failed":
                  updateData.status = "FAILED";
                  updateData.failureReason =
                    status.errors?.[0]?.title || "Unknown Error";
                  break;

                default:
                  continue;
              }

              await campaignRecipientRepository.update(
                recipient.id,
                recipient.companyId,
                updateData
              );

              console.log(
                `✅ Recipient updated to ${updateData.status}`
              );

              await campaignRepository.syncCounters(
                recipient.campaignId
              );

              console.log(
                `✅ Campaign counters synchronized for ${recipient.campaignId}`
              );
            }
          }

          if (value.messages) {
            console.log("Incoming WhatsApp Message");
            console.dir(value.messages, { depth: null });
          }
        }
      }

      console.log("========== WEBHOOK PROCESSED ==========");
    } catch (error) {
      console.error("Webhook Service Error:", error.message);
      throw error;
    }
  }
}

module.exports = new WebhookService();