const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const schoolController = require("../controllers/schoolController");

// Get school profile
router.get("/", authMiddleware, schoolController.getSchool);

// Update school basic info
router.put("/", authMiddleware, schoolController.updateSchool);

// Upload school media (logo and banner) - uploadSchoolMedia is now an array with multer middleware
router.patch(
    "/media",
    authMiddleware,
    ...schoolController.uploadSchoolMedia
);

// Facility routes
router.post("/facilities", authMiddleware, schoolController.addFacility);
router.delete("/facilities/:id", authMiddleware, schoolController.deleteFacility);

// Program routes
router.post("/programs", authMiddleware, schoolController.addProgram);
router.delete("/programs/:id", authMiddleware, schoolController.deleteProgram);

// Achievement routes
router.post("/achievements", authMiddleware, schoolController.addAchievement);
router.delete("/achievements/:id", authMiddleware, schoolController.deleteAchievement);

// Result routes
router.post("/results", authMiddleware, schoolController.addResult);
router.delete("/results/:id", authMiddleware, schoolController.deleteResult);

module.exports = router;
