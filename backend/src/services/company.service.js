const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");
const companyRepository = require("../repositories/company.repository");
const authRepository = require("../repositories/auth.repository");
const AppError = require("../utils/appError");

class CompanyService {
  // =====================================
  // Get all client companies
  // =====================================
  async getAllCompanies(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;

    const result = await companyRepository.findAll({
      page,
      limit,
      search: query.search || "",
      status: query.status,
      plan: query.plan,
    });

    return {
      companies: result.rows,
      pagination: {
        page,
        limit,
        totalRecords: result.count,
        totalPages: Math.ceil(result.count / limit),
      },
    };
  }

  // =====================================
  // Get company by ID
  // =====================================
  async getCompanyById(id) {
    const company = await companyRepository.findById(id);

    if (!company) {
      throw new AppError("Company not found", 404);
    }

    return company;
  }

  // =====================================
  // Create client company + admin user
  // =====================================
  async createCompany(data) {
    const transaction = await sequelize.transaction();

    try {
      const {
        companyName,
        email,
        mobile,
        password,
        firstName,
        lastName,
        plan = "STARTER",
      } = data;

      // Check company email
      const existingCompany =
        await companyRepository.findByEmail(email);

      if (existingCompany) {
        throw new AppError(
          "Company email already exists",
          409
        );
      }

      // Check user email
      const existingUser =
        await authRepository.findUserByEmail(email);

      if (existingUser) {
        throw new AppError(
          "User email already exists",
          409
        );
      }

      // Check mobile
      const existingMobile =
        await authRepository.findUserByMobile(mobile);

      if (existingMobile) {
        throw new AppError(
          "Mobile number already exists",
          409
        );
      }

      // Create company
      const company = await companyRepository.create(
        {
          companyName,
          email,
          mobile,
          plan,
          status: "ACTIVE",
        },
        transaction
      );

      // Hash client admin password
      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      // Create client admin
      const user = await authRepository.createUser(
        {
          firstName,
          lastName,
          email,
          mobile,
          password: hashedPassword,
          authProvider: "LOCAL",
          emailVerified: false,
          role: "COMPANY_ADMIN",
          status: "ACTIVE",
          companyId: company.id,
        },
        transaction
      );

      await transaction.commit();

      const companyData = company.toJSON();
      const userData = user.toJSON();

      delete userData.password;

      return {
        company: companyData,
        user: userData,
      };
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }

      throw error;
    }
  }

  // =====================================
  // Update company
  // =====================================
  async updateCompany(id, data) {
    const company = await companyRepository.findById(id);

    if (!company) {
      throw new AppError("Company not found", 404);
    }

    return await companyRepository.update(id, data);
  }

  // =====================================
  // Activate / Deactivate company
  // =====================================
  async updateCompanyStatus(id, status) {
    const company = await companyRepository.findById(id);

    if (!company) {
      throw new AppError("Company not found", 404);
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      throw new AppError(
        "Invalid company status",
        400
      );
    }

    return await companyRepository.updateStatus(
      id,
      status
    );
  }
}

module.exports = new CompanyService();