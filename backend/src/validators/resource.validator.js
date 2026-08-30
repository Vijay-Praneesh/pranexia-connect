const Joi = require("joi");

const uuid = Joi.string().uuid();

const templateFields = {
  name: Joi.string().trim().max(150),
  metaTemplateName: Joi.string().trim().max(150).allow("", null),
  metaTemplateId: Joi.string().trim().max(255).allow("", null),
  category: Joi.string().valid("MARKETING", "UTILITY", "AUTHENTICATION"),
  language: Joi.string().trim().max(20),
  headerType: Joi.string().valid("NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"),
  headerText: Joi.string().allow("", null),
  body: Joi.string().allow(""),
  footer: Joi.string().max(255).allow("", null),
  buttons: Joi.array().max(10),
  status: Joi.string().valid("DRAFT", "PENDING", "APPROVED", "REJECTED"),
  rejectionReason: Joi.string().allow("", null),
  components: Joi.array().max(10),
};

const campaignFields = {
  name: Joi.string().trim().max(150),
  description: Joi.string().allow("", null),
  templateId: uuid,
  sendType: Joi.string().valid("NOW", "SCHEDULED"),
  scheduledAt: Joi.date().iso().allow(null),
  mediaId: uuid.allow(null),
  variableMappings: Joi.object().pattern(Joi.string().pattern(/^\d+$/), Joi.string().valid("firstName", "lastName", "mobile", "email", "country", "notes")).allow(null),
  status: Joi.string().valid(
    "DRAFT",
    "SCHEDULED",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ),
};

const check = (schema, data) =>
  schema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
  });

module.exports = {
  templateCreate: (data) =>
    check(
      Joi.object(templateFields).fork(["name", "category", "body"], (s) =>
        s.required(),
      ),
      data,
    ),

  templateUpdate: (data) => check(Joi.object(templateFields).min(1), data),

  campaignCreate: (data) =>
    check(
      Joi.object(campaignFields).fork(["name", "templateId"], (s) =>
        s.required(),
      ),
      data,
    ),

  campaignUpdate: (data) => check(Joi.object(campaignFields).min(1), data),

  recipientAssign: (data) =>
    check(
      Joi.object({
        campaignId: uuid.required(),
        customerIds: Joi.array()
          .items(uuid.required())
          .min(1)
          .max(1000)
          .required(),
      }),
      data,
    ),

  recipientUpdate: (data) =>
    check(
      Joi.object({
        status: Joi.string().valid(
          "PENDING",
          "QUEUED",
          "SENT",
          "DELIVERED",
          "READ",
          "FAILED",
        ),
        failureReason: Joi.string().allow("", null),
      }).min(1),
      data,
    ),
};
