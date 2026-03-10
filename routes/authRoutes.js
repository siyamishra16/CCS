const express = require("express");
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    verifyEmail, 
    logoutUser, 
    resendVerification, 
    forgotPassword,
    resetPassword, 
    checkUserStatus, 
    completeProfile 
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/resend-verification", resendVerification);
router.post("/login", loginUser);
router.get("/verify/:token", verifyEmail);
router.post("/logout", logoutUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/check-user", checkUserStatus);
router.post("/complete-profile", completeProfile);

module.exports = router;
