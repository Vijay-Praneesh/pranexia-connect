const path = require("path");
const AppError = require("./appError");
const mediaConfig = require("../config/media");

const definitions = [
  { mediaType: "IMAGE", extensions: [".jpg", ".jpeg"], mimeTypes: ["image/jpeg"], maxSize: mediaConfig.maxImageSize, signature: (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mediaType: "IMAGE", extensions: [".png"], mimeTypes: ["image/png"], maxSize: mediaConfig.maxImageSize, signature: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mediaType: "IMAGE", extensions: [".webp"], mimeTypes: ["image/webp"], maxSize: mediaConfig.maxImageSize, signature: (b) => b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mediaType: "VIDEO", extensions: [".mp4"], mimeTypes: ["video/mp4"], maxSize: mediaConfig.maxVideoSize, signature: (b) => b.length > 12 && b.subarray(4, 8).toString() === "ftyp" },
  { mediaType: "DOCUMENT", extensions: [".pdf"], mimeTypes: ["application/pdf"], maxSize: mediaConfig.maxDocumentSize, signature: (b) => b.length > 5 && b.subarray(0, 5).toString() === "%PDF-" },
  { mediaType: "DOCUMENT", extensions: [".doc"], mimeTypes: ["application/msword"], maxSize: mediaConfig.maxDocumentSize, signature: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
  { mediaType: "DOCUMENT", extensions: [".docx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], maxSize: mediaConfig.maxDocumentSize, signature: isOfficeZip("word/") },
  { mediaType: "DOCUMENT", extensions: [".xls"], mimeTypes: ["application/vnd.ms-excel"], maxSize: mediaConfig.maxDocumentSize, signature: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
  { mediaType: "DOCUMENT", extensions: [".xlsx"], mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], maxSize: mediaConfig.maxDocumentSize, signature: isOfficeZip("xl/") },
];

function isOfficeZip(requiredDirectory) {
  return (buffer) => {
    if (buffer.length < 4 || !buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return false;
    const names = buffer.subarray(0, Math.min(buffer.length, 512 * 1024)).toString("latin1");
    return names.includes("[Content_Types].xml") && names.includes(requiredDirectory);
  };
}

function sanitizeOriginalName(name) {
  const base = path.basename(String(name || "upload"));
  const normalized = base.normalize("NFKC").replace(/[\\/\0\r\n]/g, "_").replace(/[^a-zA-Z0-9._() -]/g, "_").trim();
  return normalized.slice(0, 255) || "upload";
}

function validateMediaFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) throw new AppError("A media file is required", 400);
  const extension = path.extname(file.originalname || "").toLowerCase();
  const definition = definitions.find((item) => item.extensions.includes(extension));
  if (!definition || !definition.mimeTypes.includes(String(file.mimetype || "").toLowerCase())) {
    throw new AppError("Unsupported media type. Upload a supported image, video, or document.", 400);
  }
  if (file.size > definition.maxSize) {
    throw new AppError(`${definition.mediaType} files exceed the configured size limit`, 413);
  }
  if (!definition.signature(file.buffer)) throw new AppError("The file content does not match its declared type", 400);
  return { ...definition, extension, originalName: sanitizeOriginalName(file.originalname) };
}

module.exports = { validateMediaFile, sanitizeOriginalName, definitions };
