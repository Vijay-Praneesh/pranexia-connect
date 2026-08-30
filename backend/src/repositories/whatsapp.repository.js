const { WhatsAppConnection } = require("../models");

class WhatsAppRepository {
  async findByCompanyId(companyId) {
    return await WhatsAppConnection.findOne({ where: { companyId } });
  }

  async upsert(companyId, data) {
    const [connection, created] = await WhatsAppConnection.findOrCreate({
      where: { companyId },
      defaults: { companyId, ...data },
    });
    if (!created) await connection.update(data);
    return connection;
  }

  async disconnect(companyId) {
    const connection = await this.findByCompanyId(companyId);
    if (!connection) return null;
    await connection.update({
      status: "DISCONNECTED",
      disconnectedAt: new Date(),
    });
    return connection;
  }
}

module.exports = new WhatsAppRepository();
