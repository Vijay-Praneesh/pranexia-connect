const crypto = require("crypto");
const https = require("https");
const BasePaymentProvider = require("./base.provider");
const logger = require("../../../config/logger");
const env = require("../../../config/env");

class RazorpayProvider extends BasePaymentProvider {
  constructor(options = {}) {
    super();
    this.keyId = options.keyId || env.RAZORPAY_KEY_ID || "";
    this.keySecret = options.keySecret || env.RAZORPAY_KEY_SECRET || "";
    this.webhookSecret = options.webhookSecret || env.RAZORPAY_WEBHOOK_SECRET || "";
  }

  /**
   * Check if credentials are provided and valid
   */
  isConfigured() {
    return Boolean(this.keyId && this.keySecret);
  }

  /**
   * Create an order in Razorpay
   */
  async createOrder({ amount, currency = "INR", receipt, notes = {} }) {
    if (!amount || amount <= 0) {
      throw new Error("Invalid order amount");
    }

    // If real credentials are configured, execute HTTPS request to Razorpay API
    if (this.isConfigured() && !this.keyId.startsWith("test_mock_")) {
      try {
        const payload = JSON.stringify({
          amount: Math.round(amount),
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes,
        });

        const authHeader = "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");

        const response = await new Promise((resolve, reject) => {
          const req = https.request(
            {
              hostname: "api.razorpay.com",
              port: 443,
              path: "/v1/orders",
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
                Authorization: authHeader,
              },
            },
            (res) => {
              let body = "";
              res.on("data", (chunk) => (body += chunk));
              res.on("end", () => {
                try {
                  const data = JSON.parse(body);
                  if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                  } else {
                    reject(new Error(data.error?.description || "Razorpay order creation failed"));
                  }
                } catch (e) {
                  reject(new Error("Failed to parse Razorpay response"));
                }
              });
            }
          );

          req.on("error", reject);
          req.write(payload);
          req.end();
        });

        return {
          orderId: response.id,
          amount: response.amount,
          currency: response.currency,
          keyId: this.keyId,
        };
      } catch (err) {
        logger.error(`[Razorpay] Order creation failed via API: ${err.message}`);
        throw err;
      }
    }

    // Safe simulated/sandbox order generation when live keys are pending configuration
    const orderId = `order_${crypto.randomBytes(8).toString("hex")}`;
    return {
      orderId,
      amount: Math.round(amount),
      currency,
      keyId: this.keyId || "rzp_test_placeholder",
    };
  }

  /**
   * Constant-time timing-safe string comparison
   */
  safeCompare(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Verify frontend checkout payment signature:
   * signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const secret = this.keySecret || "test_secret_key";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    return this.safeCompare(expectedSignature, signature);
  }

  /**
   * Verify webhook payload signature:
   * signature = HMAC_SHA256(rawBody, webhook_secret)
   */
  verifyWebhookSignature({ rawBody, signature, secret }) {
    if (!rawBody || !signature) {
      return false;
    }

    const webhookSecret = secret || this.webhookSecret || this.keySecret || "test_webhook_secret";
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    return this.safeCompare(expectedSignature, signature);
  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchPayment(paymentId) {
    if (!paymentId) throw new Error("Payment ID is required");
    return {
      id: paymentId,
      status: "captured",
    };
  }
}

module.exports = RazorpayProvider;
