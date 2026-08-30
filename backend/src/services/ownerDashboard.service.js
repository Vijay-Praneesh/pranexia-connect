const ownerDashboardRepository = require("../repositories/ownerDashboard.repository");

class OwnerDashboardService {
  async getOwnerDashboardSummary() {
    return await ownerDashboardRepository.getSummary();
  }
}

module.exports = new OwnerDashboardService();
