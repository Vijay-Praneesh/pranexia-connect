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
    filters = {},
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

    const safeSortBy = sortColumnMap[sortBy] || "created_at";

    const safeOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const { rows, count } = await Campaign.findAndCountAll({
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

  async claimForSending(id, companyId, startedAt) {
    const [updated] = await Campaign.update(
      { status: "RUNNING", startedAt, progress: 0 },
      {
        where: { id, companyId, status: { [Op.in]: ["DRAFT", "SCHEDULED"] } },
      },
    );
    return updated === 1;
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
    const totalRecipients = await CampaignRecipient.count({
      where: {
        campaignId: id,
      },
    });

    const sentCount = await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: {
          [Op.in]: ["SENT", "DELIVERED", "READ"],
        },
      },
    });

    const deliveredCount = await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: {
          [Op.in]: ["DELIVERED", "READ"],
        },
      },
    });

    const readCount = await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: "READ",
      },
    });

    const failedCount = await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: "FAILED",
      },
    });

    const pendingCount = await CampaignRecipient.count({
      where: {
        campaignId: id,
        status: {
          [Op.in]: ["PENDING", "QUEUED"],
        },
      },
    });

    const processedCount = sentCount + failedCount;
    const progress =
      totalRecipients > 0
        ? Math.min(100, Math.round((processedCount / totalRecipients) * 100))
        : 0;

    const campaign = await Campaign.findByPk(id);
    const updateData = {
      totalRecipients,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      progress,
    };

    if (
      campaign &&
      campaign.status === "RUNNING" &&
      pendingCount === 0 &&
      totalRecipients > 0
    ) {
      if (failedCount === totalRecipients) {
        updateData.status = "FAILED";
      } else {
        updateData.status = "COMPLETED";
      }
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    await Campaign.update(updateData, {
      where: {
        id,
      },
    });

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

  async search(companyId, keyword, filters = {}) {
    const where = {
      companyId,
    };

    // Search by campaign name or description
    if (keyword && keyword.trim() !== "") {
      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${keyword.trim()}%`,
          },
        },
        {
          description: {
            [Op.like]: `%${keyword.trim()}%`,
          },
        },
      ];
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Send type filter
    if (filters.sendType) {
      where.sendType = filters.sendType;
    }

    // Template filter
    if (filters.templateId) {
      where.templateId = filters.templateId;
    }

    return await Campaign.findAll({
      where,
      include: [
        {
          model: Template,
          as: "template",
        },
      ],
      order: [["created_at", "DESC"]],
    });
  }

  async findScheduledCampaigns() {
    const now = new Date();

    const campaigns = await Campaign.findAll({
      where: {
        status: "SCHEDULED",
        scheduledAt: { [Op.lte]: now },
      },
    });
    return campaigns;
  }

  async claimScheduledCancellation(id, companyId) {
    const [updated] = await Campaign.update(
      { status: "CANCELLED" },
      { where: { id, companyId, status: "SCHEDULED" } },
    );
    return updated === 1;
  }
}

module.exports = new CampaignRepository();
