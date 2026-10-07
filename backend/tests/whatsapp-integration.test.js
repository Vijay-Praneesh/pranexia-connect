const assert = require("node:assert/strict");
const test = require("node:test");

process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY =
  process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY || "test_whatsapp_token_encryption_key_32_chars!";

const axios = require("axios");
const AppError = require("../src/utils/appError");
const env = require("../src/config/env");
const metaWhatsAppService = require("../src/services/meta.whatsapp.service");
const whatsappConnectionService = require("../src/services/whatsappConnection.service");
const whatsappService = require("../src/services/whatsapp.service");
const whatsappController = require("../src/controllers/whatsapp.controller");
const whatsappRepository = require("../src/repositories/whatsapp.repository");
const campaignWorker = require("../src/services/campaign.worker");
const campaignRepository = require("../src/repositories/campaign.repository");
const campaignRecipientRepository = require("../src/repositories/campaignRecipient.repository");
const { encryptSecret } = require("../src/utils/secret.crypto");


function stub(object, name, value, cleanup) {
  const original = object[name];
  object[name] = value;
  cleanup.push(() => {
    object[name] = original;
  });
}

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

// =============================================================================
// 1. WhatsApp Configuration Loading & Validation Tests
// =============================================================================
test("1. WhatsApp configuration loads expected environment keys", (t) => {
  assert.ok("WHATSAPP_API_VERSION" in env || "META_API_VERSION" in env);
  assert.equal(typeof env.validateEnvironment, "function");
});

test("2. Missing credentials in production throws validation error", (t) => {
  const originalEnv = process.env.NODE_ENV;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  t.after(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalToken !== undefined) {
      process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    }
  });
  process.env.NODE_ENV = "production";
  delete process.env.WHATSAPP_ACCESS_TOKEN;

  assert.throws(
    () => {
      env.validateEnvironment({ ...env, NODE_ENV: "production", WHATSAPP_ACCESS_TOKEN: undefined });
    },
    (err) => err.message.includes("Missing required production environment variable")
  );
});

test("3. Invalid credentials / token decrypt failure throws safe AppError", async (t) => {
  const badConnection = {
    accessTokenEncrypted: "corrupted.token.payload",
    phoneNumberId: "1234567890",
  };
  await assert.rejects(
    async () => {
      await metaWhatsAppService.sendTemplateMessage(badConnection, {
        to: "+15551234567",
        templateName: "hello_world",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 503);
      assert.ok(err.message.includes("unavailable"));
      return true;
    }
  );
});

test("4. Valid configuration produces correct Graph API URL and version", (t) => {
  assert.ok(metaWhatsAppService.graphBase.startsWith("https://graph.facebook.com/"));
  assert.ok(metaWhatsAppService.apiVersion.startsWith("v"));
});

// =============================================================================
// 2. Tenant Authorization & Isolation Tests
// =============================================================================
test("5. Tenant authorization derives company context strictly from req.user", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  let requestedCompanyId = null;
  stub(
    whatsappConnectionService,
    "getStatus",
    async (companyId) => {
      requestedCompanyId = companyId;
      return { status: "CONNECTED", connection: { phoneNumberId: "phone-1" } };
    },
    cleanup
  );

  const req = {
    user: { id: "user-1", companyId: "tenant-auth-123", role: "COMPANY_ADMIN" },
    body: { companyId: "injected-different-tenant" },
  };
  const res = mockResponse();

  await whatsappController.getStatus(req, res, () => {});

  assert.equal(requestedCompanyId, "tenant-auth-123");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("6. Unauthorized access / disconnected tenant prevents message sending", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  stub(whatsappRepository, "findByCompanyId", async () => null, cleanup);

  await assert.rejects(
    async () => {
      await whatsappConnectionService.sendTestMessage("tenant-disconnected", {
        to: "+15550001111",
        templateName: "hello_world",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.ok(err.message.includes("not connected"));
      return true;
    }
  );
});

// =============================================================================
// 3. Send Message Request Validation Tests
// =============================================================================
test("7. Send message request validates missing recipient", async (t) => {
  const validToken = encryptSecret("valid_meta_token");
  const connection = {
    phoneNumberId: "1234567890",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  await assert.rejects(
    async () => {
      await metaWhatsAppService.sendTemplateMessage(connection, {
        to: "",
        templateName: "hello_world",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("Recipient phone number"));
      return true;
    }
  );
});

test("8. Send message request validates missing template name", async (t) => {
  const validToken = encryptSecret("valid_meta_token");
  const connection = {
    phoneNumberId: "1234567890",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  await assert.rejects(
    async () => {
      await metaWhatsAppService.sendTemplateMessage(connection, {
        to: "+15551234567",
        templateName: "",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("Template name is required"));
      return true;
    }
  );
});

// =============================================================================
// 4. Meta API Success & Failure Responses (Mocked)
// =============================================================================
test("9. Meta API success response returns normalized message ID", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const validToken = encryptSecret("valid_meta_token_123");
  const connection = {
    phoneNumberId: "phone-987",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  stub(
    axios,
    "post",
    async (url, payload, options) => {
      assert.ok(url.includes("phone-987/messages"));
      assert.equal(options.headers.Authorization, "Bearer valid_meta_token_123");
      assert.equal(payload.messaging_product, "whatsapp");
      assert.equal(payload.template.name, "hello_world");
      return {
        data: {
          messaging_product: "whatsapp",
          contacts: [{ input: "+15551234567", wa_id: "15551234567" }],
          messages: [{ id: "wamid.HBgLMTU1NTEyMzQ1NjcVAgARGBI1" }],
        },
      };
    },
    cleanup
  );

  const result = await metaWhatsAppService.sendTemplateMessage(connection, {
    to: "+15551234567",
    templateName: "hello_world",
  });

  assert.equal(result.messages[0].id, "wamid.HBgLMTU1NTEyMzQ1NjcVAgARGBI1");
});

test("10. Meta API failure: Invalid recipient phone number maps to 400 error", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const validToken = encryptSecret("valid_meta_token");
  const connection = {
    phoneNumberId: "phone-1",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  stub(
    axios,
    "post",
    async () => {
      const error = new Error("Request failed with status code 400");
      error.response = {
        status: 400,
        data: {
          error: {
            message: "(#131030) Recipient phone number not in allowed list",
            type: "OAuthException",
            code: 131030,
            fbtrace_id: "trace123",
          },
        },
      };
      throw error;
    },
    cleanup
  );

  await assert.rejects(
    async () => {
      await metaWhatsAppService.sendTemplateMessage(connection, {
        to: "+15550000000",
        templateName: "hello_world",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("Invalid recipient") || err.message.includes("131030"));
      return true;
    }
  );
});

test("11. Meta API failure: Expired/Invalid token maps to 401 error", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const validToken = encryptSecret("expired_meta_token");
  const connection = {
    phoneNumberId: "phone-1",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  stub(
    axios,
    "post",
    async () => {
      const error = new Error("Request failed with status code 401");
      error.response = {
        status: 401,
        data: {
          error: {
            message: "Error validating access token: Session has expired",
            type: "OAuthException",
            code: 190,
            error_subcode: 463,
          },
        },
      };
      throw error;
    },
    cleanup
  );

  await assert.rejects(
    async () => {
      await metaWhatsAppService.sendTemplateMessage(connection, {
        to: "+15551234567",
        templateName: "hello_world",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 401);
      assert.ok(err.message.includes("Meta authentication failed"));
      return true;
    }
  );
});

test("12. Meta API failure: Rate limit maps to 429 error", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const validToken = encryptSecret("rate_limited_token");
  const connection = {
    phoneNumberId: "phone-1",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  stub(
    axios,
    "post",
    async () => {
      const error = new Error("Request failed with status code 429");
      error.response = {
        status: 429,
        data: {
          error: {
            message: "(#80007) There have been too many calls to this Phone-Number-ID",
            type: "OAuthException",
            code: 80007,
          },
        },
      };
      throw error;
    },
    cleanup
  );

  await assert.rejects(
    async () => {
      await metaWhatsAppService.sendTemplateMessage(connection, {
        to: "+15551234567",
        templateName: "hello_world",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 429);
      assert.ok(err.message.includes("rate limit"));
      return true;
    }
  );
});

test("13. Meta API failure: Template does not exist maps to 400 template error", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const validToken = encryptSecret("valid_meta_token");
  const connection = {
    phoneNumberId: "phone-1",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  stub(
    axios,
    "post",
    async () => {
      const error = new Error("Request failed with status code 400");
      error.response = {
        status: 400,
        data: {
          error: {
            message: "(#132001) Template does not exist in the specified language",
            type: "OAuthException",
            code: 132001,
          },
        },
      };
      throw error;
    },
    cleanup
  );

  await assert.rejects(
    async () => {
      await metaWhatsAppService.sendTemplateMessage(connection, {
        to: "+15551234567",
        templateName: "non_existent_template",
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes("template error") || err.message.includes("132001"));
      return true;
    }
  );
});

// =============================================================================
// 5. WhatsAppService & Controller Endpoints
// =============================================================================
test("14. WhatsAppController sendTestMessage executes successfully for connected tenant", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const validToken = encryptSecret("valid_meta_token");
  const connection = {
    phoneNumberId: "phone-test-123",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  stub(whatsappRepository, "findByCompanyId", async () => connection, cleanup);
  stub(
    metaWhatsAppService,
    "sendTemplateMessage",
    async () => ({
      messages: [{ id: "wamid.test_msg_999" }],
    }),
    cleanup
  );

  const req = {
    user: { companyId: "tenant-connected-1", role: "COMPANY_ADMIN" },
    body: { to: "+15559876543", templateName: "hello_world" },
  };
  const res = mockResponse();

  await whatsappController.sendTestMessage(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.messageId, "wamid.test_msg_999");
  assert.equal(res.body.data.status, "SENT");
});

// =============================================================================
// 6. Campaign Worker → WhatsApp Service Integration Test
// =============================================================================
test("15. Campaign Worker seamlessly integrates with WhatsApp Service and persists wamid", async (t) => {
  const cleanup = [];
  t.after(() => cleanup.forEach((r) => r()));

  const validToken = encryptSecret("valid_meta_token");
  const connection = {
    phoneNumberId: "phone-campaign-123",
    accessTokenEncrypted: validToken,
    status: "CONNECTED",
  };

  const campaign = {
    id: "campaign-test-1",
    companyId: "tenant-campaign-1",
    status: "RUNNING",
    totalRecipients: 1,
    variableMappings: { 1: "name" },
    template: {
      metaTemplateName: "customer_greeting",
      language: "en_US",
      variables: [{ key: "name", required: true }],
    },
  };

  const recipient = {
    id: "rec-test-1",
    campaignId: "campaign-test-1",
    companyId: "tenant-campaign-1",
    status: "PENDING",
    customer: {
      id: "cust-1",
      mobile: "+15554443333",
      name: "Priya",
    },
  };

  stub(whatsappRepository, "findByCompanyId", async () => connection, cleanup);
  stub(campaignRepository, "findById", async () => campaign, cleanup);
  const recipientsQueue = [recipient];
  stub(campaignRecipientRepository, "claimPending", async () => recipientsQueue.splice(0, 1), cleanup);
  
  const updatedRecords = [];
  stub(
    campaignRecipientRepository,
    "update",
    async (id, companyId, data) => {
      updatedRecords.push({ id, companyId, ...data });
      return [1];
    },
    cleanup
  );
  stub(campaignRepository, "syncCounters", async () => ({ sentCount: 1 }), cleanup);
  stub(campaignRepository, "update", async () => ({}), cleanup);

  let sentPayload = null;
  stub(
    metaWhatsAppService,
    "sendTemplateMessage",
    async (_conn, payload) => {
      sentPayload = payload;
      return { messages: [{ id: "wamid.campaign_msg_abc123" }] };
    },
    cleanup
  );

  await campaignWorker.process("tenant-campaign-1", "campaign-test-1");

  assert.equal(sentPayload.to, "+15554443333");
  assert.equal(sentPayload.templateName, "customer_greeting");
  assert.deepEqual(sentPayload.components, [
    { type: "body", parameters: [{ type: "text", text: "Priya" }] },
  ]);

  const sentRecord = updatedRecords.find((r) => r.status === "SENT");
  assert.ok(sentRecord);
  assert.equal(sentRecord.whatsappMessageId, "wamid.campaign_msg_abc123");
  assert.equal(sentRecord.companyId, "tenant-campaign-1");
});
