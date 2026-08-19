const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CampaignRecipient = sequelize.define(
  "CampaignRecipient",
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
    },

    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "campaign_id",
    },

    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "customer_id",
    },

    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "QUEUED",
        "SENT",
        "DELIVERED",
        "READ",
        "FAILED"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },

    whatsappMessageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "whatsapp_message_id",
    },

    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "failure_reason",
    },

    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "sent_at",
    },

    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "delivered_at",
    },

    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "read_at",
    },
  },
  {
    tableName: "campaign_recipients",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

module.exports = CampaignRecipient;