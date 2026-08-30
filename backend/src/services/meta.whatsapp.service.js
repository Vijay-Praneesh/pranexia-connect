const axios = require("axios");
const { decryptSecret } = require("../utils/secret.crypto");
const AppError = require("../utils/appError");

class MetaWhatsAppService {
  get apiVersion() { return process.env.META_API_VERSION || process.env.WHATSAPP_API_VERSION; }
  get graphBase() { return `https://graph.facebook.com/${this.apiVersion}`; }

  token(connection) {
    try { return decryptSecret(connection.accessTokenEncrypted); }
    catch { throw new AppError("WhatsApp connection credentials are unavailable", 503); }
  }

  async uploadMedia(connection, media) {
    const token = this.token(connection);
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("file", new Blob([media.buffer], { type: media.mimeType }), media.originalName || "media");
    const response = await axios.post(`${this.graphBase}/${connection.phoneNumberId}/media`, form, {
      headers: { Authorization: `Bearer ${token}` },
      maxContentLength: media.size,
      maxBodyLength: media.size,
    });
    if (!response.data?.id) throw new AppError("Meta did not return a media ID", 502);
    return response.data.id;
  }

  async sendTemplateMessage(connection, { to, templateName, languageCode, components, mediaId, mediaType }) {
    const token = this.token(connection);
    const templateComponents = [...(components || [])];
    if (mediaId) {
      const header = templateComponents.find((component) => component.type === "header");
      const parameter = { type: mediaType.toLowerCase(), [mediaType.toLowerCase()]: { id: mediaId } };
      if (header) header.parameters = [...(header.parameters || []), parameter];
      else templateComponents.unshift({ type: "header", parameters: [parameter] });
    }
    const response = await axios.post(`${this.graphBase}/${connection.phoneNumberId}/messages`, {
      messaging_product: "whatsapp", to, type: "template",
      template: { name: templateName, language: { code: languageCode || "en_US" }, components: templateComponents },
    }, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    if (!response.data?.messages?.[0]?.id) throw new AppError("Meta did not return a message ID", 502);
    return response.data;
  }
}

module.exports = new MetaWhatsAppService();
