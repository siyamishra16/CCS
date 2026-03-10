const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const pool = require("../db");
const { imageUpload } = require("../middleware/upload");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinaryUpload");

const ensureDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};

// Generate a unique 6-digit referral code and ensure no collisions
const generateReferralCode = async () => {
    const makeCode = () => Math.floor(100000 + Math.random() * 900000).toString();
    let code = makeCode();
    let attempts = 0;
    while (attempts < 5) {
        const existing = await pool.query("SELECT 1 FROM universities WHERE referral_code = $1", [code]);
        if (existing.rowCount === 0) return code;
        code = makeCode();
        attempts += 1;
    }
    return `${makeCode()}${Math.floor(Math.random() * 10)}`.slice(0, 6);
};

exports.getUniversity = async (req, res) => {
    try {
        const userId = req.userId;

        const universityResult = await pool.query(
            "SELECT * FROM universities WHERE user_id = $1",
            [userId]
        );

        const universityId = universityResult.rows[0]?.id || null;

        const degrees = universityId
            ? (await pool.query(
                  "SELECT * FROM university_degrees WHERE university_id = $1 ORDER BY id DESC",
                  [universityId]
              )).rows
            : [];

        const placements = universityId
            ? (await pool.query(
                  "SELECT * FROM university_placements WHERE university_id = $1 ORDER BY academic_year DESC",
                  [universityId]
              )).rows
            : [];

        const rankings = universityId
            ? (await pool.query(
                  "SELECT * FROM university_rankings WHERE university_id = $1 ORDER BY year DESC NULLS LAST",
                  [universityId]
              )).rows
            : [];

        res.json({
            university: universityResult.rows[0] || null,
            degrees,
            placements,
            rankings,
        });
    } catch (err) {
        console.error("GET UNIVERSITY ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateUniversity = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            name,
            established_year,
            university_type,
            accreditation,
            state,
            city,
            zipcode,
            address,
            phone,
            email,
            website_url,
            vice_chancellor_name,
            vice_chancellor_email,
            vice_chancellor_phone,
            total_students,
            total_faculty,
            campus_area,
        } = req.body;

        if (!name) {
            return res.status(400).json({ message: "University name is required" });
        }

        // Check if university exists for referral code
        const existing = await pool.query(
            "SELECT referral_code FROM universities WHERE user_id = $1",
            [userId]
        );

        let referralCode = existing.rows[0]?.referral_code;
        if (!referralCode) {
            referralCode = await generateReferralCode();
        }

        const result = await pool.query(
            `INSERT INTO universities (
                user_id, name, established_year, university_type, accreditation,
                state, city, zipcode, address, phone, email, website_url,
                vice_chancellor_name, vice_chancellor_email, vice_chancellor_phone,
                total_students, total_faculty, campus_area, referral_code, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                name = EXCLUDED.name,
                established_year = EXCLUDED.established_year,
                university_type = EXCLUDED.university_type,
                accreditation = EXCLUDED.accreditation,
                state = EXCLUDED.state,
                city = EXCLUDED.city,
                zipcode = EXCLUDED.zipcode,
                address = EXCLUDED.address,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                website_url = EXCLUDED.website_url,
                vice_chancellor_name = EXCLUDED.vice_chancellor_name,
                vice_chancellor_email = EXCLUDED.vice_chancellor_email,
                vice_chancellor_phone = EXCLUDED.vice_chancellor_phone,
                total_students = EXCLUDED.total_students,
                total_faculty = EXCLUDED.total_faculty,
                campus_area = EXCLUDED.campus_area,
                updated_at = NOW()
            RETURNING *`,
            [
                userId,
                name,
                established_year || null,
                university_type || null,
                accreditation || null,
                state || null,
                city || null,
                zipcode || null,
                address || null,
                phone || null,
                email || null,
                website_url || null,
                vice_chancellor_name || null,
                vice_chancellor_email || null,
                vice_chancellor_phone || null,
                total_students || null,
                total_faculty || null,
                campus_area || null,
                referralCode,
            ]
        );

        res.json({ university: result.rows[0] });
    } catch (err) {
        console.error("UPDATE UNIVERSITY ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Upload university media (logo and banner) to Cloudinary
exports.uploadUniversityMedia = [
    imageUpload.fields([
        { name: "logoImage", maxCount: 1 },
        { name: "bannerImage", maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const userId = req.userId;

            const universityRes = await pool.query(
                "SELECT id, logo_url, banner_url FROM universities WHERE user_id = $1",
                [userId]
            );

            if (!universityRes.rows.length) {
                return res.status(404).json({ message: "University profile not found" });
            }

            const university = universityRes.rows[0];
            const logoFile = req.files?.logoImage?.[0];
            const bannerFile = req.files?.bannerImage?.[0];

            let logoUrl = null;
            let bannerUrl = null;

            if (logoFile) {
                if (university.logo_url) {
                    const oldPublicId = extractPublicId(university.logo_url);
                    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
                }
                const result = await uploadToCloudinary(logoFile.buffer, "university", "logo");
                logoUrl = result.secure_url;
            }

            if (bannerFile) {
                if (university.banner_url) {
                    const oldPublicId = extractPublicId(university.banner_url);
                    if (oldPublicId) await deleteFromCloudinary(oldPublicId);
                }
                const result = await uploadToCloudinary(bannerFile.buffer, "university", "banner");
                bannerUrl = result.secure_url;
            }

            const updateRes = await pool.query(
                `UPDATE universities
                SET
                    logo_url = COALESCE($1, logo_url),
                    banner_url = COALESCE($2, banner_url),
                    updated_at = NOW()
                WHERE id = $3
                RETURNING *`,
                [logoUrl, bannerUrl, university.id]
            );

            res.json({ 
                message: "Media uploaded successfully to Cloudinary",
                university: updateRes.rows[0] 
            });
        } catch (err) {
            console.error("UPLOAD UNIVERSITY MEDIA ERROR:", err.message);
            res.status(500).json({ message: "Server error: " + err.message });
        }
    },
];

const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const publicId = parts.slice(parts.indexOf('ccs')).join('/').replace(/\.[^/.]+$/, '');
    return publicId;
};

exports.clearUniversityMedia = async (req, res) => {
    try {
        const userId = req.userId;
        const universityResult = await pool.query("SELECT id FROM universities WHERE user_id = $1", [userId]);
        const universityId = universityResult.rows[0]?.id;
        if (!universityId) return res.status(400).json({ message: "No university profile" });

        await pool.query(
            "UPDATE universities SET logo_url = NULL, banner_url = NULL, updated_at = NOW() WHERE id = $1",
            [universityId]
        );

        res.json({ message: "Media cleared" });
    } catch (err) {
        console.error("CLEAR UNIVERSITY MEDIA ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.generateQRCode = async (req, res) => {
    try {
        const userId = req.userId;

        const universityResult = await pool.query(
            "SELECT id, name, referral_code FROM universities WHERE user_id = $1",
            [userId]
        );

        if (!universityResult.rows.length) {
            return res.status(404).json({ message: "University profile not found" });
        }

        const universityId = universityResult.rows[0].id;
        const universityName = universityResult.rows[0].name || "University";
        let referralCode = universityResult.rows[0].referral_code;

        if (!referralCode) {
            referralCode = await generateReferralCode();
            await pool.query(
                "UPDATE universities SET referral_code = $1, updated_at = NOW() WHERE id = $2",
                [referralCode, universityId]
            );
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
        const registrationURL = `${FRONTEND_URL}/register?referralCode=${referralCode}`;

        const qrCodeDataURL = await QRCode.toDataURL(registrationURL, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 2,
        });

        res.json({
            qrCode: qrCodeDataURL,
            referralCode,
            registrationURL,
            universityName,
        });
    } catch (err) {
        console.error("GENERATE UNIVERSITY QR CODE ERROR:", err.message);
        res.status(500).json({ message: "Failed to generate QR code" });
    }
};

// DEGREE CRUD
exports.addDegree = async (req, res) => {
    try {
        const userId = req.userId;
        const { degree_name } = req.body;

        if (!degree_name) {
            return res.status(400).json({ message: "Degree name is required" });
        }

        const universityRes = await pool.query(
            "SELECT id FROM universities WHERE user_id = $1",
            [userId]
        );

        if (!universityRes.rows.length) {
            return res.status(404).json({ message: "University not found" });
        }

        const universityId = universityRes.rows[0].id;

        const result = await pool.query(
            "INSERT INTO university_degrees (university_id, degree_name) VALUES ($1, $2) RETURNING *",
            [universityId, degree_name]
        );

        res.json({ degree: result.rows[0] });
    } catch (err) {
        console.error("ADD DEGREE ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteDegree = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const universityRes = await pool.query(
            "SELECT id FROM universities WHERE user_id = $1",
            [userId]
        );

        if (!universityRes.rows.length) {
            return res.status(404).json({ message: "University not found" });
        }

        const universityId = universityRes.rows[0].id;

        await pool.query(
            "DELETE FROM university_degrees WHERE id = $1 AND university_id = $2",
            [id, universityId]
        );

        res.json({ message: "Degree deleted" });
    } catch (err) {
        console.error("DELETE DEGREE ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// PLACEMENT CRUD
exports.addPlacement = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            academic_year,
            placement_percent,
            average_package,
            highest_package,
            companies_visited,
            top_recruiters,
        } = req.body;

        const universityRes = await pool.query(
            "SELECT id FROM universities WHERE user_id = $1",
            [userId]
        );

        if (!universityRes.rows.length) {
            return res.status(404).json({ message: "University not found" });
        }

        const universityId = universityRes.rows[0].id;

        const result = await pool.query(
            "INSERT INTO university_placements (university_id, academic_year, placement_percent, average_package, highest_package, companies_visited, top_recruiters) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [
                universityId,
                academic_year,
                placement_percent || null,
                average_package || null,
                highest_package || null,
                companies_visited || null,
                top_recruiters || null,
            ]
        );

        res.json({ placement: result.rows[0] });
    } catch (err) {
        console.error("ADD PLACEMENT ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deletePlacement = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const universityRes = await pool.query(
            "SELECT id FROM universities WHERE user_id = $1",
            [userId]
        );

        if (!universityRes.rows.length) {
            return res.status(404).json({ message: "University not found" });
        }

        const universityId = universityRes.rows[0].id;

        await pool.query(
            "DELETE FROM university_placements WHERE id = $1 AND university_id = $2",
            [id, universityId]
        );

        res.json({ message: "Placement deleted" });
    } catch (err) {
        console.error("DELETE PLACEMENT ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

// RANKING CRUD
exports.addRanking = async (req, res) => {
    try {
        const userId = req.userId;
        const { ranking_body, rank_value, year, category, certificate_url } = req.body;

        if (!ranking_body) {
            return res.status(400).json({ message: "Ranking body is required" });
        }

        const universityRes = await pool.query(
            "SELECT id FROM universities WHERE user_id = $1",
            [userId]
        );

        if (!universityRes.rows.length) {
            return res.status(404).json({ message: "University not found" });
        }

        const universityId = universityRes.rows[0].id;

        const result = await pool.query(
            "INSERT INTO university_rankings (university_id, ranking_body, rank_value, year, category, certificate_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [universityId, ranking_body, rank_value || null, year || null, category || null, certificate_url || null]
        );

        res.json({ ranking: result.rows[0] });
    } catch (err) {
        console.error("ADD RANKING ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteRanking = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const universityRes = await pool.query(
            "SELECT id FROM universities WHERE user_id = $1",
            [userId]
        );

        if (!universityRes.rows.length) {
            return res.status(404).json({ message: "University not found" });
        }

        const universityId = universityRes.rows[0].id;

        await pool.query(
            "DELETE FROM university_rankings WHERE id = $1 AND university_id = $2",
            [id, universityId]
        );

        res.json({ message: "Ranking deleted" });
    } catch (err) {
        console.error("DELETE RANKING ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};
