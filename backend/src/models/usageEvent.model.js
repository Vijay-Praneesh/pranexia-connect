const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UsageEvent = sequelize.define(
  "UsageEvent",
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
    eventType: {
      type: DataTypes.ENUM(
        "MESSAGE_SENT",
        "MESSAGE_DELIVERED",
        "MESSAGE_READ",
        "MESSAGE_FAILED",
        "CAMPAIGN_CREATED",
        "CAMPAIGN_COMPLETED",
        "MEDIA_UPLOADED",
        "TEMPLATE_USED"
      ),
      allowNull: false,
      field: "event_type",
    },
    eventKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "event_key",
    },
    period: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 1,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "usage_events",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ["company_id", "event_key"],
      },
      {
        fields: ["company_id", "period"],
      },
    ],
  }
);

module.exports = UsageEvent;
