const ApiResponse = require("../helpers/apiResponse");
const whatsappConnectionService = require("../services/whatsappConnection.service");

class WhatsAppController {
  async getStatus(req, res, next) { try { return ApiResponse.success(res, "WhatsApp connection status fetched successfully", await whatsappConnectionService.getStatus(req.user.companyId)); } catch (error) { next(error); } }
  async connect(req, res, next) { try { return ApiResponse.success(res, "WhatsApp connection verified successfully", await whatsappConnectionService.connect(req.user.companyId, req.body), 201); } catch (error) { next(error); } }
  async disconnect(req, res, next) { try { return ApiResponse.success(res, "WhatsApp connection disconnected successfully", await whatsappConnectionService.disconnect(req.user.companyId)); } catch (error) { next(error); } }
}

module.exports = new WhatsAppController();
