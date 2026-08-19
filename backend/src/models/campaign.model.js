const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Campaign = sequelize.define(
  "Campaign",
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

    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "template_id",
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    sendType: {
      type: DataTypes.ENUM("NOW", "SCHEDULED"),
      allowNull: false,
      defaultValue: "NOW",
      field: "send_type",
    },

    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "scheduled_at",
    },

    status: {
      type: DataTypes.ENUM(
        "DRAFT",
        "SCHEDULED",
        "RUNNING",
        "COMPLETED",
        "FAILED",
        "CANCELLED"
      ),
      allowNull: false,
      defaultValue: "DRAFT",
    },

    totalRecipients: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_recipients",
    },

    sentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sent_count",
    },

    deliveredCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "delivered_count",
    },

    readCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "read_count",
    },

failedCount: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
  field: "failed_count",
},

progress: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
},

startedAt: {
  type: DataTypes.DATE,
  allowNull: true,
  field: "started_at",
},

completedAt: {
  type: DataTypes.DATE,
  allowNull: true,
  field: "completed_at",
},
  },
  {
    tableName: "campaigns",
    timestamps: true,
    paranoid: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

module.exports = Campaign;