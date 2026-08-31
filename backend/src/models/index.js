const sequelize = require("../config/database");

const User = require("./user.model");
const Company = require("./company.model");
const Customer = require("./customer.model");
const Template = require("./template.model");
const Campaign = require("./campaign.model");
const CampaignRecipient = require("./campaignRecipient.model");
const WhatsAppConnection = require("./whatsappConnection.model");
const Media = require("./media.model");
const Usage = require("./usage.model");
const UsageEvent = require("./usageEvent.model");
const MetaUsage = require("./metaUsage.model");
const Subscription = require("./subscription.model");
const SubscriptionHistory = require("./subscriptionHistory.model");
const Payment = require("./payment.model");
const PaymentWebhookEvent = require("./paymentWebhookEvent.model");

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

Media.hasMany(Campaign, { foreignKey: "mediaId", as: "campaigns" });
Campaign.belongsTo(Media, { foreignKey: "mediaId", as: "media" });

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

// Company → Usages
Company.hasMany(Usage, {
  foreignKey: "companyId",
  as: "usages",
});

Usage.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Company → UsageEvents
Company.hasMany(UsageEvent, {
  foreignKey: "companyId",
  as: "usageEvents",
});

UsageEvent.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Company → MetaUsages
Company.hasMany(MetaUsage, {
  foreignKey: "companyId",
  as: "metaUsages",
});

MetaUsage.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Company → Subscriptions
Company.hasMany(Subscription, {
  foreignKey: "companyId",
  as: "subscriptions",
});

Subscription.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Company → SubscriptionHistories
Company.hasMany(SubscriptionHistory, {
  foreignKey: "companyId",
  as: "subscriptionHistories",
});

SubscriptionHistory.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Subscription → SubscriptionHistories
Subscription.hasMany(SubscriptionHistory, {
  foreignKey: "subscriptionId",
  as: "histories",
});

SubscriptionHistory.belongsTo(Subscription, {
  foreignKey: "subscriptionId",
  as: "subscription",
});

// Company → Payments
Company.hasMany(Payment, {
  foreignKey: "companyId",
  as: "payments",
});

Payment.belongsTo(Company, {
  foreignKey: "companyId",
  as: "company",
});

// Subscription → Payments
Subscription.hasMany(Payment, {
  foreignKey: "subscriptionId",
  as: "payments",
});

Payment.belongsTo(Subscription, {
  foreignKey: "subscriptionId",
  as: "subscription",
});

// Payment → PaymentWebhookEvents
Payment.hasMany(PaymentWebhookEvent, {
  foreignKey: "paymentId",
  as: "webhookEvents",
});

PaymentWebhookEvent.belongsTo(Payment, {
  foreignKey: "paymentId",
  as: "payment",
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
  Usage,
  UsageEvent,
  MetaUsage,
  Subscription,
  SubscriptionHistory,
  Payment,
  PaymentWebhookEvent,
};

module.exports = db;
