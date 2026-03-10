const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const studentController = require("../controllers/studentController");

const {
   getProfile,
   updateProfile,
   addEducation,
   deleteEducation,
   addExperience,
   deleteExperience,
   addSkill,
   deleteSkill,
   addCertification,
   deleteCertification,
   uploadMedia,
   clearMedia,
   getPublicProfile,
   getCompaniesWithJobs,
   getStudentBasicInfo,
   applyJob,
   getAppliedJobs,
   getAppliedJobDetails,
   getAppliedJobIds,
   completeWelcome,
   checkWelcomeStatus,
} = studentController;

/* =============================
   PUBLIC ENDPOINTS (NO AUTH)
============================= */
router.get("/public/:id", getPublicProfile); // Public profile

/* =============================
   APPLY AUTH MIDDLEWARE ONCE
============================= */
router.use(authMiddleware);

/* =============================
   WELCOME STATUS CHECK
============================= */
router.get("/welcome/status", checkWelcomeStatus);
router.post("/welcome/complete", completeWelcome);

/* =============================
   PROFILE
============================= */
router.get("/", getProfile);
router.put("/", updateProfile);

/**
 * uploadMedia is an ARRAY:
 * [multerMiddleware, asyncHandler]
 * so we MUST spread it
 */
router.patch("/media", ...uploadMedia);
router.delete("/media/clear", clearMedia);

/* =============================
   EDUCATION
============================= */
router.post("/education", addEducation);
router.delete("/education/:id", deleteEducation);

/* =============================
   EXPERIENCE
============================= */
router.post("/experience", addExperience);
router.delete("/experience/:id", deleteExperience);

/* =============================
   SKILLS
============================= */
router.post("/skills", addSkill);
router.delete("/skills/:skill_id", deleteSkill);

/* =============================
   CERTIFICATIONS
============================= */
router.post("/certifications", addCertification);
router.delete("/certifications/:id", deleteCertification);
/* =============================
   STUDENT – COMPANIES & JOBS
============================= */
router.get("/companies", getCompaniesWithJobs);
router.get(
   "/student/basic-info",
   getStudentBasicInfo
);
router.post("/jobs/apply", applyJob);
router.get("/student/applied-jobs", getAppliedJobs);
router.get("/jobs/applied-ids", getAppliedJobIds);
router.get(
   "/student/applied-jobs/:applicationId",
   getAppliedJobDetails
);

module.exports = router;
