const Joi = require("joi");

class AuthValidator {
  register(data) {
    const schema = Joi.object({
      companyName: Joi.string().trim().min(3).max(150).required(),

      firstName: Joi.string().trim().min(2).max(100).required(),

      lastName: Joi.string().trim().min(2).max(100).required(),

      email: Joi.string().email().required(),

      mobile: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
          "string.pattern.base": "Mobile number must be 10 digits",
        }),

      password: Joi.string().min(8).max(30).required(),
    });

    return schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
    });
  }

  login(data) {
    const schema = Joi.object({
      email: Joi.string().email().required(),

      password: Joi.string().required(),
    });

    return schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
    });
  }

  clientCreate(data) {
    const schema = Joi.object({
      companyName: Joi.string()
        .trim()
        .min(3)
        .max(150)
        .required(),

      firstName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required(),

      lastName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required(),

      email: Joi.string()
        .email()
        .required(),

      mobile: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
          "string.pattern.base":
            "Mobile number must be 10 digits",
        }),

      password: Joi.string()
        .min(8)
        .max(30)
        .required(),

      plan: Joi.string()
        .valid(
          "STARTER",
          "BUSINESS",
          "PROFESSIONAL",
          "ENTERPRISE"
        )
        .default("STARTER"),
    });

    return schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
    });
  }

  googleAuth(data) {
    const schema = Joi.object({
      credential: Joi.string().trim().optional(),
      idToken: Joi.string().trim().optional(),
      token: Joi.string().trim().optional(),
    }).or("credential", "idToken", "token");

    return schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
    });
  }

  googleOnboard(data) {
    const schema = Joi.object({
      onboardingToken: Joi.string().trim().optional(),
      credential: Joi.string().trim().optional(),
      companyName: Joi.string().trim().min(3).max(150).required(),
      mobile: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
          "string.pattern.base": "Mobile number must be 10 digits",
        }),
      plan: Joi.string()
        .valid("STARTER", "BUSINESS", "PROFESSIONAL", "ENTERPRISE")
        .default("STARTER"),
    }).or("onboardingToken", "credential");

    return schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
    });
  }

  googleLink(data) {
    const schema = Joi.object({
      credential: Joi.string().trim().optional(),
      idToken: Joi.string().trim().optional(),
      token: Joi.string().trim().optional(),
    }).or("credential", "idToken", "token");

    return schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
    });
  }
}

module.exports = new AuthValidator();