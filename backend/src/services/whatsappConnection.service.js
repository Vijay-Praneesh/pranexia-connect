const axios = require("axios");
const AppError = require("../utils/appError");
const whatsappRepository = require("../repositories/whatsapp.repository");
const { encryptSecret } = require("../utils/secret.crypto");

class WhatsAppConnectionService {
  get apiVersion() { return process.env.META_API_VERSION || process.env.WHATSAPP_API_VERSION; }
  get graphBase() { return `https://graph.facebook.com/${this.apiVersion}`; }

  async getStatus(companyId) {
    const connection = await whatsappRepository.findByCompanyId(companyId);
    if (!connection) return { status: "DISCONNECTED", connection: null };
    return { status: connection.status, connection: this.safeConnection(connection) };
  }

  async connect(companyId, { code, wabaId, phoneNumberId }) {
    if (!code || !/^\d+$/.test(String(wabaId)) || !/^\d+$/.test(String(phoneNumberId))) throw new AppError("A valid Meta onboarding code, WABA ID, and phone number ID are required", 400);
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !this.apiVersion) throw new AppError("Meta WhatsApp onboarding is not configured", 503);

    let token;
    try {
      const exchange = await axios.get(`${this.graphBase}/oauth/access_token`, { params: { client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, code } });
      token = exchange.data.access_token;
      const [waba, phone] = await Promise.all([
        axios.get(`${this.graphBase}/${wabaId}`, { params: { fields: "id,name", access_token: token } }),
        axios.get(`${this.graphBase}/${phoneNumberId}`, { params: { fields: "id,display_phone_number,verified_name", access_token: token } }),
      ]);
      if (String(waba.data.id) !== String(wabaId) || String(phone.data.id) !== String(phoneNumberId)) throw new AppError("Meta returned mismatched WhatsApp identifiers", 400);
      await axios.post(`${this.graphBase}/${wabaId}/subscribed_apps`, null, { params: { access_token: token } });
      const connection = await whatsappRepository.upsert(companyId, { wabaId: String(wabaId), phoneNumberId: String(phoneNumberId), displayPhoneNumber: phone.data.display_phone_number || null, verifiedName: phone.data.verified_name || null, accessTokenEncrypted: encryptSecret(token), status: "CONNECTED", connectedAt: new Date(), disconnectedAt: null, lastError: null });
      return this.safeConnection(connection);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.response?.data?.error?.message || "Meta WhatsApp connection could not be verified", 502);
    }
  }

  async disconnect(companyId) { const connection = await whatsappRepository.disconnect(companyId); return connection ? this.safeConnection(connection) : null; }
  safeConnection(connection) { const data = connection.toJSON(); delete data.accessTokenEncrypted; delete data.tokenExpiresAt; delete data.lastError; return data; }
}

module.exports = new WhatsAppConnectionService();
