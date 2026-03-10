const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail, sendResetPasswordEmail } = require("../utils/sendEmail");


exports.registerUser = async (req, res) => {
    console.log("find")
    try {
        const { name, email, password, user_type, referral_code } = req.body;

        if (!name || !email || !password || !user_type) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check user_type exists
        const typeCheck = await pool.query("SELECT id FROM user_types WHERE id = $1", [user_type]);
        if (!typeCheck.rows.length) {
            return res.status(400).json({ message: "Invalid user type" });
        }

        // Check if email already exists
        const emailCheck = await pool.query("SELECT id FROM users WHERE email=$1", [email.toLowerCase().trim()]);
        if (emailCheck.rows.length) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        await pool.query(
            `INSERT INTO users
            (name, email, password, user_type, referral_code, verification_token)
            VALUES ($1,$2,$3,$4,$5,$6)`,
            [name.trim(), email.toLowerCase().trim(), hashedPassword, user_type, referral_code || null, verificationToken]
        );
        res.status(201).json({
            message: "Registration successful. Check your email to verify your account.",
        });

        // Send email AFTER response
        sendVerificationEmail(email, verificationToken)
            .catch(err => console.error("EMAIL SEND FAILED 👉", err.message));

    } catch (err) {
        console.error("REGISTER ERROR 👉", err.message);
        res.status(500).json({ message: "Server error" });
    }
};


exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const userRes = await pool.query(
            `SELECT id, is_verified FROM users WHERE verification_token=$1`,
            [token]
        );

        // TOKEN NOT FOUND
        if (!userRes.rows.length) {
            return res.status(200).json({
                message: "Email already verified or token expired",
                alreadyVerified: true,
            });
        }

        const user = userRes.rows[0];

        // VERIFY USER
        await pool.query(
            `UPDATE users
       SET is_verified=true, verification_token=NULL
       WHERE id=$1`,
            [user.id]
        );

        res.json({
            message: "Email verified successfully",
            success: true,
        });

    } catch (err) {
        console.error("VERIFY EMAIL ERROR 👉", err.message);
        res.status(500).json({ message: "Server error" });
    }
};


exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const userRes = await pool.query("SELECT id, is_verified FROM users WHERE email=$1", [email.toLowerCase().trim()]);
        if (!userRes.rows.length) return res.status(400).json({ message: "User not found" });

        const user = userRes.rows[0];
        if (user.is_verified) return res.status(400).json({ message: "Email already verified" });

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");
        await pool.query("UPDATE users SET verification_token=$1 WHERE id=$2", [verificationToken, user.id]);

        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        res.json({ message: "Verification email resent successfully" });
    } catch (err) {
        console.error("RESEND VERIFICATION ERROR 👉", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email & password required" });

        const userRes = await pool.query(
            "SELECT id, name, email, password, user_type, is_verified, profile_completed FROM users WHERE email=$1",
            [email.toLowerCase().trim()]
        );
        if (!userRes.rows.length) return res.status(400).json({ message: "Invalid credentials" });

        const user = userRes.rows[0];
        if (!user.is_verified) return res.status(403).json({ message: "Please verify your email" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Sign JWT
        const token = jwt.sign({ id: user.id, user_type: user.user_type }, process.env.JWT_SECRET, { expiresIn: "1d" });

        // Set cookie
        res.cookie("access_token", token, {
            httpOnly: true,
            secure: false, // true in production
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({
            message: "Login successful",
            token,
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                user_type: user.user_type,
                profile_completed: user.profile_completed || false
            },
        });
    } catch (err) {
        console.error("LOGIN ERROR 👉", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.logoutUser = async (req, res) => {
    try {
        res.clearCookie("access_token");
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("LOGOUT ERROR 👉", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email)
            return res.status(400).json({ message: "Email is required" });

        const userRes = await pool.query(
            "SELECT id FROM users WHERE email=$1",
            [email.toLowerCase().trim()]
        );

        if (!userRes.rows.length) {
            return res.json({
                message: "If the email exists, a reset link has been sent",
            });
        }

        // Generate raw token (send via email)
        const rawToken = crypto.randomBytes(32).toString("hex");

        // Hash token (store in DB)
        const hashedToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            `UPDATE users
       SET reset_password_token=$1,
           reset_password_expires=$2
       WHERE email=$3`,
            [hashedToken, expires, email.toLowerCase().trim()]
        );

        // Send RAW token in email
        await sendResetPasswordEmail(email, rawToken);

        res.json({
            message: "If the email exists, a reset link has been sent",
        });
    } catch (err) {
        console.error("FORGOT PASSWORD ERROR 👉", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password)
            return res.status(400).json({ message: "Password is required" });

        // Hash incoming token
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find valid token
        const userRes = await pool.query(
            `SELECT id FROM users
       WHERE reset_password_token=$1
       AND reset_password_expires > NOW()`,
            [hashedToken]
        );

        if (!userRes.rows.length) {
            return res.status(400).json({
                message: "Invalid or expired reset token",
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            `UPDATE users
   SET password=$1,
       reset_password_token=NULL,
       reset_password_expires=NULL,
       password_changed_at=NOW()
   WHERE id=$2`,
            [hashedPassword, userRes.rows[0].id]
        );

        res.json({
            message: "Password reset successful. You can now login.",
        });
    } catch (err) {
        console.error("RESET PASSWORD ERROR 👉", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.checkUserStatus = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const result = await pool.query(
            "SELECT is_verified FROM users WHERE email = $1",
            [email.toLowerCase().trim()]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            verified: result.rows[0].is_verified,
        });
    } catch (err) {
        console.error("CHECK USER STATUS ERROR 👉", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.completeProfile = async (req, res) => {
    try {
        const { full_name, state, city, address, zipcode, phone_number } = req.body;

        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Validate all fields
        if (!full_name || !state || !city || !address || !zipcode || !phone_number) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Update users table - set name and profile_completed
        await pool.query(
            `UPDATE users 
             SET name = $1, 
                 profile_completed = true 
             WHERE id = $2`,
            [full_name, userId]
        );

        // Insert or update profiles table
        await pool.query(
            `INSERT INTO profiles (user_id, state, city, address, zipcode, phone, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
                state = EXCLUDED.state,
                city = EXCLUDED.city,
                address = EXCLUDED.address,
                zipcode = EXCLUDED.zipcode,
                phone = EXCLUDED.phone,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, state, city, address, zipcode, phone_number]
        );

        // Get updated user with profile_completed status
        const userRes = await pool.query(
            "SELECT id, name, email, user_type, profile_completed FROM users WHERE id = $1",
            [userId]
        );

        res.json({
            message: "Profile completed successfully",
            success: true,
            user: userRes.rows[0]
        });
    } catch (err) {
        console.error("COMPLETE PROFILE ERROR 👉", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};