const assert = require("node:assert/strict");
const test = require("node:test");
const { validateMediaFile } = require("../src/utils/media.validation");
const mediaRepository = require("../src/repositories/media.repository");
const mediaService = require("../src/services/media.service");

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

test("media validation accepts a valid PNG and records its media category", () => {
  const result = validateMediaFile({ originalname: "photo.png", mimetype: "image/png", size: png.length, buffer: png });
  assert.equal(result.mediaType, "IMAGE");
});

test("media validation accepts valid MP4 and PDF signatures", () => {
  const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftypisom"), Buffer.alloc(4)]);
  const pdf = Buffer.from("%PDF-1.7\n");
  assert.equal(validateMediaFile({ originalname: "clip.mp4", mimetype: "video/mp4", size: mp4.length, buffer: mp4 }).mediaType, "VIDEO");
  assert.equal(validateMediaFile({ originalname: "brief.pdf", mimetype: "application/pdf", size: pdf.length, buffer: pdf }).mediaType, "DOCUMENT");
});

test("media validation rejects a MIME/extension mismatch and unsafe content", () => {
  assert.throws(() => validateMediaFile({ originalname: "payload.jpg", mimetype: "image/jpeg", size: 12, buffer: Buffer.from("<script>x</script>") }), { statusCode: 400 });
  assert.throws(() => validateMediaFile({ originalname: "payload.exe", mimetype: "application/octet-stream", size: 2, buffer: Buffer.from("MZ") }), { statusCode: 400 });
});

test("media ownership checks remain tenant scoped", async (t) => {
  const original = mediaRepository.findByIdAndCompany;
  t.after(() => { mediaRepository.findByIdAndCompany = original; });
  let queriedCompany;
  mediaRepository.findByIdAndCompany = async (companyId) => { queriedCompany = companyId; return null; };
  await assert.rejects(() => mediaService.assertOwnedByCompany("company-a", "media-b"), { statusCode: 404 });
  assert.equal(queriedCompany, "company-a");
});
