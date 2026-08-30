const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Template = sequelize.define(
  "Template",
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

    // Display name inside your application
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // Exact approved Meta template name
    // Example: hello_world
    metaTemplateName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "meta_template_name",
    },

    // Optional Meta Template ID
    metaTemplateId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "meta_template_id",
    },

    category: {
      type: DataTypes.ENUM(
        "MARKETING",
        "UTILITY",
        "AUTHENTICATION"
      ),
      allowNull: false,
    },

    language: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "en_US",
    },

    headerType: {
      type: DataTypes.ENUM(
        "NONE",
        "TEXT",
        "IMAGE",
        "VIDEO",
        "DOCUMENT"
      ),
      allowNull: false,
      defaultValue: "NONE",
      field: "header_type",
    },

    headerText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "header_text",
    },

    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    footer: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    buttons: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "DRAFT",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "PAUSED",
        "DISABLED",
        "UNKNOWN"
      ),
      allowNull: false,
      defaultValue: "DRAFT",
    },

    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "rejection_reason",
    },
    components: { type: DataTypes.JSON, allowNull: true },
    variables: { type: DataTypes.JSON, allowNull: true },
    metaStatus: { type: DataTypes.STRING(50), allowNull: true, field: "meta_status" },
    syncedAt: { type: DataTypes.DATE, allowNull: true, field: "synced_at" },
  },
  {
    tableName: "templates",
    timestamps: true,
    paranoid: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

module.exports = Template;
