const { Op } = require("sequelize");
const {
  CampaignRecipient,
  Campaign,
  Customer,
} = require("../models");

class CampaignRecipientRepository {
  async create(data) {
    return await CampaignRecipient.create(data);
  }

  async bulkCreate(data) {
    return await CampaignRecipient.bulkCreate(data);
  }

  async findById(companyId, id) {
    return await CampaignRecipient.findOne({
      where: {
        id,
        companyId,
      },
      include: [
        {
          model: Campaign,
          as: "campaign",
        },
        {
          model: Customer,
          as: "customer",
        },
      ],
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
    const where = {
      companyId,
    };

    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const offset = (page - 1) * limit;

    const sortColumnMap = {
      createdAt: "created_at",
      updatedAt: "updated_at",
      created_at: "created_at",
      updated_at: "updated_at",
      status: "status",
    };

    const safeSortBy =
      sortColumnMap[sortBy] || "created_at";

    const safeOrder =
      order.toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    const { rows, count } =
      await CampaignRecipient.findAndCountAll({
        where,
        include: [
          {
            model: Campaign,
            as: "campaign",
          },
          {
            model: Customer,
            as: "customer",
          },
        ],
        limit,
        offset,
        order: [[safeSortBy, safeOrder]],
      });

    return {
      recipients: rows,
      pagination: {
        page,
        limit,
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async update(id, companyId, data) {
    await CampaignRecipient.update(data, {
      where: {
        id,
        companyId,
      },
    });

    return await this.findById(companyId, id);
  }

  async delete(id, companyId) {
    return await CampaignRecipient.destroy({
      where: {
        id,
        companyId,
      },
    });
  }

  async search(companyId, keyword) {
  const searchKeyword = String(keyword || "").trim();

  // Empty search should return no results
  if (!searchKeyword) {
    return [];
  }

  // ==========================================
  // 1. Find matching customers
  // ==========================================
  const customers = await Customer.findAll({
    where: {
      companyId,
      [Op.or]: [
        {
          firstName: {
            [Op.like]: `%${searchKeyword}%`,
          },
        },
        {
          lastName: {
            [Op.like]: `%${searchKeyword}%`,
          },
        },
        {
          mobile: {
            [Op.like]: `%${searchKeyword}%`,
          },
        },
        {
          email: {
            [Op.like]: `%${searchKeyword}%`,
          },
        },
      ],
    },
    attributes: ["id"],
  });

  const customerIds = customers.map(
    (customer) => customer.id
  );

  // ==========================================
  // 2. Find matching campaigns
  // ==========================================
const campaigns = await Campaign.findAll({
  where: {
    companyId,
    [Op.or]: [
      {
        name: {
          [Op.like]: `%${searchKeyword}%`,
        },
      },
      {
        description: {
          [Op.like]: `%${searchKeyword}%`,
        },
      },
    ],
  },
  attributes: ["id"],
});

  const campaignIds = campaigns.map(
    (campaign) => campaign.id
  );

  // ==========================================
  // 3. If nothing matches, return empty array
  // ==========================================
  if (
    customerIds.length === 0 &&
    campaignIds.length === 0
  ) {
    return [];
  }

  // ==========================================
  // 4. Find matching recipients
  // ==========================================
  return await CampaignRecipient.findAll({
    where: {
      companyId,
      [Op.or]: [
        ...(customerIds.length > 0
          ? [
              {
                customerId: {
                  [Op.in]: customerIds,
                },
              },
            ]
          : []),

        ...(campaignIds.length > 0
          ? [
              {
                campaignId: {
                  [Op.in]: campaignIds,
                },
              },
            ]
          : []),
      ],
    },

    include: [
      {
        model: Campaign,
        as: "campaign",
      },
      {
        model: Customer,
        as: "customer",
      },
    ],

    order: [["created_at", "DESC"]],
  });
}

  async findByWhatsappMessageId(messageId) {
    return await CampaignRecipient.findOne({
      where: {
        whatsappMessageId: messageId,
      },
      include: [
        {
          model: Campaign,
          as: "campaign",
        },
        {
          model: Customer,
          as: "customer",
        },
      ],
    });
  }
}

module.exports = new CampaignRecipientRepository();