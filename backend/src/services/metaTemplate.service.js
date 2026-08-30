const axios = require("axios");
const AppError = require("../utils/appError");
const { decryptSecret } = require("../utils/secret.crypto");

class MetaTemplateService {
  async request(connection, method, path, data) {
    const version = process.env.META_API_VERSION || process.env.WHATSAPP_API_VERSION;
    if (!version) throw new AppError("Meta API version is not configured", 503);
    try {
      const response = await axios({ method, url: `https://graph.facebook.com/${version}/${path}`, data, headers: { Authorization: `Bearer ${decryptSecret(connection.accessTokenEncrypted)}` }, params: method === "get" ? { limit: 250 } : undefined });
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) throw new AppError("Meta authentication failed. Reconnect your WhatsApp Business account.", 502);
      if (status === 429) throw new AppError("Meta rate limit reached. Try syncing again shortly.", 429);
      throw new AppError(error.response?.data?.error?.message || "Meta template operation failed", 502);
    }
  }
  listTemplates(connection) { return this.request(connection, "get", `${connection.wabaId}/message_templates`); }
  createTemplate(connection, payload) { return this.request(connection, "post", `${connection.wabaId}/message_templates`, payload); }
}
module.exports = new MetaTemplateService();
