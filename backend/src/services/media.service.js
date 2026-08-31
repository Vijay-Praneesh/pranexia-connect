const { randomUUID } = require("crypto");
const path = require("path");
const mediaRepository = require("../repositories/media.repository");
const storageService = require("./storage.service");
const usageService = require("./usage.service");
const { validateMediaFile } = require("../utils/media.validation");
const AppError = require("../utils/appError");

class MediaService {
  async upload(companyId, file) {
    const validation = validateMediaFile(file);
    const id = randomUUID();
    const storedName = `${id}${validation.extension}`;
    const storageKey = path.posix.join("company", companyId, "media", storedName);
    let saved = false;
    try {
      await storageService.save(storageKey, file.buffer);
      saved = true;
      const media = await mediaRepository.create({ id, companyId, originalName: validation.originalName, storedName, mimeType: file.mimetype.toLowerCase(), mediaType: validation.mediaType, size: file.size, storageKey, status: "READY" });
      void usageService.recordMediaUpload(companyId, { mediaId: id, size: file.size });
      return media;
    } catch (error) {
      if (saved) {
        try { await storageService.delete(storageKey); } catch { /* preserve the original persistence error */ }
      }
      throw error;
    }
  }
  async list(companyId, page, limit) {
    const result = await mediaRepository.findAllByCompany(companyId, page, limit);
    return { media: result.rows, pagination: { page, limit, totalRecords: result.count, totalPages: Math.ceil(result.count / limit) } };
  }
  async getForCompany(companyId, id) {
    const media = await mediaRepository.findByIdAndCompany(companyId, id);
    if (!media) throw new AppError("Media not found", 404);
    if (!(await storageService.exists(media.storageKey))) throw new AppError("Media file is unavailable", 404);
    return { media, stream: await storageService.get(media.storageKey) };
  }
  async delete(companyId, id) {
    const media = await mediaRepository.findByIdAndCompany(companyId, id);
    if (!media) throw new AppError("Media not found", 404);
    const [marked] = await mediaRepository.markDeleted(companyId, id);
    if (!marked) throw new AppError("Media could not be deleted", 409);
    await storageService.delete(media.storageKey);
    const deleted = await mediaRepository.deleteByIdAndCompany(companyId, id);
    if (!deleted) throw new AppError("Media could not be deleted", 409);
  }
  async assertOwnedByCompany(companyId, mediaId) {
    const media = await mediaRepository.findByIdAndCompany(companyId, mediaId);
    if (!media) throw new AppError("Media not found", 404);
    return media;
  }
}
module.exports = new MediaService();
