const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");
const authRepository = require("../repositories/auth.repository");
const jwtHelper = require("../helpers/jwt.helper");
const AppError = require("../utils/appError");

class AuthService {
  async register(data) {
    const transaction = await sequelize.transaction();

    try {
      const {
        companyName,
        email,
        mobile,
        password,
        firstName,
        lastName,
      } = data;

      // Check existing company
      const existingCompany =
        await authRepository.findCompanyByEmail(email);

      if (existingCompany) {
        throw new AppError(
          "Company email already exists",
          409
        );
      }

      // Check existing user
      const existingUser =
        await authRepository.findUserByEmail(email);

      if (existingUser) {
        throw new AppError(
          "User email already exists",
          409
        );
      }

      // Check existing mobile
      const existingMobile =
        await authRepository.findUserByMobile(mobile);

      if (existingMobile) {
        throw new AppError(
          "Mobile number already exists",
          409
        );
      }

      // Create Company
      const company = await authRepository.createCompany(
        {
          companyName,
          email,
          mobile,
        },
        transaction
      );

      // Hash Password
      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      // Create Admin User
      const user = await authRepository.createUser(
        {
          firstName,
          lastName,
          email,
          mobile,
          password: hashedPassword,
          role: "COMPANY_ADMIN",
          companyId: company.id,
        },
        transaction
      );

      await transaction.commit();

      const companyData = company.toJSON();
      const userData = user.toJSON();

      // Never return password
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

  async login(data) {
    const { email, password } = data;

    // Find user with company
    const user =
      await authRepository.findUserWithCompanyByEmail(
        email
      );

    if (!user) {
      throw new AppError(
        "Invalid email or password",
        401
      );
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new AppError(
        "Invalid email or password",
        401
      );
    }

    // Check user status
    if (user.status !== "ACTIVE") {
      throw new AppError(
        "User account is inactive",
        403
      );
    }

    // Check company exists
    if (!user.company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    // Check company status
    if (user.company.status !== "ACTIVE") {
      throw new AppError(
        "Company account is inactive",
        403
      );
    }

    // Generate JWT Token
    const token = jwtHelper.generateToken({
      id: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    // Convert Sequelize instance to plain object
    const userData = user.toJSON();

    // Never return password
    delete userData.password;

    return {
      token,
      user: userData,
    };
  }

  async getCurrentUser(userId) {
    const user =
      await authRepository.findUserById(userId);

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    const userData = user.toJSON();

    // Never return password
    delete userData.password;

    return userData;
  }
}

module.exports = new AuthService();