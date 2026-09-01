const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const env = require("../src/config/env");
const googleAuthHelper = require("../src/helpers/googleAuth.helper");
const authService = require("../src/services/auth.service");
const authController = require("../src/controllers/auth.controller");
const authRepository = require("../src/repositories/auth.repository");
const subscriptionService = require("../src/services/subscription.service");
const { User, Company } = require("../src/models");
const AppError = require("../src/utils/appError");

function mockResponse() {
  return {
    statusCode: 200,
    sent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.sent = body;
      return this;
    },
  };
}

test("Google Auth - Unit & Integration Test Suite", async (t) => {
  const originalClientId = env.GOOGLE_CLIENT_ID;
  const originalJwtSecret = env.JWT_SECRET;
  const originalVerifyIdToken = googleAuthHelper.verifyIdToken;

  env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  env.JWT_SECRET = "test-jwt-secret-key-12345678901234567890";

  t.after(() => {
    env.GOOGLE_CLIENT_ID = originalClientId;
    env.JWT_SECRET = originalJwtSecret;
    googleAuthHelper.verifyIdToken = originalVerifyIdToken;
  });

  // 1. Missing or invalid Google credential
  await t.test("1. Rejects missing or empty Google credential", async () => {
    await assert.rejects(
      async () => {
        await authService.googleLogin({});
      },
      (err) => err instanceof AppError && err.statusCode === 400
    );
  });

  // 2. Invalid Google credential verification failure
  await t.test("2. Rejects invalid Google token signature or payload", async () => {
    googleAuthHelper.verifyIdToken = async () => {
      throw new AppError("Invalid or expired Google credential", 401);
    };

    await assert.rejects(
      async () => {
        await authService.googleLogin({ credential: "invalid.jwt.token" });
      },
      (err) => err.statusCode === 401
    );
  });

  // 3. Expired Google credential
  await t.test("3. Rejects expired Google credential", async () => {
    googleAuthHelper.verifyIdToken = async () => {
      throw new AppError("Google credential has expired", 401);
    };

    await assert.rejects(
      async () => {
        await authService.googleLogin({ credential: "expired.jwt.token" });
      },
      (err) => err.statusCode === 401
    );
  });

  // 4. Token audience mismatch
  await t.test("4. Rejects Google credential with mismatched audience / client ID", async () => {
    googleAuthHelper.verifyIdToken = async () => {
      throw new AppError("Google credential audience mismatch", 401);
    };

    await assert.rejects(
      async () => {
        await authService.googleLogin({ credential: "wrong-audience.token" });
      },
      (err) => err.statusCode === 401
    );
  });

  // 5. Invalid token issuer
  await t.test("5. Rejects Google credential with invalid issuer", async () => {
    googleAuthHelper.verifyIdToken = async () => {
      throw new AppError("Invalid Google token issuer", 401);
    };

    await assert.rejects(
      async () => {
        await authService.googleLogin({ credential: "wrong-issuer.token" });
      },
      (err) => err.statusCode === 401
    );
  });

  // 6. Unverified email in Google payload
  await t.test("6. Rejects Google credential when email is not verified", async () => {
    googleAuthHelper.verifyIdToken = async () => {
      throw new AppError("Google account email is not verified", 400);
    };

    await assert.rejects(
      async () => {
        await authService.googleLogin({ credential: "unverified-email.token" });
      },
      (err) => err.statusCode === 400
    );
  });

  // 7. Missing server Google Client ID configuration
  await t.test("7. Gracefully handles unconfigured GOOGLE_CLIENT_ID on server", async () => {
    const prevId = env.GOOGLE_CLIENT_ID;
    env.GOOGLE_CLIENT_ID = "";

    googleAuthHelper.verifyIdToken = originalVerifyIdToken;
    googleAuthHelper.resetOAuth2Client();

    await assert.rejects(
      async () => {
        await googleAuthHelper.verifyIdToken("some.token");
      },
      (err) => err.statusCode === 500 && err.message.includes("not configured")
    );

    env.GOOGLE_CLIENT_ID = prevId;
  });

  // 8. Existing linked Google user login succeeds and issues Seyyon JWT
  await t.test("8. Existing linked Google user authenticates and receives Seyyon JWT", async () => {
    const mockUser = {
      id: "usr-google-1",
      companyId: "comp-google-1",
      email: "googleuser@example.com",
      googleId: "google-sub-12345",
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
      company: {
        id: "comp-google-1",
        companyName: "Acme Corp",
        status: "ACTIVE",
      },
      toJSON() {
        return {
          id: this.id,
          companyId: this.companyId,
          email: this.email,
          googleId: this.googleId,
          role: this.role,
          status: this.status,
          company: this.company,
        };
      },
    };

    googleAuthHelper.verifyIdToken = async () => ({
      sub: "google-sub-12345",
      email: "googleuser@example.com",
      emailVerified: true,
      firstName: "Google",
      lastName: "User",
    });

    const origFindUser = authRepository.findUserWithCompanyByGoogleId;
    authRepository.findUserWithCompanyByGoogleId = async (sub) => {
      if (sub === "google-sub-12345") return mockUser;
      return null;
    };

    const result = await authService.googleLogin({ credential: "valid.google.token" });

    assert.ok(result.token, "Must return Seyyon JWT");
    assert.equal(result.user.email, "googleuser@example.com");
    assert.equal(result.user.role, "COMPANY_ADMIN");

    // Verify claims in Seyyon JWT
    const decoded = jwt.verify(result.token, env.JWT_SECRET);
    assert.equal(decoded.id, "usr-google-1");
    assert.equal(decoded.companyId, "comp-google-1");
    assert.equal(decoded.role, "COMPANY_ADMIN");

    authRepository.findUserWithCompanyByGoogleId = origFindUser;
  });

  // 9. Inactive user account is rejected
  await t.test("9. Inactive user account is rejected with 403", async () => {
    const inactiveUser = {
      id: "usr-inactive",
      companyId: "comp-1",
      email: "inactive@example.com",
      googleId: "google-sub-inactive",
      role: "COMPANY_ADMIN",
      status: "INACTIVE",
      company: { id: "comp-1", status: "ACTIVE" },
      toJSON() { return this; },
    };

    googleAuthHelper.verifyIdToken = async () => ({
      sub: "google-sub-inactive",
      email: "inactive@example.com",
      emailVerified: true,
      firstName: "Inactive",
      lastName: "User",
    });

    const origFind = authRepository.findUserWithCompanyByGoogleId;
    authRepository.findUserWithCompanyByGoogleId = async () => inactiveUser;

    await assert.rejects(
      async () => {
        await authService.googleLogin({ credential: "valid.token" });
      },
      (err) => err.statusCode === 403 && err.message.includes("inactive")
    );

    authRepository.findUserWithCompanyByGoogleId = origFind;
  });

  // 10. Inactive company account is rejected
  await t.test("10. Inactive company account is rejected with 403", async () => {
    const userWithInactiveCompany = {
      id: "usr-active",
      companyId: "comp-inactive",
      email: "user@inactivecompany.com",
      googleId: "google-sub-inactive-comp",
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
      company: { id: "comp-inactive", status: "INACTIVE" },
      toJSON() { return this; },
    };

    googleAuthHelper.verifyIdToken = async () => ({
      sub: "google-sub-inactive-comp",
      email: "user@inactivecompany.com",
      emailVerified: true,
      firstName: "User",
      lastName: "Company",
    });

    const origFind = authRepository.findUserWithCompanyByGoogleId;
    authRepository.findUserWithCompanyByGoogleId = async () => userWithInactiveCompany;

    await assert.rejects(
      async () => {
        await authService.googleLogin({ credential: "valid.token" });
      },
      (err) => err.statusCode === 403 && err.message.includes("Company account is inactive")
    );

    authRepository.findUserWithCompanyByGoogleId = origFind;
  });

  // 11. Existing password user without Google link requires linking (prevents account takeover)
  await t.test("11. Existing password user without Google link returns LINKING_REQUIRED", async () => {
    const existingPasswordUser = {
      id: "usr-password-only",
      email: "passworduser@example.com",
      googleId: null,
      password: "hashed_password",
    };

    googleAuthHelper.verifyIdToken = async () => ({
      sub: "new-google-sub-999",
      email: "passworduser@example.com",
      emailVerified: true,
      firstName: "Password",
      lastName: "User",
    });

    const origFindByGoogle = authRepository.findUserWithCompanyByGoogleId;
    const origFindByEmail = authRepository.findUserByEmail;

    authRepository.findUserWithCompanyByGoogleId = async () => null;
    authRepository.findUserByEmail = async (email) => {
      if (email === "passworduser@example.com") return existingPasswordUser;
      return null;
    };

    await assert.rejects(
      async () => {
        await authService.googleLogin({ credential: "valid.token" });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, "LINKING_REQUIRED");
        return true;
      }
    );

    authRepository.findUserWithCompanyByGoogleId = origFindByGoogle;
    authRepository.findUserByEmail = origFindByEmail;
  });

  // 12. New Google user receives onboardingRequired and signed onboarding token
  await t.test("12. New Google user returns onboardingRequired and temporary token", async () => {
    googleAuthHelper.verifyIdToken = async () => ({
      sub: "brand-new-google-sub",
      email: "newclient@example.com",
      emailVerified: true,
      firstName: "New",
      lastName: "Client",
      picture: "https://lh3.googleusercontent.com/avatar.jpg",
    });

    const origFindByGoogle = authRepository.findUserWithCompanyByGoogleId;
    const origFindByEmail = authRepository.findUserByEmail;

    authRepository.findUserWithCompanyByGoogleId = async () => null;
    authRepository.findUserByEmail = async () => null;

    const result = await authService.googleLogin({ credential: "valid.token" });

    assert.equal(result.onboardingRequired, true);
    assert.ok(result.onboardingToken, "Must issue signed onboarding token");
    assert.equal(result.profile.email, "newclient@example.com");
    assert.equal(result.profile.firstName, "New");
    assert.equal(result.profile.lastName, "Client");

    // Verify onboarding token claims
    const decoded = jwt.verify(result.onboardingToken, env.JWT_SECRET);
    assert.equal(decoded.sub, "brand-new-google-sub");
    assert.equal(decoded.email, "newclient@example.com");
    assert.equal(decoded.purpose, "google_onboarding");

    authRepository.findUserWithCompanyByGoogleId = origFindByGoogle;
    authRepository.findUserByEmail = origFindByEmail;
  });

  // 13. Google onboarding creates Company, COMPANY_ADMIN user, initializes subscription, and issues Seyyon JWT
  await t.test("13. Google onboarding creates Company, COMPANY_ADMIN user, initializes subscription", async () => {
    const onboardingToken = jwt.sign(
      {
        sub: "onboard-sub-777",
        email: "onboarded@example.com",
        firstName: "Alice",
        lastName: "Smith",
        purpose: "google_onboarding",
      },
      env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    let createdCompany = null;
    let createdUser = null;
    let ensuredSubCompanyId = null;

    const origCreateComp = authRepository.createCompany;
    const origCreateUser = authRepository.createUser;
    const origFindCompEmail = authRepository.findCompanyByEmail;
    const origFindUserEmail = authRepository.findUserByEmail;
    const origFindUserMobile = authRepository.findUserByMobile;
    const origFindUserGoogle = authRepository.findUserByGoogleId;
    const origEnsureSub = subscriptionService.ensureCompanySubscription;

    authRepository.findCompanyByEmail = async () => null;
    authRepository.findUserByEmail = async () => null;
    authRepository.findUserByMobile = async () => null;
    authRepository.findUserByGoogleId = async () => null;

    authRepository.createCompany = async (data) => {
      createdCompany = {
        id: "comp-onboard-1",
        ...data,
        toJSON() { return { ...this }; },
      };
      return createdCompany;
    };

    authRepository.createUser = async (data) => {
      createdUser = {
        id: "usr-onboard-1",
        ...data,
        toJSON() { return { ...this }; },
      };
      return createdUser;
    };

    subscriptionService.ensureCompanySubscription = async (compId, plan) => {
      ensuredSubCompanyId = compId;
      return { id: "sub-1", companyId: compId, plan, status: "ACTIVE" };
    };

    const result = await authService.googleOnboard({
      onboardingToken,
      companyName: "Alice Tech Solutions",
      mobile: "9876543210",
      plan: "BUSINESS",
    });

    assert.ok(result.token, "Must return application session JWT");
    assert.equal(result.company.companyName, "Alice Tech Solutions");
    assert.equal(result.user.role, "COMPANY_ADMIN", "Must assign COMPANY_ADMIN role");
    assert.notEqual(result.user.role, "SUPER_ADMIN", "Must NEVER assign SUPER_ADMIN");
    assert.equal(result.user.authProvider, "GOOGLE");
    assert.equal(result.user.googleId, "onboard-sub-777");
    assert.equal(result.user.emailVerified, true);
    assert.equal(createdUser.password, null, "Password must be null for Google users");
    assert.equal(ensuredSubCompanyId, "comp-onboard-1", "Must initialize company subscription");

    // Clean up mocks
    authRepository.createCompany = origCreateComp;
    authRepository.createUser = origCreateUser;
    authRepository.findCompanyByEmail = origFindCompEmail;
    authRepository.findUserByEmail = origFindUserEmail;
    authRepository.findUserByMobile = origFindUserMobile;
    authRepository.findUserByGoogleId = origFindUserGoogle;
    subscriptionService.ensureCompanySubscription = origEnsureSub;
  });

  // 14. Google onboarding rejects duplicate mobile number
  await t.test("14. Google onboarding rejects duplicate mobile number", async () => {
    const onboardingToken = jwt.sign(
      {
        sub: "sub-dup-mob",
        email: "dup@example.com",
        firstName: "Test",
        lastName: "Dup",
        purpose: "google_onboarding",
      },
      env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const origFindUserMobile = authRepository.findUserByMobile;
    const origFindCompanyByEmail = authRepository.findCompanyByEmail;
    const origFindUserByEmail = authRepository.findUserByEmail;

    authRepository.findCompanyByEmail = async () => null;
    authRepository.findUserByEmail = async () => null;
    authRepository.findUserByMobile = async () => ({ id: "existing-mob-user" });

    await assert.rejects(
      async () => {
        await authService.googleOnboard({
          onboardingToken,
          companyName: "Dup Mob Company",
          mobile: "9876543210",
        });
      },
      (err) => err.statusCode === 409 && err.message.includes("Mobile")
    );

    authRepository.findUserByMobile = origFindUserMobile;
    authRepository.findCompanyByEmail = origFindCompanyByEmail;
    authRepository.findUserByEmail = origFindUserByEmail;
  });

  // 15. Authenticated account linking connects Google account safely
  await t.test("15. Authenticated user links Google account safely", async () => {
    let updatedFields = null;
    const mockUser = {
      id: "usr-link-target",
      companyId: "comp-1",
      email: "linktarget@example.com",
      googleId: null,
      update(fields) {
        updatedFields = fields;
        Object.assign(this, fields);
        return this;
      },
      toJSON() {
        return { ...this };
      },
    };

    googleAuthHelper.verifyIdToken = async () => ({
      sub: "google-sub-to-link",
      email: "linktarget@example.com",
      emailVerified: true,
      firstName: "Link",
      lastName: "Target",
    });

    const origFindUserById = authRepository.findUserById;
    const origFindUserByGoogleId = authRepository.findUserByGoogleId;

    authRepository.findUserById = async (id) => (id === "usr-link-target" ? mockUser : null);
    authRepository.findUserByGoogleId = async () => null;

    const result = await authService.linkGoogleAccount("usr-link-target", {
      credential: "valid.google.token",
    });

    assert.equal(updatedFields.googleId, "google-sub-to-link");
    assert.equal(updatedFields.emailVerified, true);
    assert.equal(result.email, "linktarget@example.com");

    authRepository.findUserById = origFindUserById;
    authRepository.findUserByGoogleId = origFindUserByGoogleId;
  });

  // 16. Account linking rejects duplicate Google subject already linked to another user
  await t.test("16. Account linking rejects Google identity already linked to another account", async () => {
    const mockUser = {
      id: "usr-victim",
      email: "victim@example.com",
      googleId: null,
    };

    const otherUser = {
      id: "usr-other-owner",
      email: "other@example.com",
      googleId: "google-sub-already-linked",
    };

    googleAuthHelper.verifyIdToken = async () => ({
      sub: "google-sub-already-linked",
      email: "victim@example.com",
      emailVerified: true,
    });

    const origFindUserById = authRepository.findUserById;
    const origFindUserByGoogleId = authRepository.findUserByGoogleId;

    authRepository.findUserById = async () => mockUser;
    authRepository.findUserByGoogleId = async (sub) => {
      if (sub === "google-sub-already-linked") return otherUser;
      return null;
    };

    await assert.rejects(
      async () => {
        await authService.linkGoogleAccount("usr-victim", { credential: "token" });
      },
      (err) => err.statusCode === 409 && err.message.includes("already linked")
    );

    authRepository.findUserById = origFindUserById;
    authRepository.findUserByGoogleId = origFindUserByGoogleId;
  });

  // 17. Account linking enforces email match policy
  await t.test("17. Account linking rejects Google account with mismatched email", async () => {
    const mockUser = {
      id: "usr-match-test",
      email: "localuser@example.com",
      googleId: null,
    };

    googleAuthHelper.verifyIdToken = async () => ({
      sub: "google-sub-diff-email",
      email: "differentemail@example.com",
      emailVerified: true,
    });

    const origFindUserById = authRepository.findUserById;
    const origFindUserByGoogleId = authRepository.findUserByGoogleId;

    authRepository.findUserById = async () => mockUser;
    authRepository.findUserByGoogleId = async () => null;

    await assert.rejects(
      async () => {
        await authService.linkGoogleAccount("usr-match-test", { credential: "token" });
      },
      (err) => err.statusCode === 400 && err.message.includes("does not match")
    );

    authRepository.findUserById = origFindUserById;
    authRepository.findUserByGoogleId = origFindUserByGoogleId;
  });

  // 18. Google unlinking is allowed for password users
  await t.test("18. Account unlinking succeeds for user with password set", async () => {
    let unlinked = false;
    const userWithPassword = {
      id: "usr-pwd-and-google",
      email: "user@example.com",
      googleId: "google-sub-123",
      password: "$2a$10$hashedpasswordhere",
      update(fields) {
        if (fields.googleId === null) unlinked = true;
        return this;
      },
      toJSON() { return this; },
    };

    const origFind = authRepository.findUserById;
    authRepository.findUserById = async () => userWithPassword;

    const result = await authService.unlinkGoogleAccount("usr-pwd-and-google");
    assert.equal(unlinked, true);

    authRepository.findUserById = origFind;
  });

  // 19. Google unlinking is blocked for passwordless Google users
  await t.test("19. Account unlinking is rejected if user has no password set", async () => {
    const googleOnlyUser = {
      id: "usr-google-only",
      email: "googleonly@example.com",
      googleId: "google-sub-123",
      password: null,
    };

    const origFind = authRepository.findUserById;
    authRepository.findUserById = async () => googleOnlyUser;

    await assert.rejects(
      async () => {
        await authService.unlinkGoogleAccount("usr-google-only");
      },
      (err) => err.statusCode === 400 && err.message.includes("Cannot disconnect Google without setting a password")
    );

    authRepository.findUserById = origFind;
  });

  // 20. Controller response structure for Google login
  await t.test("20. AuthController.googleAuth returns standard ApiResponse format", async () => {
    googleAuthHelper.verifyIdToken = async () => ({
      sub: "ctrl-sub-123",
      email: "ctrluser@example.com",
      emailVerified: true,
      firstName: "Ctrl",
      lastName: "User",
    });

    const origFindByGoogle = authRepository.findUserWithCompanyByGoogleId;
    authRepository.findUserWithCompanyByGoogleId = async () => ({
      id: "usr-ctrl",
      companyId: "comp-ctrl",
      email: "ctrluser@example.com",
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
      company: { id: "comp-ctrl", status: "ACTIVE" },
      toJSON() { return this; },
    });

    const res = mockResponse();
    await authController.googleAuth({ body: { credential: "sample.google.token" } }, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.sent.success, true);
    assert.ok(res.sent.data.token);
    assert.equal(res.sent.data.user.email, "ctrluser@example.com");

    authRepository.findUserWithCompanyByGoogleId = origFindByGoogle;
  });

  // 21. Controller validation rejects empty body
  await t.test("21. AuthController.googleAuth rejects empty body with 400", async () => {
    const res = mockResponse();
    await authController.googleAuth({ body: {} }, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.sent.success, false);
  });
});
