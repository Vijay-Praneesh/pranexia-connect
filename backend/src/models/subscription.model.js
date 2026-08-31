const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { PLAN_NAMES } = require("../config/plans.config");
const { SUBSCRIPTION_STATUSES } = require("../config/subscriptions.config");

const Subscription = sequelize.define(
  "Subscription",
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

    plan: {
      type: DataTypes.ENUM(...Object.values(PLAN_NAMES)),
      allowNull: false,
      defaultValue: PLAN_NAMES.STARTER,
    },

    status: {
      type: DataTypes.ENUM(...Object.values(SUBSCRIPTION_STATUSES)),
      allowNull: false,
      defaultValue: SUBSCRIPTION_STATUSES.ACTIVE,
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "start_date",
    },

    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "current_period_start",
    },

    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "current_period_end",
    },

    trialStart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "trial_start",
    },

    trialEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "trial_end",
    },

    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "cancelled_at",
    },

    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "cancel_at_period_end",
    },

    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "ended_at",
    },

    externalSubscriptionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "external_subscription_id",
    },

    pendingPlan: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "pending_plan",
    },

    pendingBillingInterval: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "pending_billing_interval",
    },

    pendingPlanEffectiveAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "pending_plan_effective_at",
    },
  },
  {
    tableName: "subscriptions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["company_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["current_period_end"],
      },
    ],
  }
);

module.exports = Subscription;
