const ApiResponse = require("../helpers/apiResponse");
const mediaService = require("../services/media.service");

class MediaController {
  async list(req, res, next) {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 24));
      return ApiResponse.success(res, "Media fetched successfully", await mediaService.list(req.user.companyId, page, limit));
    } catch (error) { next(error); }
  }
  async upload(req, res, next) {
    try {
      const media = await mediaService.upload(req.user.companyId, req.file);
      return ApiResponse.success(res, "Media uploaded successfully", media, 201);
    } catch (error) { next(error); }
  }
  async get(req, res, next) {
    try {
      const { media, stream } = await mediaService.getForCompany(req.user.companyId, req.params.id);
      const safeName = media.originalName.replace(/["\\\r\n]/g, "_");
      res.setHeader("Content-Type", media.mimeType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Length", String(media.size));
      res.setHeader("Content-Disposition", `${media.mediaType === "DOCUMENT" ? "attachment" : "inline"}; filename="${safeName}"`);
      stream.on("error", next).pipe(res);
    } catch (error) { next(error); }
  }
  async delete(req, res, next) {
    try {
      await mediaService.delete(req.user.companyId, req.params.id);
      return ApiResponse.success(res, "Media deleted successfully", null);
    } catch (error) { next(error); }
  }
}
module.exports = new MediaController();
