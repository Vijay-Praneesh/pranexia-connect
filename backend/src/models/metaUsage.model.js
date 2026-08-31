const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MetaUsage = sequelize.define(
  "MetaUsage",
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
    wabaId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "waba_id",
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
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
    marketingConversations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "marketing_conversations",
    },
    utilityConversations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "utility_conversations",
    },
    authenticationConversations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "authentication_conversations",
    },
    serviceConversations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "service_conversations",
    },
    totalConversations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_conversations",
    },
    status: {
      type: DataTypes.ENUM("NOT_SYNCED", "SYNCED", "UNAVAILABLE", "ERROR"),
      allowNull: false,
      defaultValue: "NOT_SYNCED",
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "META_GRAPH_API",
    },
    syncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "synced_at",
    },
    rawMetadata: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "raw_metadata",
    },
  },
  {
    tableName: "meta_usages",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["company_id", "waba_id", "period"],
      },
      {
        fields: ["company_id", "period"],
      },
    ],
  }
);

module.exports = MetaUsage;
