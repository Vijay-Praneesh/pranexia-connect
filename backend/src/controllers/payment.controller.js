const paymentService = require("../services/payment.service");
const ApiResponse = require("../helpers/apiResponse");
const AppError = require("../utils/appError");

class PaymentController {
  /**
   * Helper to resolve tenant company ID safely
   */
  resolveCompanyId(req) {
    if (req.user.role === "SUPER_ADMIN") {
      return req.body.companyId || req.query.companyId || req.user.companyId;
    }
    if (!req.user.companyId) {
      throw new AppError("Company context is required for this action", 400);
    }
    return req.user.companyId;
  }

  /**
   * GET /api/v1/payments/pricing
   * Get public commercial pricing tiers and billing intervals
   */
  getPricing = async (req, res, next) => {
    try {
      const matrix = paymentService.getPricingMatrix();
      return ApiResponse.success(res, "Pricing matrix retrieved successfully", matrix);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/payments/order
   * Create a payment order for plan purchase or upgrade
   */
  createOrder = async (req, res, next) => {
    try {
      const companyId = this.resolveCompanyId(req);
      const { plan, billingInterval, paymentType, customLimits } = req.body;

      if (!plan) {
        throw new AppError("Plan is required to create a payment order", 400);
      }

      const orderData = await paymentService.createPaymentOrder({
        companyId,
        plan,
        billingInterval,
        paymentType,
        customLimits,
      });

      return ApiResponse.success(res, "Payment order created successfully", orderData, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/payments/verify
   * Cryptographically verify frontend payment signature and activate subscription
   */
  verifyPayment = async (req, res, next) => {
    try {
      const companyId = this.resolveCompanyId(req);
      const { paymentId, orderId, providerPaymentId, signature } = req.body;

      const result = await paymentService.verifyAndProcessPayment({
        companyId,
        paymentId,
        orderId,
        providerPaymentId,
        signature,
      });

      return ApiResponse.success(res, "Payment verified and subscription activated successfully", result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/payments/history
   * Get tenant-scoped payment history
   */
  getHistory = async (req, res, next) => {
    try {
      const companyId = this.resolveCompanyId(req);
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;

      const history = await paymentService.getCompanyPaymentHistory(companyId, limit, offset);
      return ApiResponse.success(res, "Payment history retrieved successfully", history);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/payments/:id
   * Get details for a specific payment
   */
  getPayment = async (req, res, next) => {
    try {
      const { id } = req.params;
      const isSuperAdmin = req.user.role === "SUPER_ADMIN";
      const companyId = req.user.companyId;

      const payment = await paymentService.getPaymentById(id, companyId, isSuperAdmin);
      return ApiResponse.success(res, "Payment details retrieved successfully", payment);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/payments/admin/all
   * SUPER_ADMIN: Get all platform payments
   */
  getPlatformPayments = async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const { status, plan, companyId } = req.query;

      const payments = await paymentService.getPlatformPayments({
        limit,
        offset,
        status,
        plan,
        companyId,
      });

      return ApiResponse.success(res, "Platform payments retrieved successfully", payments);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/payments/webhook
   * Asynchronous payment gateway webhook listener
   */
  handleWebhook = async (req, res, next) => {
    try {
      const signature =
        req.headers["x-razorpay-signature"] ||
        req.headers["x-payment-signature"] ||
        req.headers["stripe-signature"];

      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      const eventPayload = req.body;

      const result = await paymentService.processWebhookEvent({
        rawBody,
        signature,
        eventPayload,
      });

      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new PaymentController();
