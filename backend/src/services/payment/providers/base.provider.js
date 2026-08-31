/**
 * Base payment provider abstract interface.
 * All payment gateways (Razorpay, Stripe, Mock) must implement this interface.
 */
class BasePaymentProvider {
  /**
   * Create an order in the payment gateway
   * @param {Object} params - { amount, currency, receipt, notes }
   * @returns {Promise<{ orderId, amount, currency, keyId }>}
   */
  async createOrder(params) {
    throw new Error("Method createOrder() must be implemented");
  }

  /**
   * Verify frontend checkout payment signature
   * @param {Object} params - { orderId, paymentId, signature }
   * @returns {boolean}
   */
  verifyPaymentSignature(params) {
    throw new Error("Method verifyPaymentSignature() must be implemented");
  }

  /**
   * Verify webhook payload signature using raw request body
   * @param {Object} params - { rawBody, signature, secret }
   * @returns {boolean}
   */
  verifyWebhookSignature(params) {
    throw new Error("Method verifyWebhookSignature() must be implemented");
  }

  /**
   * Fetch payment details from provider
   * @param {string} paymentId
   * @returns {Promise<Object>}
   */
  async fetchPayment(paymentId) {
    throw new Error("Method fetchPayment() must be implemented");
  }
}

module.exports = BasePaymentProvider;
