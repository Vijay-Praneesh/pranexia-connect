const { Op } = require("sequelize");
const { Template } = require("../models");

class TemplateRepository {
  async create(templateData) {
    return await Template.create(templateData);
  }

  async findByName(companyId, name) {
    return await Template.findOne({
      where: {
        companyId,
        name,
      },
    });
  }

  async findById(companyId, id) {
    return await Template.findOne({
      where: {
        companyId,
        id,
      },
    });
  }

async findAll(
  companyId,
  page = 1,
  limit = 10,
  sortBy = "created_at",
  order = "DESC",
  filters = {}
) {
  const offset = (page - 1) * limit;

  const where = {
    companyId,
  };

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.language) {
    where.language = filters.language;
  }

  const sortColumnMap = {
    createdAt: "created_at",
    updatedAt: "updated_at",
    created_at: "created_at",
    updated_at: "updated_at",
    name: "name",
    category: "category",
    language: "language",
    status: "status",
  };

  const safeSortBy = sortColumnMap[sortBy] || "created_at";
  const safeOrder =
    order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  return await Template.findAndCountAll({
    where,
    order: [[safeSortBy, safeOrder]],
    limit,
    offset,
  });
}

  async update(companyId, id, templateData) {
    return await Template.update(templateData, {
      where: {
        companyId,
        id,
      },
    });
  }

  async delete(companyId, id) {
    return await Template.destroy({
      where: {
        companyId,
        id,
      },
    });
  }

  async search(companyId, keyword) {
    return await Template.findAll({
      where: {
        companyId,
        [Op.or]: [
          {
            name: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            body: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            category: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            language: {
              [Op.like]: `%${keyword}%`,
            },
          },
        ],
      },
      order: [["created_at", "DESC"]],
    });
  }
}

module.exports = new TemplateRepository();