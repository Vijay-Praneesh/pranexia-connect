const { Op } = require("sequelize");
const { Company, User } = require("../models");

class CompanyRepository {
  // Create a company
  async create(companyData, transaction = null) {
    return await Company.create(companyData, {
      transaction,
    });
  }

  // Find company by ID
  async findById(id) {
    return await Company.findByPk(id, {
      include: [
        {
          model: User,
          as: "users",
          attributes: {
            exclude: ["password"],
          },
        },
      ],
    });
  }

  // Find company by email
  async findByEmail(email) {
    return await Company.findOne({
      where: {
        email,
      },
    });
  }

  // Get all client companies
  async findAll({
    page = 1,
    limit = 10,
    search = "",
    status,
    plan,
  } = {}) {
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        {
          companyName: {
            [Op.like]: `%${search}%`,
          },
        },
        {
          email: {
            [Op.like]: `%${search}%`,
          },
        },
        {
          mobile: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (plan) {
      where.plan = plan;
    }

    return await Company.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "users",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "email",
            "mobile",
            "role",
            "status",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });
  }

  // Update company
  async update(id, companyData) {
    await Company.update(companyData, {
      where: {
        id,
      },
    });

    return await this.findById(id);
  }

  // Change company status
  async updateStatus(id, status) {
    await Company.update(
      {
        status,
      },
      {
        where: {
          id,
        },
      }
    );

    return await this.findById(id);
  }

  // Delete company
  async delete(id) {
    return await Company.destroy({
      where: {
        id,
      },
    });
  }
}

module.exports = new CompanyRepository();