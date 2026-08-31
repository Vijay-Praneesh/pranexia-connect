const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaymentWebhookEvent = sequelize.define(
  "PaymentWebhookEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    providerEventId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "provider_event_id",
    },

    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "event_type",
    },

    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "PROCESSED",
    },

    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "company_id",
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "payment_id",
    },
  },
  {
    tableName: "payment_webhook_events",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ["provider_event_id"],
      },
      {
        fields: ["company_id"],
      },
      {
        fields: ["payment_id"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);

module.exports = PaymentWebhookEvent;
