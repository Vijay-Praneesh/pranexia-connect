const multer = require("multer");
const mediaConfig = require("../config/media");
const AppError = require("../utils/appError");

const maximumUploadSize = Math.max(mediaConfig.maxImageSize, mediaConfig.maxVideoSize, mediaConfig.maxDocumentSize);
const uploadMedia = multer({ storage: multer.memoryStorage(), limits: { fileSize: maximumUploadSize, files: 1 }, fileFilter: (_req, file, cb) => {
  if (!file.originalname || file.originalname.includes("\0")) return cb(new AppError("Invalid filename", 400));
  cb(null, true);
} });

module.exports = uploadMedia;
