        const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const pool = require("../db");
const { sendWelcomeStudentEmail, sendJobLiveEmail } = require("../utils/sendEmail");

router.use(authMiddleware);

/* =============================
   CHECK WELCOME STATUS
============================= */
router.get("/status", async (req, res) => {
    try {
        const userId = req.userId;
        let userType = req.userType;

        // Convert userType to number if it's a string
        userType = Number(userType);

        console.log("WELCOME STATUS CHECK - userId:", userId, "userType:", userType, "type:", typeof userType);

        let tableName, requiredFields;

        // Determine table and required fields based on user type
        switch (userType) {
            case 3: // Student
                tableName = "profiles";
                requiredFields = ["state", "city", "address", "zipcode", "phone"];
                break;
            case 4: // College
                tableName = "colleges";
                requiredFields = ["state", "city", "address", "zipcode", "phone"];
                break;
            case 5: // University
                tableName = "universities";
                requiredFields = ["state", "city", "address", "zipcode", "phone"];
                break;
            case 6: // School
                tableName = "schools";
                requiredFields = ["state", "city", "address", "zipcode", "phone"];
                break;
            case 7: // Company
                tableName = "companies";
                requiredFields = ["company_type", "headquarters", "founded_year", "phone"];
                break;
            default:
                return res.json({ needsWelcome: false });
        }

        // Check if profile exists and has required fields
        const result = await pool.query(
            `SELECT ${requiredFields.join(", ")} FROM ${tableName} WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({ needsWelcome: true });
        }

        const profile = result.rows[0];
        const needsWelcome = requiredFields.some(field => !profile[field]);

        res.json({ needsWelcome });
    } catch (err) {
        console.error("CHECK WELCOME STATUS ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/* =============================
   COMPLETE WELCOME
============================= */
router.post("/", async (req, res) => {
    try {
        console.log("\n🚀 WELCOME POST HANDLER CALLED");
        
        const userId = req.userId;
        const userType = req.userType;
        const { state, city, address, zipcode, phone, company_type, headquarters, founded_year } = req.body;

        console.log("User Type:", userType, "User ID:", userId);

        // Validate required fields based on user type
        if (userType === 7) {
            // Company validation
            if (!company_type || !headquarters || !founded_year || !phone) {
                return res.status(400).json({ message: "All fields are required" });
            }
        } else {
            // Other user types validation
            if (!state || !city || !address || !zipcode || !phone) {
                return res.status(400).json({ message: "All fields are required" });
            }
        }

        console.log("✅ All fields validated");

        // Get user name for organization records
        const userRes = await pool.query("SELECT name, email FROM users WHERE id = $1", [userId]);
        if (!userRes.rows.length) {
            return res.status(404).json({ message: "User not found" });
        }
        const userName = userRes.rows[0].name;
        const userEmail = userRes.rows[0].email;

        console.log("User found:", { userName, userEmail });

        let tableName, result;

        // Update based on user type
        switch (userType) {
            case 3: // Student
                console.log("Processing STUDENT welcome...");
                tableName = "profiles";
                result = await pool.query(
                    `INSERT INTO ${tableName} (user_id, state, city, address, zipcode, phone, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (user_id)
                     DO UPDATE SET
                       state = $2,
                       city = $3,
                       address = $4,
                       zipcode = $5,
                       phone = $6,
                       updated_at = NOW()
                     RETURNING *`,
                    [userId, state, city, address, zipcode, phone]
                );
                
                // Send welcome email to student
                if (userEmail) {
                    console.log("📧 Sending welcome email to student:", userEmail);
                    try {
                        await sendWelcomeStudentEmail(userEmail, userName);
                        console.log("✅ Welcome email sent successfully to:", userEmail);
                    } catch (emailErr) {
                        console.error("❌ WELCOME EMAIL SEND FAILED:", emailErr.message);
                        // Don't fail the request if email fails
                    }
                }
                break;

            case 4: // College
                console.log("Processing COLLEGE welcome...");
                result = await pool.query(
                    `INSERT INTO colleges (user_id, name, state, city, address, zipcode, phone, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                     ON CONFLICT (user_id)
                     DO UPDATE SET
                       state = $3,
                       city = $4,
                       address = $5,
                       zipcode = $6,
                       phone = $7,
                       updated_at = NOW()
                     RETURNING *`,
                    [userId, userName, state, city, address, zipcode, phone]
                );
                break;

            case 5: // University
                console.log("Processing UNIVERSITY welcome...");
                result = await pool.query(
                    `INSERT INTO universities (user_id, name, state, city, address, zipcode, phone, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                     ON CONFLICT (user_id)
                     DO UPDATE SET
                       state = $3,
                       city = $4,
                       address = $5,
                       zipcode = $6,
                       phone = $7,
                       updated_at = NOW()
                     RETURNING *`,
                    [userId, userName, state, city, address, zipcode, phone]
                );
                break;

            case 6: // School
                console.log("Processing SCHOOL welcome...");
                result = await pool.query(
                    `INSERT INTO schools (user_id, name, state, city, address, zipcode, phone, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                     ON CONFLICT (user_id)
                     DO UPDATE SET
                       state = $3,
                       city = $4,
                       address = $5,
                       zipcode = $6,
                       phone = $7,
                       updated_at = NOW()
                     RETURNING *`,
                    [userId, userName, state, city, address, zipcode, phone]
                );
                break;

            case 7: // Company
                console.log("Processing COMPANY welcome...");
                result = await pool.query(
                    `INSERT INTO companies (user_id, name, company_type, headquarters, founded_year, phone, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (user_id)
                     DO UPDATE SET
                       company_type = $3,
                       headquarters = $4,
                       founded_year = $5,
                       phone = $6,
                       updated_at = NOW()
                     RETURNING *`,
                    [userId, userName, company_type, headquarters, founded_year, phone]
                );
                // Note: Company job live email is sent when job status is set to "published", not during welcome
                break;

            default:
                return res.status(400).json({ message: "Invalid user type" });
        }

        console.log("✅ Welcome data saved successfully");

        res.json({ message: "Welcome completed successfully" });
    } catch (err) {
        console.error("\n❌ COMPLETE WELCOME ERROR:", err.message);
        console.error("Error stack:", err.stack);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
