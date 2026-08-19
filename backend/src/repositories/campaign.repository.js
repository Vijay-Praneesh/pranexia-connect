const { Op } = require("sequelize");
const { Campaign, Template, CampaignRecipient } = require("../models");

class CampaignRepository {
  async create(data) {
    return await Campaign.create(data);
  }

async findById(companyId, id) {
  return await Campaign.findOne({
    where: {
      id,
      companyId,
    },
    include: [
      {
        model: Template,
        as: "template",
      },
    ],
  });
}

  async findByName(companyId, name) {
    return await Campaign.findOne({
      where: {
        companyId,
        name,
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
  const where = {
    companyId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.sendType) {
    where.sendType = filters.sendType;
  }

  if (filters.templateId) {
    where.templateId = filters.templateId;
  }

  const offset = (page - 1) * limit;

  const sortColumnMap = {
    createdAt: "created_at",
    updatedAt: "updated_at",
    created_at: "created_at",
    updated_at: "updated_at",
    name: "name",
    status: "status",
    sendType: "send_type",
    send_type: "send_type",
    scheduledAt: "scheduled_at",
    scheduled_at: "scheduled_at",
  };

  const safeSortBy =
    sortColumnMap[sortBy] || "created_at";

  const safeOrder =
    order.toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  const { rows, count } =
    await Campaign.findAndCountAll({
      where,
      include: [
        {
          model: Template,
          as: "template",
        },
      ],
      limit,
      offset,
      order: [[safeSortBy, safeOrder]],
    });

  return {
    campaigns: rows,
    pagination: {
      page,
      limit,
      totalRecords: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

  async update(id, companyId, data) {
    await Campaign.update(data, {
      where: {
        id,
        companyId,
      },
    });

    return await this.findById(companyId, id);
  }

  async updateCounters(id, data) {
  await Campaign.update(data, {
    where: {
      id,
    },
  });

    return await Campaign.findByPk(id);
  }

async syncCounters(id) {
  const totalRecipients =
    await CampaignRecipient.count({
      where: {
        campaignId: id,
      },
    });

  const sentCount =
    await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: {
          [Op.in]: [
            "SENT",
            "DELIVERED",
            "READ",
          ],
        },
      },
    });

  const deliveredCount =
    await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: {
          [Op.in]: [
            "DELIVERED",
            "READ",
          ],
        },
      },
    });

  const readCount =
    await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: "READ",
      },
    });

  const failedCount =
    await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: "FAILED",
      },
    });

  await Campaign.update(
    {
      totalRecipients,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
    },
    {
      where: {
        id,
      },
    }
  );

  return await Campaign.findByPk(id);
}

  async delete(id, companyId) {
    return await Campaign.destroy({
      where: {
        id,
        companyId,
      },
    });
  }

  async search(companyId, keyword) {
    return await Campaign.findAll({
      where: {
        companyId,
        [Op.or]: [
          {
            name: {
              [Op.like]: `%${keyword}%`,
            },
          },
          {
            description: {
              [Op.like]: `%${keyword}%`,
            },
          },
        ],
      },
      order: [["created_at", "DESC"]],
    });
  }

async findScheduledCampaigns() {
  const now = new Date();

  console.log("==================================");
  console.log("Current Server Time (UTC):", now.toISOString());
  console.log("==================================");

  const campaigns = await Campaign.findAll({
    where: {
      status: "SCHEDULED",
    },
  });
  console.log("Raw Scheduled Campaigns:", campaigns.map(c => ({
  id: c.id,
  status: c.status,
  scheduledAt: c.scheduledAt
  })));

  console.log("Total Scheduled Campaigns:", campaigns.length);

  const dueCampaigns = [];

  for (const campaign of campaigns) {
    console.log("----------------------------------");
    console.log("Campaign :", campaign.name);
    console.log("Status   :", campaign.status);
    console.log("Scheduled:", campaign.scheduledAt);
    console.log("Due?     :", campaign.scheduledAt <= now);
    console.log("----------------------------------");

    if (campaign.scheduledAt <= now) {
      dueCampaigns.push(campaign);
    }
  }

  console.log("Due Campaigns:", dueCampaigns.length);

  return dueCampaigns;
}
}

module.exports = new CampaignRepository();