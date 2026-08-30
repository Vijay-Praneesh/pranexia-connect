const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WhatsAppConnection = sequelize.define(
  "WhatsAppConnection",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "company_id",
    },
    businessPortfolioId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "business_portfolio_id",
    },
    wabaId: { type: DataTypes.STRING(100), allowNull: false, field: "waba_id" },
    phoneNumberId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "phone_number_id",
    },
    displayPhoneNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "display_phone_number",
    },
    verifiedName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "verified_name",
    },
    accessTokenEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "access_token_encrypted",
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "token_expires_at",
    },
    status: {
      type: DataTypes.ENUM("CONNECTING", "CONNECTED", "DISCONNECTED", "ERROR"),
      allowNull: false,
      defaultValue: "CONNECTING",
    },
    connectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "connected_at",
    },
    disconnectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "disconnected_at",
    },
    lastError: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "last_error",
    },
  },
  {
    tableName: "whatsapp_connections",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["company_id"] },
      { fields: ["waba_id"] },
      { fields: ["phone_number_id"] },
    ],
  },
);

module.exports = WhatsAppConnection;
