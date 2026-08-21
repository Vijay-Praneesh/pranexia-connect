const assert = require("node:assert/strict");
const crypto = require("crypto");
const test = require("node:test");
const webhookController = require("../src/controllers/webhook.controller");
const webhookService = require("../src/services/webhook.service");
const validator = require("../src/validators/resource.validator");
const campaignRepository = require("../src/repositories/campaign.repository");
const { Campaign } = require("../src/models");

function response() {
  return { statusCode: null, sent: null, status(code) { this.statusCode = code; return this; }, sendStatus(code) { this.statusCode = code; return this; }, json(body) { this.sent = body; return this; } };
}

test("webhook rejects missing and invalid signatures and accepts a valid signature", async (t) => {
  const original = webhookService.processWebhook;
  const oldSecret = process.env.WHATSAPP_APP_SECRET;
  t.after(() => { webhookService.processWebhook = original; process.env.WHATSAPP_APP_SECRET = oldSecret; });
  process.env.WHATSAPP_APP_SECRET = "test-secret";
  const rawBody = Buffer.from('{"entry":[]}');
  const missing = response();
  await webhookController.receiveWebhook({ get: () => undefined, rawBody, body: {} }, missing);
  assert.equal(missing.statusCode, 401);
  const invalid = response();
  await webhookController.receiveWebhook({ get: () => "sha256=bad", rawBody, body: {} }, invalid);
  assert.equal(invalid.statusCode, 401);
  let processed = false;
  webhookService.processWebhook = async () => { processed = true; };
  const signature = `sha256=${crypto.createHmac("sha256", "test-secret").update(rawBody).digest("hex")}`;
  const valid = response();
  await webhookController.receiveWebhook({ get: () => signature, rawBody, body: {} }, valid);
  assert.equal(valid.statusCode, 200);
  assert.equal(processed, true);
});

test("resource validators reject malformed campaign, template, and recipient payloads", () => {
  assert.ok(validator.templateCreate({ name: "x", category: "INVALID", body: "body" }).error);
  assert.ok(validator.campaignCreate({ name: "x", templateId: "not-a-uuid" }).error);
  assert.ok(validator.recipientAssign({ campaignId: "not-a-uuid", customerIds: ["bad"] }).error);
});

test("campaign send claim is an atomic conditional update", async (t) => {
  const original = Campaign.update;
  t.after(() => { Campaign.update = original; });
  let options;
  Campaign.update = async (_values, supplied) => { options = supplied; return [1]; };
  assert.equal(await campaignRepository.claimForSending("campaign-id", "company-id", new Date()), true);
  assert.deepEqual(options.where.id, "campaign-id");
  const operator = Object.getOwnPropertySymbols(options.where.status)[0];
  assert.deepEqual(options.where.status[operator], ["DRAFT", "SCHEDULED"]);
  Campaign.update = async () => [0];
  assert.equal(await campaignRepository.claimForSending("campaign-id", "company-id", new Date()), false);
});
