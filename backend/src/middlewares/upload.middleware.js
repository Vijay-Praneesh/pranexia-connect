const multer = require("multer");
const path = require("path");

// Store uploaded files temporarily in memory
const storage = multer.memoryStorage();

// Allow only Excel files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".xlsx", ".xls"];
  const extension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel (.xlsx, .xls) files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = upload;