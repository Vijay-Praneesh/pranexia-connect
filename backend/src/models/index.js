const sequelize = require("../config/database");

const User = require("./user.model");
const Company = require("./company.model");
const Customer = require("./customer.model");
const Template = require("./template.model");
const Campaign = require("./campaign.model");
const CampaignRecipient = require("./campaignRecipient.model");
const WhatsAppConnection = require("./whatsappConnection.model");
const Media = require("./media.model");

// Company -> Users
Company.hasMany(User, {
  foreignKey: "companyId",
  as: "users",
});

User.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

Company.hasOne(WhatsAppConnection, {
  foreignKey: "companyId",
  as: "whatsappConnection",
});

WhatsAppConnection.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Company -> Customers
Company.hasMany(Customer, {
  foreignKey: "companyId",
  as: "customers",
});

Customer.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

Company.hasMany(Media, { foreignKey: "companyId", as: "media" });
Media.belongsTo(Company, { foreignKey: "companyId", as: "company" });

Company.hasMany(Template, {
  foreignKey: "companyId",
  as: "templates",
});

Template.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Company → Campaign
Company.hasMany(Campaign, {
  foreignKey: "companyId",
  as: "campaigns",
});

Campaign.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Template → Campaign
Template.hasMany(Campaign, {
  foreignKey: "templateId",
  as: "campaigns",
});

Campaign.belongsTo(Template, {
  foreignKey: "templateId",
  as: "template",
});

// Company → CampaignRecipient
Company.hasMany(CampaignRecipient, {
  foreignKey: "companyId",
  as: "campaignRecipients",
});

CampaignRecipient.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Campaign → CampaignRecipient
Campaign.hasMany(CampaignRecipient, {
  foreignKey: "campaignId",
  as: "recipients",
});

CampaignRecipient.belongsTo(Campaign, {
  foreignKey: "campaignId",
  as: "campaign",
});

// Customer → CampaignRecipient
Customer.hasMany(CampaignRecipient, {
  foreignKey: "customerId",
  as: "campaignRecipients",
});

CampaignRecipient.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

const db = {
  sequelize,
  User,
  Company,
  Customer,
  Template,
  Campaign,
  CampaignRecipient,
  WhatsAppConnection,
  Media,
};

module.exports = db;
