const assert = require("node:assert/strict");
const test = require("node:test");
const AppError = require("../src/utils/appError");
const worker = require("../src/services/campaign.worker");
const recipientRepository = require("../src/repositories/campaignRecipient.repository");
const campaignRepository = require("../src/repositories/campaign.repository");
const whatsappRepository = require("../src/repositories/whatsapp.repository");
const mediaService = require("../src/services/media.service");
const storageService = require("../src/services/storage.service");
const metaService = require("../src/services/meta.whatsapp.service");

const campaign = { id: "campaign-a", companyId: "company-a", status: "RUNNING", totalRecipients: 2, variableMappings: { name: "firstName" }, template: { status: "APPROVED", metaTemplateName: "welcome", language: "en_US", variables: [{ key: "name", required: true }] } };
const connection = { status: "CONNECTED", accessTokenEncrypted: "encrypted" };

function stub(object, name, value, cleanup) {
  const original = object[name];
  object[name] = value;
  cleanup.push(() => { object[name] = original; });
}

test("worker processes recipients independently and persists message IDs", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));
  const recipients = [
    { id: "recipient-a", customer: { id: "customer-a", mobile: "1111111111", firstName: "Asha" } },
    { id: "recipient-b", customer: { id: "customer-b", mobile: "2222222222", firstName: "Ravi" } },
  ];
  const updates = [];
  stub(whatsappRepository, "findByCompanyId", async () => connection, cleanup);
  stub(campaignRepository, "findById", async () => campaign, cleanup);
  stub(recipientRepository, "claimPending", async () => recipients.splice(0, 2), cleanup);
  stub(recipientRepository, "update", async (id, companyId, data) => { updates.push({ id, companyId, data }); return {}; }, cleanup);
  stub(campaignRepository, "syncCounters", async () => ({ sentCount: 1 }), cleanup);
  stub(campaignRepository, "update", async () => ({}), cleanup);
  stub(metaService, "sendTemplateMessage", async (_connection, request) => { if (request.to === "1111111111") throw new Error("Meta rejected recipient"); return { messages: [{ id: "wamid-ravi" }] }; }, cleanup);

  await worker.process("company-a", "campaign-a");
  assert.ok(updates.some((item) => item.id === "recipient-a" && item.data.status === "FAILED"));
  assert.ok(updates.some((item) => item.id === "recipient-b" && item.data.whatsappMessageId === "wamid-ravi"));
  assert.ok(updates.every((item) => item.companyId === "company-a"));
});

test("worker rejects a disconnected tenant connection", async (t) => {
  const original = whatsappRepository.findByCompanyId;
  const originalCampaign = campaignRepository.findById;
  t.after(() => { whatsappRepository.findByCompanyId = original; campaignRepository.findById = originalCampaign; });
  campaignRepository.findById = async () => campaign;
  whatsappRepository.findByCompanyId = async () => ({ status: "DISCONNECTED" });
  await assert.rejects(worker.process("company-a", "campaign-a"), (error) => error instanceof AppError && error.statusCode === 409);
});

test("worker rejects media that is not owned by the tenant", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((restore) => restore()));
  stub(whatsappRepository, "findByCompanyId", async () => connection, cleanup);
  stub(campaignRepository, "findById", async () => ({ ...campaign, mediaId: "foreign-media" }), cleanup);
  stub(mediaService, "assertOwnedByCompany", async () => { throw new AppError("Media not found", 404); }, cleanup);
  await assert.rejects(worker.process("company-a", "campaign-a"), (error) => error.statusCode === 404);
});

test("worker rejects unresolved required variables", async () => {
  await assert.rejects(worker.processRecipient("company-a", connection, campaign, { id: "recipient-a", customer: { mobile: "1111111111", firstName: "" } }, null, null), (error) => error.statusCode === 422);
});
