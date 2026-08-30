const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Media = sequelize.define("Media", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  companyId: { type: DataTypes.UUID, allowNull: false, field: "company_id" },
  originalName: { type: DataTypes.STRING(255), allowNull: false, field: "original_name" },
  storedName: { type: DataTypes.STRING(255), allowNull: false, field: "stored_name" },
  mimeType: { type: DataTypes.STRING(150), allowNull: false, field: "mime_type" },
  mediaType: { type: DataTypes.ENUM("IMAGE", "VIDEO", "DOCUMENT"), allowNull: false, field: "media_type" },
  size: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  storageKey: { type: DataTypes.STRING(500), allowNull: false, unique: true, field: "storage_key" },
  status: { type: DataTypes.ENUM("READY", "FAILED", "DELETED"), allowNull: false, defaultValue: "READY" },
}, { tableName: "media", timestamps: true, paranoid: true, createdAt: "created_at", updatedAt: "updated_at", deletedAt: "deleted_at" });

module.exports = Media;
