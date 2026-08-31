require("dotenv").config();

const env = {
  PORT: process.env.PORT || 5000,

  NODE_ENV: process.env.NODE_ENV,

  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  FRONTEND_ORIGINS: process.env.FRONTEND_ORIGINS,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  META_APP_ID: process.env.META_APP_ID,
  META_APP_SECRET: process.env.META_APP_SECRET,
  META_API_VERSION: process.env.META_API_VERSION,
  WHATSAPP_TOKEN_ENCRYPTION_KEY: process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY,
  MEDIA_STORAGE_PROVIDER: process.env.MEDIA_STORAGE_PROVIDER || "local",
  MEDIA_LOCAL_STORAGE_PATH: process.env.MEDIA_LOCAL_STORAGE_PATH,
  MEDIA_MAX_IMAGE_SIZE: process.env.MEDIA_MAX_IMAGE_SIZE,
  MEDIA_MAX_VIDEO_SIZE: process.env.MEDIA_MAX_VIDEO_SIZE,
  MEDIA_MAX_DOCUMENT_SIZE: process.env.MEDIA_MAX_DOCUMENT_SIZE,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "razorpay",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || process.env.PAYMENT_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_KEY_SECRET || "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || "",
};

const validateEnvironment = () => {
  if (env.NODE_ENV !== "production") return;

  const required = [
    "DB_HOST",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "JWT_SECRET",
    "FRONTEND_ORIGINS",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_API_VERSION",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ACCESS_TOKEN",
    "META_APP_ID",
    "META_APP_SECRET",
    "META_API_VERSION",
    "WHATSAPP_TOKEN_ENCRYPTION_KEY",
  ];
  const missing = required.filter((name) => !env[name]);

  if (missing.length) {
    throw new Error(
      `Missing required production environment variable(s): ${missing.join(", ")}`,
    );
  }
};

module.exports = { ...env, validateEnvironment };
