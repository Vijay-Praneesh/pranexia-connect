const { Op } = require("sequelize");
const { Company, User } = require("../models");
const usageRepository = require("./usage.repository");

class OwnerDashboardRepository {
  async getCompanyStatistics() {
    const [total, active, inactive] = await Promise.all([
      Company.count(),
      Company.count({ where: { status: "ACTIVE" } }),
      Company.count({ where: { status: "INACTIVE" } }),
    ]);

    return { total, active, inactive };
  }

  async getPlanStatistics() {
    const rows = await Company.findAll({
      attributes: ["plan", [Company.sequelize.fn("COUNT", Company.sequelize.col("id")), "count"]],
      group: ["plan"],
      raw: true,
    });

    const plans = {
      STARTER: 0,
      BUSINESS: 0,
      PROFESSIONAL: 0,
      ENTERPRISE: 0,
    };

    for (const row of rows) {
      if (Object.prototype.hasOwnProperty.call(plans, row.plan)) {
        plans[row.plan] = Number(row.count);
      }
    }

    return plans;
  }

  async getRecentCompanies(limit = 5) {
    return await Company.findAll({
      attributes: ["id", "companyName", "email", "mobile", "plan", "status", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit,
      raw: true,
    });
  }

  async getUserStatistics() {
    const userWhere = { role: { [Op.ne]: "SUPER_ADMIN" } };
    const companyInclude = {
      model: Company,
      as: "company",
      attributes: [],
      required: true,
    };

    const [totalUsers, activeUsers] = await Promise.all([
      User.count({ where: userWhere, include: [companyInclude], distinct: true }),
      User.count({ where: { ...userWhere, status: "ACTIVE" }, include: [companyInclude], distinct: true }),
    ]);

    return { totalUsers, activeUsers };
  }

  async getSummary() {
    const [companies, plans, recentCompanies, overview, usage] = await Promise.all([
      this.getCompanyStatistics(),
      this.getPlanStatistics(),
      this.getRecentCompanies(),
      this.getUserStatistics(),
      usageRepository.getPlatformAggregateUsage(),
    ]);

    return { companies, plans, recentCompanies, overview, usage };
  }
}

module.exports = new OwnerDashboardRepository();
