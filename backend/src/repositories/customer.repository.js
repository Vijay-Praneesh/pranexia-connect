const { Op } = require("sequelize");

const {
  Customer,
  CampaignRecipient,
  Campaign,
  Template,
} = require("../models");

class CustomerRepository {
  async create(customerData) {
    return await Customer.create(customerData);
  }

  async findByMobile(companyId, mobile) {
    return await Customer.findOne({
      where: {
        companyId,
        mobile,
      },
    });
  }

  async findByEmail(companyId, email) {
    return await Customer.findOne({
      where: {
        companyId,
        email,
      },
    });
  }

  async findById(companyId, id) {
    return await Customer.findOne({
      where: {
        id,
        companyId,
      },
    });
  }

  async findAll(
    companyId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "DESC",
    filters = {}
  ) {
    const offset = (page - 1) * limit;

    const where = {
      companyId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.country) {
      where.country = {
        [Op.like]: `%${filters.country}%`,
      };
    }

    return await Customer.findAndCountAll({
      where,
      order: [[sortBy, order.toUpperCase()]],
      limit,
      offset,
    });
  }

  async update(id, companyId, customerData) {
    return await Customer.update(customerData, {
      where: {
        id,
        companyId,
      },
    });
  }

  async delete(id, companyId) {
    return await Customer.destroy({
      where: {
        id,
        companyId,
      },
    });
  }

  // Find a soft deleted customer
  async findDeletedById(id, companyId) {
    return await Customer.findOne({
      where: {
        id,
        companyId,
      },
      paranoid: false,
    });
  }

  // Restore a soft deleted customer
  async restore(id, companyId) {
    return await Customer.restore({
      where: {
        id,
        companyId,
      },
    });
  }

  async search(companyId, keyword) {
    return await Customer.findAll({
      where: {
        companyId,
        [Op.or]: [
          {
            firstName: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            lastName: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            mobile: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            email: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            country: {
              [Op.like]: `%${keyword}%`,
            },
          },
        ],
      },
      order: [["createdAt", "DESC"]],
    });
  }

  async getDashboardStats(companyId) {
    const totalCustomers = await Customer.count({
      where: {
        companyId,
      },
    });

    const activeCustomers = await Customer.count({
      where: {
        companyId,
        status: "ACTIVE",
      },
    });

    const blockedCustomers = await Customer.count({
      where: {
        companyId,
        status: "BLOCKED",
      },
    });

    const countries = await Customer.count({
      where: {
        companyId,
      },
      distinct: true,
      col: "country",
    });

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await Customer.count({
      where: {
        companyId,
        createdAt: {
          [Op.gte]: firstDayOfMonth,
        },
      },
    });

    return {
      totalCustomers,
      activeCustomers,
      blockedCustomers,
      countries,
      newThisMonth,
    };
  }

  async bulkDelete(companyId, customerIds) {
    return await Customer.destroy({
      where: {
        companyId,
        id: {
          [Op.in]: customerIds,
        },
      },
    });
  }

  async bulkRestore(companyId, customerIds) {
    return await Customer.restore({
      where: {
        companyId,
        id: {
          [Op.in]: customerIds,
        },
      },
    });
  }

  async bulkStatusUpdate(companyId, customerIds, status) {
    return await Customer.update(
      {
        status,
      },
      {
        where: {
          companyId,
          id: {
            [Op.in]: customerIds,
          },
        },
      }
    );
  }

  async getAllForExport(companyId) {
    return await Customer.findAll({
      where: {
        companyId,
      },
      order: [["createdAt", "DESC"]],
      attributes: [
        "firstName",
        "lastName",
        "mobile",
        "email",
        "country",
        "status",
        "notes",
        "createdAt",
      ],
    });
  }

  async bulkCreate(customers) {
    return await Customer.bulkCreate(customers, {
      validate: true,
    });
  }

  // =====================================
  // Customer Campaign History
  // =====================================
  async getHistory(companyId, customerId) {
    return await CampaignRecipient.findAll({
      where: {
        companyId,
        customerId,
      },
      include: [
        {
          model: Campaign,
          as: "campaign",
          include: [
            {
              model: Template,
              as: "template",
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });
  }
}

module.exports = new CustomerRepository();