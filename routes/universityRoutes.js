const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const universityController = require("../controllers/universityController");

// Get university profile
router.get("/", authMiddleware, universityController.getUniversity);

// Update university basic info
router.put("/", authMiddleware, universityController.updateUniversity);

// Upload university media (logo and banner)
router.patch(
	"/media",
	authMiddleware,
	...universityController.uploadUniversityMedia
);

// Clear university media
router.delete("/media/clear", authMiddleware, universityController.clearUniversityMedia);

// QR Code generation
router.get("/qrcode", authMiddleware, universityController.generateQRCode);

// Degree routes
router.post("/degrees", authMiddleware, universityController.addDegree);
router.delete("/degrees/:id", authMiddleware, universityController.deleteDegree);

// Placement routes
router.post("/placements", authMiddleware, universityController.addPlacement);
router.delete("/placements/:id", authMiddleware, universityController.deletePlacement);

// Ranking routes
router.post("/rankings", authMiddleware, universityController.addRanking);
router.delete("/rankings/:id", authMiddleware, universityController.deleteRanking);

module.exports = router;
