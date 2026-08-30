const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },

    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },

    // Required only for LOCAL authentication.
    // Google users do not need a local password.
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Authentication method used by this account.
    authProvider: {
      type: DataTypes.ENUM("LOCAL", "GOOGLE"),
      allowNull: false,
      defaultValue: "LOCAL",
      field: "auth_provider",
    },

    // Google account identifier.
    // NULL for normal email/password users.
    googleId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: "google_id",
    },

    // Whether the user's email has been verified.
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "email_verified",
    },

    role: {
      type: DataTypes.ENUM(
        "SUPER_ADMIN",
        "COMPANY_ADMIN",
        "MANAGER",
        "EMPLOYEE"
      ),
      defaultValue: "EMPLOYEE",
    },

    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      defaultValue: "ACTIVE",
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

module.exports = User;