const RazorpayProvider = require("./providers/razorpay.provider");
const { PAYMENT_PROVIDERS } = require("../../config/pricing.config");
const env = require("../../config/env");

class PaymentProviderFactory {
  constructor() {
    this.providers = new Map();
  }

  getProvider(providerName = null, options = {}) {
    const name = (providerName || env.PAYMENT_PROVIDER || PAYMENT_PROVIDERS.RAZORPAY).toUpperCase();

    if (this.providers.has(name) && Object.keys(options).length === 0) {
      return this.providers.get(name);
    }

    let provider;
    switch (name) {
      case PAYMENT_PROVIDERS.RAZORPAY:
      default:
        provider = new RazorpayProvider(options);
        break;
    }

    if (Object.keys(options).length === 0) {
      this.providers.set(name, provider);
    }

    return provider;
  }
}

module.exports = new PaymentProviderFactory();
