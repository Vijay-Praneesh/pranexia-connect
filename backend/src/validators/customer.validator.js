const Joi = require("joi");

class CustomerValidation {
  create(data) {
    const schema = Joi.object({
      firstName: Joi.string().trim().required().messages({
        "any.required": "First name is required",
      }),

      lastName: Joi.string().trim().allow("", null),

      mobile: Joi.string().trim().required().messages({
        "any.required": "Mobile number is required",
      }),

      email: Joi.string().email().allow("", null),

      country: Joi.string().default("India"),

      tags: Joi.array().items(Joi.string()).optional(),

      notes: Joi.string().allow("", null),

      status: Joi.string()
        .valid("ACTIVE", "BLOCKED")
        .default("ACTIVE"),
    });

    return schema.validate(data);
  }
}

module.exports = new CustomerValidation();