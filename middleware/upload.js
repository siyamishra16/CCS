const multer = require("multer");

// Multer configuration for image uploads (profile, banner, logo)
const storage = multer.memoryStorage(); // Store file in memory buffer

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
    }
    cb(null, true);
  },
});

// Multer configuration for resume uploads (PDF/DOC/DOCX)
const resumeStorage = multer.memoryStorage();

const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PDF, DOC, and DOCX files are allowed"), false);
    }
    cb(null, true);
  },
});

module.exports = {
  imageUpload,
  resumeUpload,
};
