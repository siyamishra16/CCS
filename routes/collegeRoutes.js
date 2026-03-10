const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const collegeController = require("../controllers/collegeController");

/* =============================
   PUBLIC ENDPOINTS (NO AUTH)
============================= */
router.get("/public/:id", collegeController.getPublicProfile);

/* =============================
   PROTECTED ENDPOINTS (WITH AUTH)
============================= */
router.get("/", authMiddleware, collegeController.getCollege);
router.put("/", authMiddleware, collegeController.updateCollege);

router.post("/degrees", authMiddleware, collegeController.addDegree);
router.delete("/degrees/:id", authMiddleware, collegeController.deleteDegree);

router.post("/placements", authMiddleware, collegeController.addPlacement);
router.delete("/placements/:id", authMiddleware, collegeController.deletePlacement);

router.post("/rankings", authMiddleware, collegeController.addRanking);
router.delete("/rankings/:id", authMiddleware, collegeController.deleteRanking);

router.patch("/media", authMiddleware, ...collegeController.uploadMedia);
router.delete("/media/clear", authMiddleware, collegeController.clearMedia);

router.get("/qrcode", authMiddleware, collegeController.generateQRCode);

module.exports = router;
