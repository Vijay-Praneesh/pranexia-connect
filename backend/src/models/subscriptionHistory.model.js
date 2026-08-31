const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SubscriptionHistory = sequelize.define(
  "SubscriptionHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "company_id",
      references: {
        model: "companies",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "subscription_id",
      references: {
        model: "subscriptions",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    previousPlan: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "previous_plan",
    },

    newPlan: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "new_plan",
    },

    previousStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "previous_status",
    },

    newStatus: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "new_status",
    },

    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "SYSTEM",
    },

    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    performedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "performed_by",
    },
  },
  {
    tableName: "subscription_history",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        fields: ["company_id"],
      },
      {
        fields: ["subscription_id"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);

module.exports = SubscriptionHistory;
