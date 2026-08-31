const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Company = sequelize.define(
  "Company",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    companyName: {
      type: DataTypes.STRING(150),
      allowNull: false,
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
      allowNull: false,
    },

    plan: {
      type: DataTypes.ENUM(
        "STARTER",
        "BUSINESS",
        "PROFESSIONAL",
        "ENTERPRISE"
      ),
      defaultValue: "STARTER",
    },

    status: {
      type: DataTypes.ENUM(
        "ACTIVE",
        "INACTIVE"
      ),
      defaultValue: "ACTIVE",
    },

    customLimits: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "custom_limits",
    },
  },
  {
    tableName: "companies",
    timestamps: true,
  }
);

module.exports = Company;