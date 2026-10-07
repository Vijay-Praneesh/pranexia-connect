const metaWhatsAppService = require("./meta.whatsapp.service");
const whatsappRepository = require("../repositories/whatsapp.repository");
const AppError = require("../utils/appError");

class WhatsAppService {
  async sendTemplateMessage({ companyId, connection, to, templateName, languageCode = "en_US", components = [], mediaId, mediaType }) {
    let conn = connection;
    if (!conn && companyId) {
      conn = await whatsappRepository.findByCompanyId(companyId);
    }
    if (!conn || conn.status !== "CONNECTED") {
      throw new AppError("WhatsApp Business account is not connected", 409);
    }
    return metaWhatsAppService.sendTemplateMessage(conn, {
      to,
      templateName,
      languageCode,
      components,
      mediaId,
      mediaType,
    });
  }

  async sendTextMessage({ companyId, connection, to, body }) {
    let conn = connection;
    if (!conn && companyId) {
      conn = await whatsappRepository.findByCompanyId(companyId);
    }
    if (!conn || conn.status !== "CONNECTED") {
      throw new AppError("WhatsApp Business account is not connected", 409);
    }
    return metaWhatsAppService.sendTextMessage(conn, { to, body });
  }
}

module.exports = new WhatsAppService();