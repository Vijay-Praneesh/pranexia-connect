const crypto = require("crypto");

const algorithm = "aes-256-gcm";

function getKey() {
  const value = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(value).digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptSecret(value) {
  const [iv, tag, encrypted] = value.split(".");
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

module.exports = { encryptSecret, decryptSecret };
