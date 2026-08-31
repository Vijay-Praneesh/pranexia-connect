const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  PAYMENT_PROVIDERS,
  BILLING_INTERVALS,
} = require("../config/pricing.config");
const { PLAN_NAMES } = require("../config/plans.config");

const Payment = sequelize.define(
  "Payment",
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
      allowNull: true,
      field: "subscription_id",
      references: {
        model: "subscriptions",
        key: "id",
      },
      onDelete: "SET NULL",
    },

    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: PAYMENT_PROVIDERS.RAZORPAY,
    },

    providerOrderId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "provider_order_id",
    },

    providerPaymentId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "provider_payment_id",
    },

    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: "Amount in minor currency units (paise for INR)",
    },

    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "INR",
    },

    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: PAYMENT_STATUSES.CREATED,
    },

    paymentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: PAYMENT_TYPES.INITIAL_SUBSCRIPTION,
      field: "payment_type",
    },

    plan: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: PLAN_NAMES.STARTER,
    },

    billingInterval: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: BILLING_INTERVALS.MONTHLY,
      field: "billing_interval",
    },

    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "paid_at",
    },

    failureReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "failure_reason",
    },
  },
  {
    tableName: "payments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["company_id"],
      },
      {
        fields: ["subscription_id"],
      },
      {
        fields: ["provider_order_id"],
      },
      {
        fields: ["provider_payment_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);

module.exports = Payment;
