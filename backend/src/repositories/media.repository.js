const { Media } = require("../models");

class MediaRepository {
  findAllByCompany(companyId, page = 1, limit = 24) {
    return Media.findAndCountAll({ where: { companyId, status: "READY" }, limit, offset: (page - 1) * limit, order: [["created_at", "DESC"]] });
  }
  findByIdAndCompany(companyId, id) { return Media.findOne({ where: { id, companyId, status: "READY" } }); }
  create(data) { return Media.create(data); }
  markDeleted(companyId, id) { return Media.update({ status: "DELETED" }, { where: { id, companyId, status: "READY" } }); }
  deleteByIdAndCompany(companyId, id) { return Media.destroy({ where: { id, companyId, status: "DELETED" } }); }
}
module.exports = new MediaRepository();
