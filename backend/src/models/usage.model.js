const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Usage = sequelize.define(
  "Usage",
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
    period: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "period_start",
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "period_end",
    },
    messagesSent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "messages_sent",
    },
    messagesDelivered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "messages_delivered",
    },
    messagesRead: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "messages_read",
    },
    messagesFailed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "messages_failed",
    },
    campaignsCreated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "campaigns_created",
    },
    campaignsCompleted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "campaigns_completed",
    },
    mediaUploadedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "media_uploaded_count",
    },
    mediaUploadedBytes: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: "media_uploaded_bytes",
    },
    templatesUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "templates_used",
    },
  },
  {
    tableName: "usages",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["company_id", "period"],
      },
      {
        fields: ["period"],
      },
    ],
  }
);

module.exports = Usage;
