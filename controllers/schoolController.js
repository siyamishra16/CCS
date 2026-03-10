const pool = require("../db");
const path = require("path");
const fs = require("fs");
const { imageUpload } = require("../middleware/upload");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinaryUpload");

const ensureDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

// Helper function to extract public_id from Cloudinary URL
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const publicId = parts.slice(parts.indexOf('ccs')).join('/').replace(/\.[^/.]+$/, '');
    return publicId;
};

// Get school profile and related data
exports.getSchool = async (req, res) => {
    try {
        const userId = req.userId;

        const schoolResult = await pool.query(
            "SELECT * FROM schools WHERE user_id = $1",
            [userId]
        );

        const schoolId = schoolResult.rows[0]?.id || null;

        const facilities = schoolId
            ? (await pool.query(
                  "SELECT * FROM school_facilities WHERE school_id = $1 ORDER BY facility_name",
                  [schoolId]
              )).rows
            : [];

        const programs = schoolId
            ? (await pool.query(
                  "SELECT * FROM school_programs WHERE school_id = $1 ORDER BY id DESC",
                  [schoolId]
              )).rows
            : [];

        const achievements = schoolId
            ? (await pool.query(
                  "SELECT * FROM school_achievements WHERE school_id = $1 ORDER BY year DESC NULLS LAST, id DESC",
                  [schoolId]
              )).rows
            : [];

        const results = schoolId
            ? (await pool.query(
                  "SELECT * FROM school_results WHERE school_id = $1 ORDER BY academic_year DESC",
                  [schoolId]
              )).rows
            : [];

        res.json({
            school: schoolResult.rows[0] || null,
            facilities,
            programs,
            achievements,
            results,
        });
    } catch (err) {
        console.error("GET SCHOOL ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Update school basic info
exports.updateSchool = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            name,
            established_year,
            board,
            affiliation,
            school_type,
            grade_levels,
            state,
            city,
            zipcode,
            address,
            phone,
            email,
            website_url,
            principal_name,
            principal_email,
            principal_phone,
            student_strength,
            teacher_count,
        } = req.body;

        let resolvedName = name;

        if (!resolvedName) {
            const existingSchool = await pool.query(
                "SELECT name FROM schools WHERE user_id = $1",
                [userId]
            );

            if (existingSchool.rows.length && existingSchool.rows[0].name) {
                resolvedName = existingSchool.rows[0].name;
            } else {
                const userResult = await pool.query(
                    "SELECT name FROM users WHERE id = $1",
                    [userId]
                );
                resolvedName = userResult.rows[0]?.name || "";
            }
        }

        if (!resolvedName) {
            return res.status(400).json({ message: "School name is required" });
        }

        const result = await pool.query(
            `INSERT INTO schools (
                user_id, name, established_year, board, affiliation, school_type, grade_levels,
                state, city, zipcode, address, phone, email, website_url,
                principal_name, principal_email, principal_phone, student_strength, teacher_count, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                name = EXCLUDED.name,
                established_year = EXCLUDED.established_year,
                board = EXCLUDED.board,
                affiliation = EXCLUDED.affiliation,
                school_type = EXCLUDED.school_type,
                grade_levels = EXCLUDED.grade_levels,
                state = EXCLUDED.state,
                city = EXCLUDED.city,
                zipcode = EXCLUDED.zipcode,
                address = EXCLUDED.address,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                website_url = EXCLUDED.website_url,
                principal_name = EXCLUDED.principal_name,
                principal_email = EXCLUDED.principal_email,
                principal_phone = EXCLUDED.principal_phone,
                student_strength = EXCLUDED.student_strength,
                teacher_count = EXCLUDED.teacher_count,
                updated_at = NOW()
            RETURNING *`,
            [
                userId,
                resolvedName,
                established_year || null,
                board || null,
                affiliation || null,
                school_type || null,
                grade_levels || null,
                state || null,
                city || null,
                zipcode || null,
                address || null,
                phone || null,
                email || null,
                website_url || null,
                principal_name || null,
                principal_email || null,
                principal_phone || null,
                student_strength || null,
                teacher_count || null,
            ]
        );

        res.json({ school: result.rows[0] });
    } catch (err) {
        console.error("UPDATE SCHOOL ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Upload school media (logo and banner) to Cloudinary
exports.uploadSchoolMedia = [
    imageUpload.fields([
        { name: "logoImage", maxCount: 1 },
        { name: "bannerImage", maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const userId = req.userId;

            const schoolRes = await pool.query(
                "SELECT id, logo_url, banner_url FROM schools WHERE user_id = $1",
                [userId]
            );

            if (!schoolRes.rows.length) {
                return res.status(404).json({ message: "School profile not found" });
            }

            const school = schoolRes.rows[0];
            const logoFile = req.files?.logoImage?.[0];
            const bannerFile = req.files?.bannerImage?.[0];

            let logoUrl = null;
            let bannerUrl = null;

            /* LOGO - Upload to Cloudinary */
            if (logoFile) {
                // Delete old logo if exists
                if (school.logo_url) {
                    const oldPublicId = extractPublicId(school.logo_url);
                    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
                }

                const result = await uploadToCloudinary(logoFile.buffer, "school", "logo");
                logoUrl = result.secure_url;
            }

            /* BANNER - Upload to Cloudinary */
            if (bannerFile) {
                // Delete old banner if exists
                if (school.banner_url) {
                    const oldPublicId = extractPublicId(school.banner_url);
                    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
                }

                const result = await uploadToCloudinary(bannerFile.buffer, "school", "banner");
                bannerUrl = result.secure_url;
            }

            const updateRes = await pool.query(
                `UPDATE schools
                SET
                    logo_url = COALESCE($1, logo_url),
                    banner_url = COALESCE($2, banner_url),
                    updated_at = NOW()
                WHERE id = $3
                RETURNING *`,
                [logoUrl, bannerUrl, school.id]
            );

            res.json({ 
                message: "Media uploaded successfully to Cloudinary",
                school: updateRes.rows[0] 
            });
        } catch (err) {
            console.error("UPLOAD SCHOOL MEDIA ERROR:", err.message);
            res.status(500).json({ message: "Server error: " + err.message });
        }
    },
];

// Add facility
exports.addFacility = async (req, res) => {
    try {
        const userId = req.userId;
        const { facility_name } = req.body;

        if (!facility_name) {
            return res.status(400).json({ message: "Facility name is required" });
        }

        const schoolRes = await pool.query(
            "SELECT id FROM schools WHERE user_id = $1",
            [userId]
        );

        if (!schoolRes.rows.length) {
            return res.status(404).json({ message: "School not found" });
        }

        const schoolId = schoolRes.rows[0].id;

        const result = await pool.query(
            "INSERT INTO school_facilities (school_id, facility_name) VALUES ($1, $2) RETURNING *",
            [schoolId, facility_name]
        );

        res.json({ facility: result.rows[0] });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(400).json({ message: "Facility already exists" });
        }
        console.error("ADD FACILITY ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete facility
exports.deleteFacility = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const schoolRes = await pool.query(
            "SELECT id FROM schools WHERE user_id = $1",
            [userId]
        );

        if (!schoolRes.rows.length) {
            return res.status(404).json({ message: "School not found" });
        }

        const schoolId = schoolRes.rows[0].id;

        await pool.query(
            "DELETE FROM school_facilities WHERE id = $1 AND school_id = $2",
            [id, schoolId]
        );

        res.json({ message: "Facility deleted" });
    } catch (err) {
        console.error("DELETE FACILITY ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Add program
exports.addProgram = async (req, res) => {
    try {
        const userId = req.userId;
        const { program_name, description } = req.body;

        if (!program_name) {
            return res.status(400).json({ message: "Program name is required" });
        }

        const schoolRes = await pool.query(
            "SELECT id FROM schools WHERE user_id = $1",
            [userId]
        );

        if (!schoolRes.rows.length) {
            return res.status(404).json({ message: "School not found" });
        }

        const schoolId = schoolRes.rows[0].id;

        const result = await pool.query(
            "INSERT INTO school_programs (school_id, program_name, description) VALUES ($1, $2, $3) RETURNING *",
            [schoolId, program_name, description || null]
        );

        res.json({ program: result.rows[0] });
    } catch (err) {
        console.error("ADD PROGRAM ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete program
exports.deleteProgram = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const schoolRes = await pool.query(
            "SELECT id FROM schools WHERE user_id = $1",
            [userId]
        );

        if (!schoolRes.rows.length) {
            return res.status(404).json({ message: "School not found" });
        }

        const schoolId = schoolRes.rows[0].id;

        await pool.query(
            "DELETE FROM school_programs WHERE id = $1 AND school_id = $2",
            [id, schoolId]
        );

        res.json({ message: "Program deleted" });
    } catch (err) {
        console.error("DELETE PROGRAM ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Add achievement
exports.addAchievement = async (req, res) => {
    try {
        const userId = req.userId;
        const { title, description, year, achievement_type } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Achievement title is required" });
        }

        const schoolRes = await pool.query(
            "SELECT id FROM schools WHERE user_id = $1",
            [userId]
        );

        if (!schoolRes.rows.length) {
            return res.status(404).json({ message: "School not found" });
        }

        const schoolId = schoolRes.rows[0].id;

        const result = await pool.query(
            "INSERT INTO school_achievements (school_id, title, description, year, achievement_type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [schoolId, title, description || null, year || null, achievement_type || null]
        );

        res.json({ achievement: result.rows[0] });
    } catch (err) {
        console.error("ADD ACHIEVEMENT ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete achievement
exports.deleteAchievement = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const schoolRes = await pool.query(
            "SELECT id FROM schools WHERE user_id = $1",
            [userId]
        );

        if (!schoolRes.rows.length) {
            return res.status(404).json({ message: "School not found" });
        }

        const schoolId = schoolRes.rows[0].id;

        await pool.query(
            "DELETE FROM school_achievements WHERE id = $1 AND school_id = $2",
            [id, schoolId]
        );

        res.json({ message: "Achievement deleted" });
    } catch (err) {
        console.error("DELETE ACHIEVEMENT ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Add result
exports.addResult = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            academic_year,
            grade_level,
            pass_percentage,
            distinction_count,
            first_class_count,
        } = req.body;

        if (!academic_year || !grade_level) {
            return res.status(400).json({ message: "Academic year and grade level are required" });
        }

        const schoolRes = await pool.query(
            "SELECT id FROM schools WHERE user_id = $1",
            [userId]
        );

        if (!schoolRes.rows.length) {
            return res.status(404).json({ message: "School not found" });
        }

        const schoolId = schoolRes.rows[0].id;

        const result = await pool.query(
            "INSERT INTO school_results (school_id, academic_year, grade_level, pass_percentage, distinction_count, first_class_count) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [
                schoolId,
                academic_year,
                grade_level,
                pass_percentage || null,
                distinction_count || null,
                first_class_count || null,
            ]
        );

        res.json({ result: result.rows[0] });
    } catch (err) {
        console.error("ADD RESULT ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete result
exports.deleteResult = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const schoolRes = await pool.query(
            "SELECT id FROM schools WHERE user_id = $1",
            [userId]
        );

        if (!schoolRes.rows.length) {
            return res.status(404).json({ message: "School not found" });
        }

        const schoolId = schoolRes.rows[0].id;

        await pool.query(
            "DELETE FROM school_results WHERE id = $1 AND school_id = $2",
            [id, schoolId]
        );

        res.json({ message: "Result deleted" });
    } catch (err) {
        console.error("DELETE RESULT ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};
