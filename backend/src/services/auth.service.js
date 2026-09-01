const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const sequelize = require("../config/database");
const authRepository = require("../repositories/auth.repository");
const subscriptionService = require("./subscription.service");
const jwtHelper = require("../helpers/jwt.helper");
const googleAuthHelper = require("../helpers/googleAuth.helper");
const { AuditLogger, AUDIT_EVENTS } = require("../utils/audit.logger");
const { PLAN_NAMES } = require("../config/plans.config");
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
          plan: "STARTER",
          status: "ACTIVE",
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
          authProvider: "LOCAL",
          emailVerified: false,
          role: "COMPANY_ADMIN",
          status: "ACTIVE",
          companyId: company.id,
        },
        transaction
      );

      await transaction.commit();

      // Initialize default subscription
      await subscriptionService.ensureCompanySubscription(company.id, company.plan);

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
      AuditLogger.logAuthEvent(AUDIT_EVENTS.LOCAL_LOGIN_FAILED, { email, reason: "user_not_found" });
      throw new AppError(
        "Invalid email or password",
        401
      );
    }

    if (!user.password) {
      AuditLogger.logAuthEvent(AUDIT_EVENTS.LOCAL_LOGIN_FAILED, { email, reason: "password_not_set_use_google" });
      throw new AppError(
        "This account uses Google Sign-In. Please sign in with Google or link a password in Account Settings.",
        401
      );
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      AuditLogger.logAuthEvent(AUDIT_EVENTS.LOCAL_LOGIN_FAILED, { email, reason: "invalid_password" });
      throw new AppError(
        "Invalid email or password",
        401
      );
    }

    // Check user status
    if (user.status !== "ACTIVE") {
      AuditLogger.logAuthEvent(AUDIT_EVENTS.LOCAL_LOGIN_FAILED, { email, userId: user.id, reason: "user_inactive" });
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
      AuditLogger.logAuthEvent(AUDIT_EVENTS.LOCAL_LOGIN_FAILED, { email, companyId: user.companyId, reason: "company_inactive" });
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

    AuditLogger.logAuthEvent(AUDIT_EVENTS.LOCAL_LOGIN_SUCCESS, {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: userData,
    };
  }

  /**
   * Google Sign-In / Login Flow
   * Verifies Google token server-side, matches user by googleId, or initiates onboarding/linking.
   */
  async googleLogin(data) {
    const rawCredential = data.credential || data.idToken || data.token;
    if (!rawCredential) {
      throw new AppError("Google credential is required", 400);
    }

    // 1. Verify Google credential cryptographically
    const googleProfile = await googleAuthHelper.verifyIdToken(rawCredential);
    const { sub, email, firstName, lastName, picture } = googleProfile;

    // 2. Check if user already exists by Google Subject ID
    const existingGoogleUser = await authRepository.findUserWithCompanyByGoogleId(sub);

    if (existingGoogleUser) {
      // Check user status
      if (existingGoogleUser.status !== "ACTIVE") {
        AuditLogger.logAuthEvent(AUDIT_EVENTS.GOOGLE_LOGIN_FAILED, {
          email,
          googleSubject: sub,
          userId: existingGoogleUser.id,
          reason: "user_inactive",
        });
        throw new AppError("User account is inactive", 403);
      }

      // Check company
      if (!existingGoogleUser.company) {
        throw new AppError("Company not found", 404);
      }

      // Check company status
      if (existingGoogleUser.company.status !== "ACTIVE") {
        AuditLogger.logAuthEvent(AUDIT_EVENTS.GOOGLE_LOGIN_FAILED, {
          email,
          googleSubject: sub,
          companyId: existingGoogleUser.companyId,
          reason: "company_inactive",
        });
        throw new AppError("Company account is inactive", 403);
      }

      // Issue application JWT
      const token = jwtHelper.generateToken({
        id: existingGoogleUser.id,
        companyId: existingGoogleUser.companyId,
        role: existingGoogleUser.role,
      });

      const userData = existingGoogleUser.toJSON();
      delete userData.password;

      AuditLogger.logAuthEvent(AUDIT_EVENTS.GOOGLE_LOGIN_SUCCESS, {
        userId: existingGoogleUser.id,
        companyId: existingGoogleUser.companyId,
        email,
        googleSubject: sub,
        role: existingGoogleUser.role,
      });

      return {
        token,
        user: userData,
      };
    }

    // 3. User with this Google Subject was NOT found.
    // Check if an account with this email already exists with password auth (prevent account takeover)
    const existingEmailUser = await authRepository.findUserByEmail(email);

    if (existingEmailUser) {
      AuditLogger.logAuthEvent(AUDIT_EVENTS.GOOGLE_LOGIN_FAILED, {
        email,
        googleSubject: sub,
        userId: existingEmailUser.id,
        reason: "account_exists_unlinked",
      });

      const err = new AppError(
        "An account with this email already exists. Please log in with your email and password to link your Google account in Account Settings.",
        409
      );
      err.code = "LINKING_REQUIRED";
      throw err;
    }

    // 4. No account found -> Initiate controlled onboarding flow
    // Sign temporary onboarding token valid for 15 minutes
    const onboardingToken = jwt.sign(
      {
        sub,
        email,
        firstName,
        lastName,
        picture: picture || null,
        purpose: "google_onboarding",
      },
      env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return {
      onboardingRequired: true,
      onboardingToken,
      profile: {
        email,
        firstName,
        lastName,
        picture: picture || null,
      },
    };
  }

  /**
   * Complete onboarding for a new verified Google user
   */
  async googleOnboard(data) {
    const { onboardingToken, credential, companyName, mobile, plan = PLAN_NAMES.STARTER } = data;

    let profile;

    if (onboardingToken) {
      try {
        const decoded = jwt.verify(onboardingToken, env.JWT_SECRET);
        if (decoded.purpose !== "google_onboarding" || !decoded.sub || !decoded.email) {
          throw new Error("Invalid token payload");
        }
        profile = decoded;
      } catch (err) {
        throw new AppError("Invalid or expired onboarding session. Please sign in with Google again.", 401);
      }
    } else if (credential) {
      profile = await googleAuthHelper.verifyIdToken(credential);
    } else {
      throw new AppError("Onboarding token or Google credential is required", 400);
    }

    const { sub, email, firstName, lastName } = profile;

    // Validate plan
    if (plan && !PLAN_NAMES[plan]) {
      throw new AppError(`Invalid plan: ${plan}`, 400);
    }

    // Check company email uniqueness
    const existingCompany = await authRepository.findCompanyByEmail(email);
    if (existingCompany) {
      throw new AppError("Company email already exists", 409);
    }

    // Check user email uniqueness
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new AppError("User email already exists", 409);
    }

    // Check mobile uniqueness
    const existingMobile = await authRepository.findUserByMobile(mobile);
    if (existingMobile) {
      throw new AppError("Mobile number already exists", 409);
    }

    // Check Google ID uniqueness
    const existingGoogle = await authRepository.findUserByGoogleId(sub);
    if (existingGoogle) {
      throw new AppError("Google account already registered", 409);
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Create Company
      const company = await authRepository.createCompany(
        {
          companyName,
          email,
          mobile,
          plan: plan || PLAN_NAMES.STARTER,
          status: "ACTIVE",
        },
        transaction
      );

      // 2. Create COMPANY_ADMIN User (Never SUPER_ADMIN)
      const user = await authRepository.createUser(
        {
          firstName: firstName || "User",
          lastName: lastName || null,
          email,
          mobile,
          password: null, // Google auth does not require local password
          authProvider: "GOOGLE",
          googleId: sub,
          emailVerified: true,
          role: "COMPANY_ADMIN",
          status: "ACTIVE",
          companyId: company.id,
        },
        transaction
      );

      await transaction.commit();

      // 3. Initialize Subscription & Plan
      await subscriptionService.ensureCompanySubscription(company.id, company.plan);

      // 4. Generate Application JWT Token
      const token = jwtHelper.generateToken({
        id: user.id,
        companyId: user.companyId,
        role: user.role,
      });

      const companyData = company.toJSON();
      const userData = user.toJSON();
      delete userData.password;

      AuditLogger.logAuthEvent(AUDIT_EVENTS.GOOGLE_ONBOARDING_COMPLETED, {
        userId: user.id,
        companyId: company.id,
        email,
        googleSubject: sub,
        role: user.role,
      });

      return {
        token,
        user: userData,
        company: companyData,
      };
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * Link Google account to existing authenticated user
   */
  async linkGoogleAccount(userId, data) {
    const rawCredential = data.credential || data.idToken || data.token;
    if (!rawCredential) {
      throw new AppError("Google credential is required", 400);
    }

    // 1. Verify Google credential
    const googleProfile = await googleAuthHelper.verifyIdToken(rawCredential);
    const { sub, email } = googleProfile;

    // 2. Get current authenticated user
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // 3. Check if this Google subject is already linked to ANOTHER user
    const existingUser = await authRepository.findUserByGoogleId(sub);
    if (existingUser && existingUser.id !== userId) {
      throw new AppError("This Google account is already linked to another user", 409);
    }

    // 4. Email matching check
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      throw new AppError(
        `Google email (${email}) does not match your account email (${user.email})`,
        400
      );
    }

    // 5. Update user record
    await authRepository.updateUser(user, {
      googleId: sub,
      emailVerified: true,
    });

    AuditLogger.logAuthEvent(AUDIT_EVENTS.GOOGLE_ACCOUNT_LINKED, {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      googleSubject: sub,
    });

    const updatedUser = user.toJSON();
    delete updatedUser.password;

    return updatedUser;
  }

  /**
   * Unlink Google account from existing authenticated user
   */
  async unlinkGoogleAccount(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.googleId) {
      throw new AppError("Google account is not linked", 400);
    }

    if (!user.password) {
      throw new AppError(
        "Cannot disconnect Google without setting a password first",
        400
      );
    }

    await authRepository.updateUser(user, {
      googleId: null,
      authProvider: "LOCAL",
    });

    const updatedUser = user.toJSON();
    delete updatedUser.password;

    return updatedUser;
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