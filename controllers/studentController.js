const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { imageUpload, resumeUpload } = require("../middleware/upload");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinaryUpload");
const uploadResumeToCloudinary = require("../utils/uploadResumeToCloudinary");
const { sendWelcomeStudentEmail, sendJobApplicationEmail } = require("../utils/sendEmail");


const ensureDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

/* =============================
   GET PROFILE (UUID SAFE)
============================= */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.userId; // UUID

        const profileResult = await pool.query(
            "SELECT * FROM profiles WHERE user_id = $1",
            [userId]
        );

        const educationResult = await pool.query(
            "SELECT * FROM education WHERE user_id = $1 ORDER BY start_year DESC",
            [userId]
        );

        const experienceResult = await pool.query(
            "SELECT * FROM experience WHERE user_id = $1 ORDER BY start_date DESC",
            [userId]
        );

        const skillsResult = await pool.query(
            `SELECT s.id, s.skill_name
             FROM skills s
             JOIN user_skills us ON s.id = us.skill_id
             WHERE us.user_id = $1`,
            [userId]
        );

        const certificationsResult = await pool.query(
            "SELECT * FROM certifications WHERE user_id = $1 ORDER BY issue_date DESC",
            [userId]
        );

        // Fetch basic user info with newer schema (uses 'name' field)
        const userResult = await pool.query(
            "SELECT name AS full_name, email FROM users WHERE id = $1",
            [userId]
        );

        res.json({
            id: userId,
            full_name: userResult.rows[0]?.full_name || null,
            email: userResult.rows[0]?.email || null,
            profile: profileResult.rows[0] || null,
            education: educationResult.rows,
            experience: experienceResult.rows,
            skills: skillsResult.rows,
            certifications: certificationsResult.rows,
        });
    } catch (err) {
        console.error("GET PROFILE ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* =============================
   UPDATE PROFILE
============================= */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { state, city, bio, dob, phone, headline, address, zipcode } = req.body;

        const result = await pool.query(
            `INSERT INTO profiles (user_id, state, city, address, zipcode, dob, phone, bio, headline, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET
               state = $2,
               city = $3,
               address = $4,
               zipcode = $5,
               dob = $6,
               phone = $7,
               bio = $8,
               headline = $9,
               updated_at = NOW()
             RETURNING *`,
            [userId, state, city, address || null, zipcode || null, dob || null, phone || null, bio, headline || null]
        );

        res.json({ message: "Profile updated", profile: result.rows[0] });
    } catch (err) {
        console.error("UPDATE PROFILE ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* =============================
   WELCOME - COMPLETE INITIAL PROFILE
============================= */
exports.completeWelcome = async (req, res) => {
    try {
        console.log("\n🚀 COMPLETE WELCOME CALLED");
        console.log("Request body:", req.body);
        console.log("User ID:", req.userId);

        const userId = req.userId;
        const { state, city, address, zipcode, phone } = req.body;

        console.log("Received fields:", { state, city, address, zipcode, phone });

        // Validate required fields
        if (!state || !city || !address || !zipcode || !phone) {
            console.error("❌ Validation failed - Missing required fields");
            return res.status(400).json({ message: "All fields are required" });
        }

        console.log("✅ All fields validated");

        const result = await pool.query(
            `INSERT INTO profiles (user_id, state, city, address, zipcode, phone, updated_at)
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

        console.log("✅ Profile saved to database");

        // Fetch user details for email
        const userResult = await pool.query(
            "SELECT name, email FROM users WHERE id = $1",
            [userId]
        );

        console.log("User result:", userResult.rows);

        const user = userResult.rows[0];

        // Send welcome email
        if (user && user.email) {
            console.log("📧 Sending welcome email to:", user.email);
            try {
                const emailResult = await sendWelcomeStudentEmail(user.email, user.name);
                console.log("✅ Welcome email sent successfully to:", user.email, "Result:", emailResult);
            } catch (emailErr) {
                console.error("❌ WELCOME EMAIL SEND FAILED:", emailErr);
                console.error("Error message:", emailErr.message);
                console.error("Error stack:", emailErr.stack);
                // Don't fail the request if email fails
            }
        } else {
            console.warn("⚠️ No user email found for welcome email. User data:", user);
        }

        res.json({ message: "Welcome completed", profile: result.rows[0] });
    } catch (err) {
        console.error("\n❌ WELCOME COMPLETE ERROR:", err.message);
        console.error("Error stack:", err.stack);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

/* =============================
   CHECK IF WELCOME IS NEEDED
============================= */
exports.checkWelcomeStatus = async (req, res) => {
    try {
        const userId = req.userId;

        const result = await pool.query(
            "SELECT state, city, address, zipcode, phone FROM profiles WHERE user_id = $1",
            [userId]
        );

        // If no profile exists or any required field is missing, welcome is needed
        if (result.rows.length === 0) {
            return res.json({ needsWelcome: true });
        }

        const profile = result.rows[0];
        const needsWelcome = !profile.state || !profile.city || !profile.address || !profile.zipcode || !profile.phone;

        res.json({ needsWelcome });
    } catch (err) {
        console.error("CHECK WELCOME STATUS ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* =============================
   EDUCATION
============================= */
exports.addEducation = async (req, res) => {
    try {
        const userId = req.userId;
        let { degree, field_of_study, institution, start_year, end_year, is_current } = req.body;

        if (!degree || !institution) {
            return res.status(400).json({ message: "Degree and institution are required" });
        }

        start_year = start_year ? parseInt(start_year) : null;
        end_year = end_year ? parseInt(end_year) : null;

        const result = await pool.query(
            `INSERT INTO education
             (user_id, degree, field_of_study, institution, start_year, end_year, is_current)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, degree, field_of_study, institution, start_year, end_year, is_current || false]
        );

        res.status(201).json({ message: "Education added", education: result.rows[0] });
    } catch (err) {
        console.error("ADD EDUCATION ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteEducation = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        await pool.query(
            "DELETE FROM education WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        res.json({ message: "Education deleted" });
    } catch (err) {
        console.error("DELETE EDUCATION ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* =============================
   EXPERIENCE
============================= */
exports.addExperience = async (req, res) => {
    try {
        const userId = req.userId;
        let { title, company, start_date, end_date, is_current, description } = req.body;

        if (!title || !company) {
            return res.status(400).json({ message: "Title and company are required" });
        }

        const result = await pool.query(
            `INSERT INTO experience
             (user_id, title, company, start_date, end_date, is_current, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, title, company, start_date || null, end_date || null, is_current || false, description]
        );

        res.status(201).json({ message: "Experience added", experience: result.rows[0] });
    } catch (err) {
        console.error("ADD EXPERIENCE ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteExperience = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        await pool.query(
            "DELETE FROM experience WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        res.json({ message: "Experience deleted" });
    } catch (err) {
        console.error("DELETE EXPERIENCE ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* =============================
   SKILLS
============================= */
exports.addSkill = async (req, res) => {
    try {
        const userId = req.userId;
        const { skill_name } = req.body;

        if (!skill_name) {
            return res.status(400).json({ message: "Skill name is required" });
        }

        const skillResult = await pool.query(
            `INSERT INTO skills (skill_name)
             VALUES ($1)
             ON CONFLICT (skill_name) DO UPDATE SET skill_name = $1
             RETURNING id`,
            [skill_name.trim()]
        );

        await pool.query(
            `INSERT INTO user_skills (user_id, skill_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [userId, skillResult.rows[0].id]
        );

        res.status(201).json({ message: "Skill added" });
    } catch (err) {
        console.error("ADD SKILL ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteSkill = async (req, res) => {
    try {
        const userId = req.userId;
        const { skill_id } = req.params;

        await pool.query(
            "DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2",
            [userId, skill_id]
        );

        res.json({ message: "Skill removed" });
    } catch (err) {
        console.error("DELETE SKILL ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* =============================
   CERTIFICATIONS
============================= */
exports.addCertification = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, issuing_organization, issue_date, expiry_date, credential_id, credential_url } = req.body;

        if (!name || !issuing_organization) {
            return res.status(400).json({ message: "Name and issuing organization are required" });
        }

        const result = await pool.query(
            `INSERT INTO certifications
             (user_id, name, issuing_organization, issue_date, expiry_date, credential_id, credential_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, name, issuing_organization, issue_date || null, expiry_date || null, credential_id || null, credential_url || null]
        );

        res.status(201).json({ message: "Certification added", certification: result.rows[0] });
    } catch (err) {
        console.error("ADD CERTIFICATION ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteCertification = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        await pool.query(
            "DELETE FROM certifications WHERE id = $1 AND user_id = $2",
            [id, userId]
        );

        res.json({ message: "Certification deleted" });
    } catch (err) {
        console.error("DELETE CERTIFICATION ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* =============================
   MEDIA UPLOAD (CLOUDINARY)
============================= */
exports.uploadMedia = [
    imageUpload.fields([
        { name: "profileImage", maxCount: 1 },
        { name: "bannerImage", maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const userId = req.userId;
            const profileFile = req.files?.profileImage?.[0];
            const bannerFile = req.files?.bannerImage?.[0];

            if (!profileFile && !bannerFile) {
                return res.status(400).json({ message: "No files provided" });
            }

            // Get existing profile to check for old images
            const existingProfile = await pool.query(
                "SELECT profile_image_url, banner_image_url FROM profiles WHERE user_id = $1",
                [userId]
            );

            let profileUrl = null;
            let bannerUrl = null;

            // Upload profile image to Cloudinary
            // console.log(existingProfile,"exiting profile url find out kare1");
            if (profileFile) {
                // Delete old profile image if exists
                // console.log(existingProfile,"exiting profile url find out kare2");
                if (existingProfile.rows[0]?.profile_image_url) {
                    const oldPublicId = extractPublicId(existingProfile.rows[0].profile_image_url);
                    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
                }

                const result = await uploadToCloudinary(profileFile.buffer, "student", "profile");
                profileUrl = result.secure_url;
            }

            // Upload banner image to Cloudinary
            if (bannerFile) {
                // Delete old banner image if exists
                if (existingProfile.rows[0]?.banner_image_url) {
                    const oldPublicId = extractPublicId(existingProfile.rows[0].banner_image_url);
                    console.log(oldPublicId, "--------------------->");

                    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
                }

                const result = await uploadToCloudinary(bannerFile.buffer, "student", "banner");
                bannerUrl = result.secure_url;
            }

            const result = await pool.query(
                `INSERT INTO profiles (user_id, profile_image_url, banner_image_url, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (user_id)
                 DO UPDATE SET
                    profile_image_url = COALESCE(EXCLUDED.profile_image_url, profiles.profile_image_url),
                    banner_image_url = COALESCE(EXCLUDED.banner_image_url, profiles.banner_image_url),
                    updated_at = NOW()
                 RETURNING profile_image_url, banner_image_url`,
                [userId, profileUrl, bannerUrl]
            );

            res.json({
                message: "Media uploaded successfully to Cloudinary",
                profile_image_url: result.rows[0].profile_image_url,
                banner_image_url: result.rows[0].banner_image_url,
            });
        } catch (err) {
            console.error("UPLOAD MEDIA ERROR:", err.message);
            res.status(500).json({ message: "Server error: " + err.message });
        }
    },
];

// Helper function to extract public_id from Cloudinary URL
const extractPublicId = (url) => {
    if (!url) return null;
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.(jpg|jpeg|png|webp)$/);
    return matches ? matches[1] : null;
};

/* =============================
   CLEAR MEDIA
============================= */
exports.clearMedia = async (req, res) => {
    try {
        const userId = req.userId;

        await pool.query(
            `UPDATE profiles
             SET profile_image_url = NULL,
                 banner_image_url = NULL,
                 updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
        );

        res.json({ message: "Images cleared" });
    } catch (err) {
        console.error("CLEAR MEDIA ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};


/* =============================
   GET PUBLIC PROFILE (BY USER ID)
============================= */
exports.getPublicProfile = async (req, res) => {
    try {
        const { id } = req.params; // user_id (UUID)

        // Get user basic info
        const userResult = await pool.query(
            "SELECT id, name, email FROM users WHERE id = $1",
            [id]
        );

        if (!userResult.rows.length) {
            return res.status(404).json({ message: "Profile not found" });
        }

        const user = userResult.rows[0];

        // Get profile details
        const profileResult = await pool.query(
            "SELECT * FROM profiles WHERE user_id = $1",
            [id]
        );

        const educationResult = await pool.query(
            "SELECT * FROM education WHERE user_id = $1 ORDER BY start_year DESC",
            [id]
        );

        const experienceResult = await pool.query(
            "SELECT * FROM experience WHERE user_id = $1 ORDER BY start_date DESC",
            [id]
        );

        const skillsResult = await pool.query(
            `SELECT s.id, s.skill_name
             FROM skills s
             JOIN user_skills us ON s.id = us.skill_id
             WHERE us.user_id = $1`,
            [id]
        );

        const certificationsResult = await pool.query(
            "SELECT * FROM certifications WHERE user_id = $1 ORDER BY issue_date DESC",
            [id]
        );

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            profile: profileResult.rows[0] || null,
            education: educationResult.rows,
            experience: experienceResult.rows,
            skills: skillsResult.rows,
            certifications: certificationsResult.rows,
        });
    } catch (err) {
        console.error("GET PUBLIC PROFILE ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* =============================
   GET COMPANIES WITH JOB POSTS
   (STUDENT SIDE)
============================= */
exports.getCompaniesWithJobs = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id AS company_id,
                c.name AS company_name,
                c.industry,
                c.company_type,

                cj.id AS job_id,
                cj.title,
                cj.location,
                cj.location_type,
                cj.pay_min,
                cj.pay_max,
                cj.pay_rate,
                cj.experience_years,
                cj.experience_type,
                cj.description,
                cj.created_at,

                ARRAY_REMOVE(ARRAY_AGG(DISTINCT cjt.type), NULL) AS job_types,
                ARRAY_REMOVE(ARRAY_AGG(DISTINCT cjb.benefit), NULL) AS benefits,
                ARRAY_REMOVE(ARRAY_AGG(DISTINCT cjs.shift), NULL) AS shifts,
                ARRAY_REMOVE(ARRAY_AGG(DISTINCT cjl.language), NULL) AS languages

            FROM companies c
            JOIN company_jobs cj 
                ON cj.company_id = c.id
                AND cj.status = 'published'

            LEFT JOIN company_job_types cjt 
                ON cjt.job_id = cj.id

            LEFT JOIN company_job_benefits cjb
                ON cjb.job_id = cj.id

            LEFT JOIN company_job_shifts cjs
                ON cjs.job_id = cj.id

            LEFT JOIN company_job_languages cjl
                ON cjl.job_id = cj.id

            GROUP BY 
                c.id, c.name, c.industry, c.company_type,
                cj.id

            ORDER BY cj.created_at DESC
        `;

        const { rows } = await pool.query(query);

        const companiesMap = {};

        rows.forEach(row => {
            if (!companiesMap[row.company_id]) {
                companiesMap[row.company_id] = {
                    company_id: row.company_id,
                    company_name: row.company_name,
                    industry: row.industry,
                    company_type: row.company_type,
                    jobs: []
                };
            }

            companiesMap[row.company_id].jobs.push({
                id: row.job_id,
                title: row.title,
                location: row.location,
                work_mode: row.location_type,
                salary: row.pay_min && row.pay_max
                    ? `${row.pay_min} - ${row.pay_max} ${row.pay_rate || ""}`
                    : "As per company norms",
                experience: row.experience_years
                    ? `${row.experience_years} yrs (${row.experience_type || "Any"})`
                    : "Not specified",
                description: row.description,
                posted_at: row.created_at,
                job_types: row.job_types || [],
                benefits: row.benefits || [],
                shifts: row.shifts || [],
                languages: row.languages || []
            });
        });

        res.json(Object.values(companiesMap));

    } catch (err) {
        console.error("GET COMPANIES JOBS ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Get basic student info for job application review
// name + email ONLY
exports.getStudentBasicInfo = async (req, res) => {
    try {
        const userId = req.userId; // ✅ use req.userId from your middleware

        const query = `
            SELECT name, email
            FROM users
            WHERE id = $1
              AND user_type = 3
              AND status = true
        `;

        const { rows } = await pool.query(query, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                name: rows[0].name,
                email: rows[0].email
            }
        });

    } catch (error) {
        console.error("getStudentBasicInfo error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// // POST /jobs/apply
// exports.applyJob = [
//     // resumeUpload.single("resume"), // resume file key from frontend
//     async (req, res) => {
//         try {
//             const studentId = req.userId; // UUID from auth middleware
//             const { jobId, jobTitle, company } = req.body;

//             if (!jobId) {
//                 return res.status(400).json({ success: false, message: "Job ID is required" });
//             }

//             // Check if job exists
//             const jobQuery = "SELECT * FROM company_jobs WHERE id = $1 AND status = 'published'";
//             const { rows: jobRows } = await pool.query(jobQuery, [jobId]);
//             if (jobRows.length === 0) {
//                 return res.status(404).json({ success: false, message: "Job not found" });
//             }

//             // Check if student already applied
//             const checkQuery = "SELECT * FROM job_applications WHERE student_id = $1 AND job_id = $2";
//             const { rows: existing } = await pool.query(checkQuery, [studentId, jobId]);
//             if (existing.length > 0) {
//                 return res.status(400).json({ success: false, message: "Already applied to this job" });
//             }

//             // Resume file path
//             let resumeUrl = null;
//             if (req.file) {
//                 resumeUrl = `/uploads/student/resumes/${req.file.filename}`;
//             }

//             const insertQuery = `
//                 INSERT INTO job_applications
//                     (student_id, job_id, resume_url, job_title, company)
//                 VALUES ($1, $2, $3, $4, $5)
//                 RETURNING *
//             `;
//             const { rows } = await pool.query(insertQuery, [
//                 studentId,
//                 jobId,
//                 resumeUrl,
//                 jobTitle || null,
//                 company || null,
//             ]);

//             res.status(201).json({ success: true, data: rows[0] });
//         } catch (err) {
//             console.error("APPLY JOB ERROR:", err.message);
//             res.status(500).json({ success: false, message: "Server error" });
//         }
//     }
// ];
// exports.applyJob = [
//     resumeUpload.single("resume"),
//     async (req, res) => {
//         try {
//             const studentId = req.userId;
//             const { jobId, jobTitle, company } = req.body;

//             if (!jobId) {
//                 return res.status(400).json({ success: false, message: "Job ID required" });
//             }

//             let resumeUrl = null;

//             if (req.file) {
//                 const result = await uploadResumeToCloudinary(req.file.buffer);
//                 resumeUrl = result.secure_url;
//             }

//             const insert = await pool.query(
//                 `INSERT INTO job_applications
//          (student_id, job_id, resume_url, job_title, company)
//          VALUES ($1, $2, $3, $4, $5)
//          RETURNING *`,
//                 [studentId, jobId, resumeUrl, jobTitle, company]
//             );

//             res.status(201).json({ success: true, data: insert.rows[0] });
//         } catch (err) {
//             console.error("APPLY JOB ERROR:", err);
//             res.status(500).json({ success: false, message: "Server error" });
//         }
//     },
// ];

exports.applyJob = [
    resumeUpload.single("resume"), // ✅ multer FIRST

    async (req, res) => {
        try {
            const studentId = req.userId;
            const { jobId, jobTitle, company } = req.body;

            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "Job ID is required",
                });
            }

            // ✅ CHECK JOB EXISTS
            const jobQuery =
                "SELECT cj.*, c.name as company_name FROM company_jobs cj JOIN companies c ON cj.company_id = c.id WHERE cj.id = $1 AND cj.status = 'published'";
            const { rows: jobRows } = await pool.query(jobQuery, [jobId]);

            if (jobRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Job not found",
                });
            }

            const jobDetails = jobRows[0];

            // ✅ CHECK DUPLICATE APPLICATION
            const checkQuery =
                "SELECT 1 FROM job_applications WHERE student_id = $1 AND job_id = $2";
            const { rows: existing } = await pool.query(checkQuery, [
                studentId,
                jobId,
            ]);

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Already applied to this job",
                });
            }

            // ================================
            // ⭐ THIS IS WHERE YOUR CODE GOES
            // ================================
            let resumeUrl = null;

            if (req.file) {
                const resumeResult = await uploadResumeToCloudinary(
                    req.file.buffer,
                    req.file.originalname
                );

                resumeUrl = resumeResult.secure_url;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Resume is required",
                });
            }

            // ✅ INSERT APPLICATION
            const insertQuery = `
        INSERT INTO job_applications
          (student_id, job_id, resume_url, job_title, company)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

            const { rows } = await pool.query(insertQuery, [
                studentId,
                jobId,
                resumeUrl,
                jobTitle || jobDetails.title || null,
                company || jobDetails.company_name || null,
            ]);

            // Fetch student email for sending email
            const studentResult = await pool.query(
                "SELECT name, email FROM users WHERE id = $1",
                [studentId]
            );

            const student = studentResult.rows[0];

            // Send job application email
            if (student && student.email) {
                const emailDetails = {
                    jobTitle: jobTitle || jobDetails.title,
                    companyName: company || jobDetails.company_name,
                    jobLocation: jobDetails.location || "Not specified",
                    applicationDate: new Date().toLocaleDateString(),
                };
                sendJobApplicationEmail(student.email, student.name, emailDetails)
                    .catch(err => console.error("JOB APPLICATION EMAIL SEND FAILED:", err.message));
            }

            return res.status(201).json({
                success: true,
                data: rows[0],
            });
        } catch (err) {
            console.error("APPLY JOB ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    },
];

// // GET /student/applied-jobs
exports.getAppliedJobs = async (req, res) => {
    try {
        const studentId = req.userId; // UUID from auth middleware

        // Fetch applied jobs with job details from company_jobs
        const query = `
            SELECT 
                ja.id AS application_id,
                ja.job_id,
                ja.resume_url,
                ja.status AS application_status,
                ja.created_at AS applied_at,

                cj.title,
                cj.company_id,
                cj.location,
                cj.location_type,
                cj.pay_min,
                cj.pay_max,
                cj.pay_rate,
                cj.experience_years,
                cj.experience_type,
                cj.description,
                cj.status AS job_status,
                c.name AS company_name,
                c.industry AS company_industry

            FROM job_applications ja
            JOIN company_jobs cj ON ja.job_id = cj.id
            JOIN companies c ON cj.company_id = c.id
            WHERE ja.student_id = $1
            ORDER BY ja.created_at DESC
        `;

        const { rows } = await pool.query(query, [studentId]);

        // Optional: transform data for frontend display
        const appliedJobs = rows.map(job => ({
            applicationId: job.application_id,
            jobId: job.job_id,
            jobTitle: job.title,
            companyId: job.company_id,
            companyName: job.company_name,
            companyIndustry: job.company_industry,
            location: job.location,
            locationType: job.location_type,
            pay: job.pay_min && job.pay_max
                ? `${job.pay_min} - ${job.pay_max} ${job.pay_rate || ""}`
                : "As per company norms",
            experience: job.experience_years
                ? `${job.experience_years} yrs (${job.experience_type || "Any"})`
                : "Not specified",
            description: job.description,
            jobStatus: job.job_status,
            applicationStatus: job.application_status,
            resumeUrl: job.resume_url,
            appliedAt: job.applied_at,
        }));

        res.json({ success: true, data: appliedJobs });

    } catch (err) {
        console.error("GET APPLIED JOBS ERROR:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /api/profile/jobs/applied-ids
exports.getAppliedJobIds = async (req, res) => {
    try {
        const studentId = req.userId;

        const query = `
            SELECT job_id
            FROM job_applications
            WHERE student_id = $1
        `;

        const { rows } = await pool.query(query, [studentId]);

        // Return ONLY job_ids (UUIDs)
        const appliedJobIds = rows.map(row => row.job_id);

        res.json({
            success: true,
            data: appliedJobIds
        });
    } catch (err) {
        console.error("GET APPLIED JOB IDS ERROR:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.getAppliedJobDetails = async (req, res) => {
    try {
        const studentId = req.userId;
        const { applicationId } = req.params;

        // 1️⃣ Validate application
        const applicationRes = await pool.query(
            `
            SELECT job_id, status, created_at, resume_url
            FROM job_applications
            WHERE id = $1 AND student_id = $2
            `,
            [applicationId, studentId]
        );

        if (!applicationRes.rows.length) {
            return res.status(404).json({ message: "Applied job not found" });
        }

        const application = applicationRes.rows[0];
        const jobId = application.job_id;

        // 2️⃣ Fetch job + company
        const jobRes = await pool.query(
            `
    SELECT 
        j.*,
        c.name AS company_name,
        c.industry,
        c.website,
        c.city AS company_location
    FROM company_jobs j
    JOIN companies c ON c.id = j.company_id
    WHERE j.id = $1
    `,
            [jobId]
        );

        if (!jobRes.rows.length) {
            return res.status(404).json({ message: "Job not found" });
        }

        const rawJob = jobRes.rows[0];

        // 3️⃣ Fetch child tables
        const safe = async (q, p) => {
            try {
                const r = await pool.query(q, p);
                return r.rows.map(Object.values).flat();
            } catch {
                return [];
            }
        };

        const [jobTypes, benefits, languages, shifts, questions] =
            await Promise.all([
                safe(`SELECT type FROM company_job_types WHERE job_id = $1`, [jobId]),
                safe(`SELECT benefit FROM company_job_benefits WHERE job_id = $1`, [jobId]),
                safe(`SELECT language FROM company_job_languages WHERE job_id = $1`, [jobId]),
                safe(`SELECT shift FROM company_job_shifts WHERE job_id = $1`, [jobId]),
                pool
                    .query(
                        `SELECT question, is_required FROM company_job_questions WHERE job_id = $1`,
                        [jobId]
                    )
                    .then(r => r.rows)
                    .catch(() => [])
            ]);

        // 4️⃣ Response (frontend-safe)
        res.json({
            application: {
                id: applicationId,
                status: application.status,
                appliedAt: application.created_at,
                resumeUrl: application.resume_url
            },
            job: {
                id: rawJob.id,
                title: rawJob.title,
                description: rawJob.description,
                location: rawJob.location,
                locationType: rawJob.location_type,
                experienceYears: rawJob.experience_years,
                experienceType: rawJob.experience_type,
                payMin: rawJob.pay_min,
                payMax: rawJob.pay_max,
                payRate: rawJob.pay_rate,

                jobType: jobTypes,
                selectedBenefits: benefits,
                language: languages,
                shift: shifts,
                customQuestions: questions,

                company_name: rawJob.company_name,
                industry: rawJob.industry,
                website: rawJob.website,
                company_location: rawJob.company_location
            }
        });

    } catch (err) {
        console.error("STUDENT APPLIED JOB DETAILS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};
