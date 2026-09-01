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

  async findUserByGoogleId(googleId) {
    if (!googleId) return null;
    return await User.findOne({
      where: { googleId },
    });
  }

  async findUserWithCompanyByGoogleId(googleId) {
    if (!googleId) return null;
    return await User.findOne({
      where: { googleId },
      include: [
        {
          model: Company,
          as: "company",
        },
      ],
    });
  }

  async updateUser(user, updateData, transaction = null) {
    if (!user) return null;
    return await user.update(updateData, { transaction });
  }
}

module.exports = new AuthRepository();

