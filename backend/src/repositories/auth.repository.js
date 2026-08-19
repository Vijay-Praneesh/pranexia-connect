const { Company, User } = require("../models");

class AuthRepository {
  async createCompany(companyData, transaction) {
    return await Company.create(companyData, { transaction });
  }

  async createUser(userData, transaction) {
    return await User.create(userData, { transaction });
  }

  async findCompanyByEmail(email) {
    return await Company.findOne({
      where: { email },
    });
  }

  async findUserByEmail(email) {
    return await User.findOne({
      where: { email },
    });
  }

  async findUserByMobile(mobile) {
    return await User.findOne({
      where: { mobile },
    });
  }

  async findUserWithCompanyByEmail(email) {
    return await User.findOne({
      where: { email },
      include: [
        {
          model: Company,
          as: "company",
        },
      ],
    });
  }

  async findUserById(id) {
  return await User.findByPk(id, {
    include: [
      {
        model: Company,
        as: "company",
      },
    ],
  });
}
}


module.exports = new AuthRepository();
