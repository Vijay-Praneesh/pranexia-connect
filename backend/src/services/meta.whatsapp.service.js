const axios = require("axios");
const { decryptSecret } = require("../utils/secret.crypto");
const AppError = require("../utils/appError");
const logger = require("../config/logger");

class MetaWhatsAppService {
  get apiVersion() {
    return process.env.META_API_VERSION || process.env.WHATSAPP_API_VERSION || "v20.0";
  }
  get graphBase() {
    return `https://graph.facebook.com/${this.apiVersion}`;
  }

  token(connection) {
    try {
      return decryptSecret(connection.accessTokenEncrypted);
    } catch {
      throw new AppError(
        "WhatsApp connection credentials are unavailable",
        503,
      );
    }
  }

  handleMetaError(error, defaultMessage = "Meta WhatsApp operation failed") {
    if (error instanceof AppError) throw error;
    const metaError = error.response?.data?.error;
    const status = error.response?.status;
    const code = metaError?.code;
    const subcode = metaError?.error_subcode;
    const message = metaError?.message || error.message || defaultMessage;

    logger.error(`[Meta WhatsApp API Error] Status: ${status || "N/A"}, Code: ${code || "N/A"}, Subcode: ${subcode || "N/A"}, Message: ${message}`);

    // Expired or invalid token (OAuthException, Code 190)
    if (status === 401 || status === 403 || code === 190) {
      throw new AppError("Meta authentication failed. WhatsApp access token is invalid or expired. Please reconnect.", 401);
    }
    // Rate limit (Code 80007, 429)
    if (status === 429 || code === 80007 || code === 4) {
      throw new AppError("Meta rate limit reached. Please retry shortly.", 429);
    }
    // Invalid recipient phone number / not on WhatsApp
    if (code === 131030 || code === 131026) {
      throw new AppError(`Invalid recipient: ${message}`, 400);
    }
    // Template not found / not approved / variable mismatch
    if (code === 132000 || code === 132001 || code === 132015 || code === 100) {
      throw new AppError(`WhatsApp template error: ${message}`, 400);
    }
    // General 4xx client errors
    if (status && status >= 400 && status < 500) {
      throw new AppError(message, status);
    }
    // Default upstream/Meta failure
    throw new AppError(message || defaultMessage, 502);
  }

  async uploadMedia(connection, media) {
    const token = this.token(connection);
    try {
      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append(
        "file",
        new Blob([media.buffer], { type: media.mimeType }),
        media.originalName || "media",
      );
      const response = await axios.post(
        `${this.graphBase}/${connection.phoneNumberId}/media`,
        form,
        {
          headers: { Authorization: `Bearer ${token}` },
          maxContentLength: media.size,
          maxBodyLength: media.size,
        },
      );
      if (!response.data?.id)
        throw new AppError("Meta did not return a media ID", 502);
      return response.data.id;
    } catch (error) {
      this.handleMetaError(error, "Failed to upload media to WhatsApp");
    }
  }

  async sendTemplateMessage(
    connection,
    { to, templateName, languageCode, components, mediaId, mediaType },
  ) {
    if (!to) {
      throw new AppError("Recipient phone number ('to') is required", 400);
    }
    if (!templateName) {
      throw new AppError("Template name is required", 400);
    }

    const token = this.token(connection);
    const templateComponents = [...(components || [])];
    if (mediaId) {
      const header = templateComponents.find(
        (component) => component.type === "header",
      );
      const parameter = {
        type: (mediaType || "image").toLowerCase(),
        [(mediaType || "image").toLowerCase()]: { id: mediaId },
      };
      if (header) header.parameters = [...(header.parameters || []), parameter];
      else
        templateComponents.unshift({ type: "header", parameters: [parameter] });
    }

    try {
      const response = await axios.post(
        `${this.graphBase}/${connection.phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          to: String(to).replace(/[^\d+]/g, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode || "en_US" },
            components: templateComponents,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.data?.messages?.[0]?.id)
        throw new AppError("Meta did not return a message ID", 502);
      return response.data;
    } catch (error) {
      this.handleMetaError(error, "Failed to send WhatsApp template message");
    }
  }

  async sendTextMessage(connection, { to, body }) {
    if (!to || !body) {
      throw new AppError("Recipient phone number ('to') and message 'body' are required", 400);
    }
    const token = this.token(connection);
    try {
      const response = await axios.post(
        `${this.graphBase}/${connection.phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: String(to).replace(/[^\d+]/g, ""),
          type: "text",
          text: { preview_url: false, body },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.data?.messages?.[0]?.id)
        throw new AppError("Meta did not return a message ID", 502);
      return response.data;
    } catch (error) {
      this.handleMetaError(error, "Failed to send WhatsApp text message");
    }
  }
}

module.exports = new MetaWhatsAppService();
