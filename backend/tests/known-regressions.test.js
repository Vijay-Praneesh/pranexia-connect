const assert = require("node:assert/strict");
const test = require("node:test");

const { Campaign, Template } = require("../src/models");
const campaignRepository = require("../src/repositories/campaign.repository");
const templateRepository = require("../src/repositories/template.repository");
const campaignService = require("../src/services/campaign.service");
const campaignRecipientService = require("../src/services/campaignRecipient.service");
const campaignRecipientRepository = require("../src/repositories/campaignRecipient.repository");
const customerRepository = require("../src/repositories/customer.repository");
const errorHandler = require("../src/middlewares/error.middleware");

test("template listing maps createdAt to the created_at database column", async (t) => {
  const original = Template.findAndCountAll;
  t.after(() => { Template.findAndCountAll = original; });
  let query;
  Template.findAndCountAll = async (options) => { query = options; return { rows: [], count: 0 }; };

  await templateRepository.findAll("company-a", 1, 10, "createdAt", "DESC", {});

  assert.deepEqual(query.order, [["created_at", "DESC"]]);
  assert.deepEqual(query.where, { companyId: "company-a" });
});

test("campaign updates persist the requested status and return the refetched record", async (t) => {
  const originalFindById = campaignRepository.findById;
  const originalUpdate = campaignRepository.update;
  t.after(() => {
    campaignRepository.findById = originalFindById;
    campaignRepository.update = originalUpdate;
  });
  const existing = { id: "campaign-a", companyId: "company-a", status: "DRAFT", sendType: "NOW" };
  let persisted;
  campaignRepository.findById = async () => existing;
  campaignRepository.update = async (id, companyId, data) => {
    persisted = { id, companyId, ...data };
    return { ...existing, ...data };
  };

  const result = await campaignService.updateCampaign("company-a", "campaign-a", { status: "CANCELLED" });

  assert.equal(persisted.status, "CANCELLED");
  assert.equal(result.status, "CANCELLED");
});

test("campaign template reassignment is scoped to the authenticated company", async (t) => {
  const originalFindCampaign = campaignRepository.findById;
  const originalFindTemplate = templateRepository.findById;
  const originalUpdate = campaignRepository.update;
  t.after(() => {
    campaignRepository.findById = originalFindCampaign;
    templateRepository.findById = originalFindTemplate;
    campaignRepository.update = originalUpdate;
  });
  campaignRepository.findById = async () => ({ id: "campaign-a", companyId: "company-a" });
  templateRepository.findById = async () => null;
  campaignRepository.update = async () => { throw new Error("must not update"); };

  await assert.rejects(
    campaignService.updateCampaign("company-a", "campaign-a", { templateId: "foreign-template" }),
    (error) => error.statusCode === 404 && error.message === "Template not found"
  );
});

test("campaign listing omits undefined filters and uses safe default sorting", async (t) => {
  const original = Campaign.findAndCountAll;
  t.after(() => { Campaign.findAndCountAll = original; });
  let query;
  Campaign.findAndCountAll = async (options) => { query = options; return { rows: [], count: 0 }; };

  await campaignRepository.findAll("company-a", 1, 10, undefined, undefined, {
    status: undefined,
    sendType: undefined,
    templateId: undefined,
  });

  assert.deepEqual(query.where, { companyId: "company-a" });
  assert.equal(Object.values(query.where).includes(undefined), false);
  assert.deepEqual(query.order, [["created_at", "DESC"]]);
});

test("production 500 responses do not expose internal error details", (t) => {
  const previousEnvironment = process.env.NODE_ENV;
  t.after(() => { process.env.NODE_ENV = previousEnvironment; });
  process.env.NODE_ENV = "production";
  let response;
  const res = {
    status(code) { response = { code }; return this; },
    json(body) { response.body = body; return this; },
  };

  errorHandler(new Error("database driver error"), {}, res, () => {});

  assert.equal(response.code, 500);
  assert.equal(response.body.message, "Internal Server Error");
  assert.equal(JSON.stringify(response.body).includes("database driver error"), false);
});

test("recipient assignment ignores duplicate and already-assigned customers", async (t) => {
  const originals = {
    campaign: campaignRepository.findById,
    assigned: campaignRecipientRepository.findAssignedCustomerIds,
    create: campaignRecipientRepository.bulkCreate,
    sync: campaignRepository.syncCounters,
    customer: customerRepository.findById,
  };
  t.after(() => {
    campaignRepository.findById = originals.campaign;
    campaignRecipientRepository.findAssignedCustomerIds = originals.assigned;
    campaignRecipientRepository.bulkCreate = originals.create;
    campaignRepository.syncCounters = originals.sync;
    customerRepository.findById = originals.customer;
  });
  campaignRepository.findById = async () => ({ id: "campaign-a" });
  campaignRecipientRepository.findAssignedCustomerIds = async () => ["customer-a"];
  customerRepository.findById = async (_companyId, id) => ({ id });
  let created;
  campaignRecipientRepository.bulkCreate = async (rows) => { created = rows; };
  campaignRepository.syncCounters = async () => ({ totalRecipients: 2 });

  const result = await campaignRecipientService.assignRecipients(
    "company-a",
    "campaign-a",
    ["customer-a", "customer-a", "customer-b"]
  );

  assert.deepEqual(created.map((row) => row.customerId), ["customer-b"]);
  assert.equal(result.totalRecipients, 2);
  assert.match(result.message, /^1 recipient/);
});
