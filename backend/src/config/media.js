const path = require("path");

const megabytes = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed * 1024 * 1024 : fallback;
};

const mediaConfig = {
  storageProvider: process.env.MEDIA_STORAGE_PROVIDER || "local",
  localStoragePath: path.resolve(
    process.env.MEDIA_LOCAL_STORAGE_PATH || path.join(process.cwd(), "storage", "media"),
  ),
  maxImageSize: megabytes(process.env.MEDIA_MAX_IMAGE_SIZE, 5 * 1024 * 1024),
  maxVideoSize: megabytes(process.env.MEDIA_MAX_VIDEO_SIZE, 16 * 1024 * 1024),
  maxDocumentSize: megabytes(process.env.MEDIA_MAX_DOCUMENT_SIZE, 100 * 1024 * 1024),
  s3: {
    bucket: process.env.MEDIA_S3_BUCKET,
    region: process.env.MEDIA_S3_REGION,
    endpoint: process.env.MEDIA_S3_ENDPOINT,
    accessKeyId: process.env.MEDIA_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.MEDIA_S3_SECRET_ACCESS_KEY,
  },
};

module.exports = mediaConfig;
