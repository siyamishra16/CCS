// const pool = require("../db");
// const path = require("path");
// const fs = require("fs");
// const { imageUpload } = require("../middleware/upload");
// const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinaryUpload");

// const ensureDir = async (dirPath) => {
//     await fs.promises.mkdir(dirPath, { recursive: true });
// };

// exports.uploadCompanyMedia = [
//     imageUpload.fields([
//         { name: "logoImage", maxCount: 1 },
//         { name: "bannerImage", maxCount: 1 },
//     ]),
//     async (req, res) => {
//         try {
//             const userId = req.userId;

//             const companyRes = await pool.query(
//                 "SELECT id, logo_url, banner_url FROM companies WHERE user_id = $1",
//                 [userId]
//             );

//             if (!companyRes.rows.length) {
//                 return res.status(404).json({ message: "Company profile not found" });
//             }

//             const company = companyRes.rows[0];
//             const logoFile = req.files?.logoImage?.[0];
//             const bannerFile = req.files?.bannerImage?.[0];

//             let logoUrl = null;
//             let bannerUrl = null;

//             /* LOGO - Upload to Cloudinary */
//             if (logoFile) {
//                 // Delete old logo if exists
//                 if (company.logo_url) {
//                     const oldPublicId = extractPublicId(company.logo_url);
//                     if (oldPublicId) await deleteFromCloudinary(oldPublicId);
//                 }

//                 const result = await uploadToCloudinary(logoFile.buffer, "company", "logo");
//                 logoUrl = result.secure_url;
//             }

//             /* BANNER - Upload to Cloudinary */
//             if (bannerFile) {
//                 // Delete old banner if exists
//                 if (company.banner_url) {
//                     const oldPublicId = extractPublicId(company.banner_url);
//                     if (oldPublicId) await deleteFromCloudinary(oldPublicId);
//                 }

//                 const result = await uploadToCloudinary(bannerFile.buffer, "company", "banner");
//                 bannerUrl = result.secure_url;
//             }

//             const updateRes = await pool.query(
//                 `UPDATE companies
//                 SET
//                     logo_url = COALESCE($1, logo_url),
//                     banner_url = COALESCE($2, banner_url),
//                     updated_at = NOW()
//                 WHERE id = $3
//                 RETURNING *`,
//                 [logoUrl, bannerUrl, company.id]
//             );

//             res.json({ 
//                 message: "Media uploaded successfully to Cloudinary",
//                 company: updateRes.rows[0] 
//             });
//         } catch (err) {
//             console.error("UPLOAD COMPANY MEDIA ERROR:", err.message);
//             res.status(500).json({ message: "Server error: " + err.message });
//         }
//     },
// ];

// // Helper function to extract public_id from Cloudinary URL
// const extractPublicId = (url) => {
//     if (!url) return null;
//     const parts = url.split('/');
//     const publicId = parts.slice(parts.indexOf('ccs')).join('/').replace(/\.[^/.]+$/, '');
//     return publicId;
// };

// exports.saveCompany = async (req, res) => {
//     try {
//         const userId = req.userId;

//         const {
//             name,
//             industry,
//             company_type,
//             founded_year,
//             description,
//             headquarters,
//             state,
//             city,
//             address,
//             zipcode,
//             hr_email,
//             phone,
//             website
//         } = req.body;

//         if (!name) {
//             return res.status(400).json({ message: "Company name is required" });
//         }

//         const result = await pool.query(
//             `
//             INSERT INTO companies (
//                 user_id, name, industry, company_type,
//                 founded_year, description, headquarters,
//                 state, city, address, zipcode,
//                 hr_email, phone, website
//             )
//             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
//             ON CONFLICT (user_id)
//             DO UPDATE SET
//                 name=$2,
//                 industry=$3,
//                 company_type=$4,
//                 founded_year=$5,
//                 description=$6,
//                 headquarters=$7,
//                 state=$8,
//                 city=$9,
//                 address=$10,
//                 zipcode=$11,
//                 hr_email=$12,
//                 phone=$13,
//                 website=$14,
//                 updated_at=NOW()
//             RETURNING *
//             `,
//             [
//                 userId,
//                 name,
//                 industry,
//                 company_type,
//                 founded_year || null,
//                 description,
//                 headquarters,
//                 state,
//                 city,
//                 address,
//                 zipcode,
//                 hr_email,
//                 phone,
//                 website
//             ]
//         );

//         res.json({
//             message: "Company profile saved",
//             company: result.rows[0],
//         });
//     } catch (err) {
//         console.error("SAVE COMPANY ERROR:", err.message);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.getCompany = async (req, res) => {
//     try {
//         const userId = req.userId;

//         const companyRes = await pool.query(
//             "SELECT * FROM companies WHERE user_id = $1",
//             [userId]
//         );

//         if (!companyRes.rows.length) {
//             return res.json({ company: null });
//         }

//         const company = companyRes.rows[0];

//         const socialRes = await pool.query(
//             "SELECT * FROM company_social_links WHERE company_id = $1",
//             [company.id]
//         );

//         res.json({
//             company,
//             social_links: socialRes.rows[0] || null,
//         });
//     } catch (err) {
//         console.error("GET COMPANY ERROR:", err.message);
//         res.status(500).json({ message: "Server error" });
//     }
// };
// exports.saveCompanySocialLinks = async (req, res) => {
//     try {
//         const userId = req.userId;
//         const {
//             linkedin,
//             instagram,
//             facebook,
//             twitter,
//             youtube,
//             pinterest
//         } = req.body;

//         const companyRes = await pool.query(
//             "SELECT id FROM companies WHERE user_id = $1",
//             [userId]
//         );

//         if (!companyRes.rows.length) {
//             return res.status(404).json({ message: "Company profile not found" });
//         }

//         const companyId = companyRes.rows[0].id;

//         const existingRes = await pool.query(
//             "SELECT id FROM company_social_links WHERE company_id = $1",
//             [companyId]
//         );

//         let result;
//         let action = "saved";

//         if (existingRes.rows.length) {
//             result = await pool.query(
//                 `
//                 UPDATE company_social_links
//                 SET
//                     linkedin=$1,
//                     instagram=$2,
//                     facebook=$3,
//                     twitter=$4,
//                     youtube=$5,
//                     pinterest=$6,
//                     updated_at=NOW()
//                 WHERE company_id=$7
//                 RETURNING *
//                 `,
//                 [
//                     linkedin,
//                     instagram,
//                     facebook,
//                     twitter,
//                     youtube,
//                     pinterest,
//                     companyId
//                 ]
//             );
//             action = "updated";
//         } else {
//             result = await pool.query(
//                 `
//                 INSERT INTO company_social_links (
//                     company_id,
//                     linkedin,
//                     instagram,
//                     facebook,
//                     twitter,
//                     youtube,
//                     pinterest
//                 )
//                 VALUES ($1,$2,$3,$4,$5,$6,$7)
//                 RETURNING *
//                 `,
//                 [
//                     companyId,
//                     linkedin,
//                     instagram,
//                     facebook,
//                     twitter,
//                     youtube,
//                     pinterest
//                 ]
//             );
//         }

//         res.json({
//             message: `Social links ${action} successfully`,
//             social_links: result.rows[0],
//         });
//     } catch (err) {
//         console.error("SAVE SOCIAL LINKS ERROR:", err.message);
//         res.status(500).json({ message: "Server error" });
//     }
// };
// exports.clearCompanyMedia = async (req, res) => {
//     try {
//         const userId = req.userId;

//         // Optional query param `type` can be 'logo' or 'banner' to clear only that image.
//         const { type } = req.query || {};

//         // First fetch existing urls so we can delete files from disk
//         const existingRes = await pool.query(
//             `SELECT logo_url, banner_url FROM companies WHERE user_id = $1`,
//             [userId]
//         );
//         if (!existingRes.rows.length) return res.status(404).json({ message: 'Company not found' });

//         const { logo_url: currentLogo, banner_url: currentBanner } = existingRes.rows[0];

//         let query, params;

//         if (type === 'logo') {
//             query = `
//                 UPDATE companies
//                 SET logo_url = NULL,
//                     updated_at = NOW()
//                 WHERE user_id = $1
//                 RETURNING *
//             `;
//             params = [userId];
//         } else if (type === 'banner') {
//             query = `
//                 UPDATE companies
//                 SET banner_url = NULL,
//                     updated_at = NOW()
//                 WHERE user_id = $1
//                 RETURNING *
//             `;
//             params = [userId];
//         } else {
//             query = `
//                 UPDATE companies
//                 SET logo_url = NULL,
//                     banner_url = NULL,
//                     updated_at = NOW()
//                 WHERE user_id = $1
//                 RETURNING *
//             `;
//             params = [userId];
//         }

//         const result = await pool.query(query, params);

//         // Delete files from disk for the cleared types
//         const tryUnlink = async (url) => {
//             if (!url) return;
//             try {
//                 // remove leading slash if present
//                 const rel = url.replace(/^\//, "");
//                 const filePath = path.join(__dirname, '..', rel);
//                 await fs.promises.unlink(filePath).catch(() => { });
//             } catch (e) {
//                 console.error('Failed to unlink file', url, e.message);
//             }
//         };

//         if (type === 'logo') {
//             await tryUnlink(currentLogo);
//         } else if (type === 'banner') {
//             await tryUnlink(currentBanner);
//         } else {
//             await tryUnlink(currentLogo);
//             await tryUnlink(currentBanner);
//         }

//         res.json({ company: result.rows[0] });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Failed to clear images" });
//     }
// };
// exports.saveCompanyPost = async (req, res) => {
//     try {
//         const userId = req.userId;
//         const job = req.body;

//         /* ================= GET COMPANY ================= */
//         const companyRes = await pool.query(
//             "SELECT id FROM companies WHERE user_id = $1",
//             [userId]
//         );

//         if (!companyRes.rows.length) {
//             return res.status(404).json({ message: "Company profile not found" });
//         }

//         const companyId = companyRes.rows[0].id;

//         /* ================= INSERT JOB ================= */
//         const jobRes = await pool.query(
//             `
//             INSERT INTO company_jobs (
//                 company_id,
//                 title,
//                 location_type,
//                 location,
//                 must_reside,
//                 timeline,
//                 hiring_count,
//                 pay_show_by,
//                 pay_min,
//                 pay_max,
//                 pay_rate,
//                 description,
//                 education,
//                 experience_years,
//                 experience_type,
//                 certifications,
//                 location_qual,
//                 travel,
//                 custom_benefits,
//                 status
//             )
//             VALUES (
//                 $1,$2,$3,$4,$5,
//                 $6,$7,
//                 $8,$9,$10,$11,
//                 $12,$13,$14,$15,
//                 $16,$17,$18,
//                 $19,$20
//             )
//             RETURNING *
//             `,
//             [
//                 companyId,
//                 job.title,
//                 job.location_type,
//                 job.location,
//                 job.must_reside === "yes",
//                 job.timeline,
//                 job.hiring_count,
//                 job.pay_show_by,
//                 job.pay_min || null,
//                 job.pay_max || null,
//                 job.pay_rate,
//                 job.description,
//                 job.education,
//                 job.experience_years || null,
//                 job.experience_type,
//                 job.certifications,
//                 job.location_qual,
//                 job.travel,
//                 job.custom_benefits,
//                 job.status || "draft"
//             ]
//         );

//         const jobId = jobRes.rows[0].id;

//         /* ================= HELPERS ================= */
//         const insertMany = async (table, field, values) => {
//             if (!values || !values.length) return;
//             const q = values.map((_, i) => `($1,$${i + 2})`).join(",");
//             await pool.query(
//                 `INSERT INTO ${table} (job_id, ${field}) VALUES ${q}`,
//                 [jobId, ...values]
//             );
//         };

//         /* ================= CHILD TABLES ================= */
//         await insertMany("company_job_types", "type", job.job_types);
//         await insertMany("company_job_benefits", "benefit", job.selected_benefits);
//         await insertMany("company_job_languages", "language", job.language);
//         await insertMany("company_job_shifts", "shift", job.shift);

//         /* ================= CUSTOM QUESTIONS ================= */
//         if (job.custom_questions?.length) {
//             for (const q of job.custom_questions) {
//                 await pool.query(
//                     `
//                     INSERT INTO company_job_questions (job_id, question, is_required)
//                     VALUES ($1,$2,$3)
//                     `,
//                     [jobId, q.text, q.required]
//                 );
//             }
//         }

//         res.json({
//             message: "Job post saved successfully",
//             job: jobRes.rows[0],
//         });

//     } catch (err) {
//         console.error("SAVE COMPANY POST ERROR:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.getCompanyPosts = async (req, res) => {
//     try {
//         const userId = req.userId;

//         const jobsRes = await pool.query(
//             `
//             SELECT j.*
//             FROM company_jobs j
//             JOIN companies c ON c.id = j.company_id
//             WHERE c.user_id = $1
//             ORDER BY j.created_at DESC
//             `,
//             [userId]
//         );

//         res.json({ jobs: jobsRes.rows });
//     } catch (err) {
//         console.error("GET COMPANY POSTS ERROR:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.getCompanyPostById = async (req, res) => {
//     try {
//         const userId = req.userId;
//         const { postId } = req.params;

//         const jobRes = await pool.query(
//             `
//             SELECT j.*
//             FROM company_jobs j
//             JOIN companies c ON c.id = j.company_id
//             WHERE j.id = $1 AND c.user_id = $2
//             `,
//             [postId, userId]
//         );

//         if (!jobRes.rows.length) {
//             return res.status(404).json({ message: "Job post not found" });
//         }

//         res.json({ job: jobRes.rows[0] });
//     } catch (err) {
//         console.error("GET COMPANY POST ERROR:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.deleteCompanyPost = async (req, res) => {
//     try {
//         const userId = req.userId;
//         const { postId } = req.params;

//         const result = await pool.query(
//             `
//             DELETE FROM company_jobs j
//             USING companies c
//             WHERE j.company_id = c.id
//               AND j.id = $1
//               AND c.user_id = $2
//             RETURNING j.*
//             `,
//             [postId, userId]
//         );

//         if (!result.rows.length) {
//             return res.status(404).json({ message: "Job post not found" });
//         }

//         res.json({ message: "Job post deleted successfully" });
//     } catch (err) {
//         console.error("DELETE COMPANY POST ERROR:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };



const pool = require("../db");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { sendJobLiveEmail } = require("../utils/sendEmail");

const ensureDir = async (dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
};
exports.uploadCompanyMedia = async (req, res) => {
    try {
        const userId = req.userId;

        const companyRes = await pool.query(
            "SELECT id FROM companies WHERE user_id = $1",
            [userId]
        );

        if (!companyRes.rows.length) {
            return res.status(404).json({ message: "Company profile not found" });
        }

        const companyId = companyRes.rows[0].id;

        let logoUrl = null;
        let bannerUrl = null;

        const uploadDir = path.join(__dirname, "../uploads/company");
        await ensureDir(uploadDir);

        /* LOGO */
        if (req.files?.logoImage) {
            const logoFile = req.files.logoImage[0];
            const logoName = `logo_${companyId}_${Date.now()}.webp`;
            const logoPath = path.join(uploadDir, logoName);

            await sharp(logoFile.buffer)
                .resize(300, 300)
                .webp({ quality: 80 })
                .toFile(logoPath);

            logoUrl = `/uploads/company/${logoName}`;
        }

        /* BANNER */
        if (req.files?.bannerImage) {
            const bannerFile = req.files.bannerImage[0];
            const bannerName = `banner_${companyId}_${Date.now()}.webp`;
            const bannerPath = path.join(uploadDir, bannerName);

            await sharp(bannerFile.buffer)
                .resize(1200, 400)
                .webp({ quality: 80 })
                .toFile(bannerPath);

            bannerUrl = `/uploads/company/${bannerName}`;
        }

        const updateRes = await pool.query(
            `
            UPDATE companies
            SET
                logo_url = COALESCE($1, logo_url),
                banner_url = COALESCE($2, banner_url),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [logoUrl, bannerUrl, companyId]
        );

        res.json({ company: updateRes.rows[0] });
    } catch (err) {
        console.error("UPLOAD COMPANY MEDIA ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.saveCompany = async (req, res) => {
    try {
        const userId = req.userId;

        const {
            name,
            industry,
            company_type,
            founded_year,
            description,
            headquarters,
            state,
            city,
            address,
            zipcode,
            hr_email,
            phone,
            website
        } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Company name is required" });
        }

        const result = await pool.query(
            `
            INSERT INTO companies (
                user_id, name, industry, company_type,
                founded_year, description, headquarters,
                state, city, address, zipcode,
                hr_email, phone, website
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            ON CONFLICT (user_id)
            DO UPDATE SET
                name=$2,
                industry=$3,
                company_type=$4,
                founded_year=$5,
                description=$6,
                headquarters=$7,
                state=$8,
                city=$9,
                address=$10,
                zipcode=$11,
                hr_email=$12,
                phone=$13,
                website=$14,
                updated_at=NOW()
            RETURNING *
            `,
            [
                userId,
                name,
                industry,
                company_type,
                founded_year || null,
                description,
                headquarters,
                state,
                city,
                address,
                zipcode,
                hr_email,
                phone,
                website
            ]
        );

        res.json({
            message: "Company profile saved",
            company: result.rows[0],
        });
    } catch (err) {
        console.error("SAVE COMPANY ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getCompany = async (req, res) => {
    try {
        const userId = req.userId;

        const companyRes = await pool.query(
            "SELECT * FROM companies WHERE user_id = $1",
            [userId]
        );

        if (!companyRes.rows.length) {
            return res.json({ company: null });
        }

        const company = companyRes.rows[0];

        const socialRes = await pool.query(
            "SELECT * FROM company_social_links WHERE company_id = $1",
            [company.id]
        );

        res.json({
            company,
            social_links: socialRes.rows[0] || null,
        });
    } catch (err) {
        console.error("GET COMPANY ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.saveCompanySocialLinks = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            linkedin,
            instagram,
            facebook,
            twitter,
            youtube,
            pinterest
        } = req.body;

        const companyRes = await pool.query(
            "SELECT id FROM companies WHERE user_id = $1",
            [userId]
        );

        if (!companyRes.rows.length) {
            return res.status(404).json({ message: "Company profile not found" });
        }

        const companyId = companyRes.rows[0].id;

        const existingRes = await pool.query(
            "SELECT id FROM company_social_links WHERE company_id = $1",
            [companyId]
        );

        let result;
        let action = "saved";

        if (existingRes.rows.length) {
            result = await pool.query(
                `
                UPDATE company_social_links
                SET
                    linkedin=$1,
                    instagram=$2,
                    facebook=$3,
                    twitter=$4,
                    youtube=$5,
                    pinterest=$6,
                    updated_at=NOW()
                WHERE company_id=$7
                RETURNING *
                `,
                [
                    linkedin,
                    instagram,
                    facebook,
                    twitter,
                    youtube,
                    pinterest,
                    companyId
                ]
            );
            action = "updated";
        } else {
            result = await pool.query(
                `
                INSERT INTO company_social_links (
                    company_id,
                    linkedin,
                    instagram,
                    facebook,
                    twitter,
                    youtube,
                    pinterest
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                RETURNING *
                `,
                [
                    companyId,
                    linkedin,
                    instagram,
                    facebook,
                    twitter,
                    youtube,
                    pinterest
                ]
            );
        }

        res.json({
            message: `Social links ${action} successfully`,
            social_links: result.rows[0],
        });
    } catch (err) {
        console.error("SAVE SOCIAL LINKS ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};
exports.clearCompanyMedia = async (req, res) => {
    try {
        const userId = req.userId;

        // Optional query param `type` can be 'logo' or 'banner' to clear only that image.
        const { type } = req.query || {};

        // First fetch existing urls so we can delete files from disk
        const existingRes = await pool.query(
            `SELECT logo_url, banner_url FROM companies WHERE user_id = $1`,
            [userId]
        );
        if (!existingRes.rows.length) return res.status(404).json({ message: 'Company not found' });

        const { logo_url: currentLogo, banner_url: currentBanner } = existingRes.rows[0];

        let query, params;

        if (type === 'logo') {
            query = `
                UPDATE companies
                SET logo_url = NULL,
                    updated_at = NOW()
                WHERE user_id = $1
                RETURNING *
            `;
            params = [userId];
        } else if (type === 'banner') {
            query = `
                UPDATE companies
                SET banner_url = NULL,
                    updated_at = NOW()
                WHERE user_id = $1
                RETURNING *
            `;
            params = [userId];
        } else {
            query = `
                UPDATE companies
                SET logo_url = NULL,
                    banner_url = NULL,
                    updated_at = NOW()
                WHERE user_id = $1
                RETURNING *
            `;
            params = [userId];
        }

        const result = await pool.query(query, params);

        // Delete files from disk for the cleared types
        const tryUnlink = async (url) => {
            if (!url) return;
            try {
                // remove leading slash if present
                const rel = url.replace(/^\//, "");
                const filePath = path.join(__dirname, '..', rel);
                await fs.promises.unlink(filePath).catch(() => { });
            } catch (e) {
                console.error('Failed to unlink file', url, e.message);
            }
        };

        if (type === 'logo') {
            await tryUnlink(currentLogo);
        } else if (type === 'banner') {
            await tryUnlink(currentBanner);
        } else {
            await tryUnlink(currentLogo);
            await tryUnlink(currentBanner);
        }

        res.json({ company: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to clear images" });
    }
};
exports.saveCompanyPost = async (req, res) => {
    try {
        const userId = req.userId;
        const job = req.body;

        /* ================= GET COMPANY ================= */
        const companyRes = await pool.query(
            `SELECT c.id, c.name, c.hr_email, u.email as user_email
             FROM companies c
             JOIN users u ON u.id = c.user_id
             WHERE c.user_id = $1`,
            [userId]
        );

        if (!companyRes.rows.length) {
            return res.status(404).json({ message: "Company profile not found" });
        }

        const company = companyRes.rows[0];
        const companyId = company.id;
        // Use hr_email if available, otherwise fallback to user's email
        const recipientEmail = company.hr_email || company.user_email;

        /* ================= INSERT JOB ================= */
        const jobRes = await pool.query(
            `
            INSERT INTO company_jobs (
                company_id,
                title,
                location_type,
                location,
                must_reside,
                timeline,
                hiring_count,
                pay_show_by,
                pay_min,
                pay_max,
                pay_rate,
                description,
                education,
                experience_years,
                experience_type,
                certifications,
                location_qual,
                travel,
                custom_benefits,
                status
            )
            VALUES (
                $1,$2,$3,$4,$5,
                $6,$7,
                $8,$9,$10,$11,
                $12,$13,$14,$15,
                $16,$17,$18,
                $19,$20
            )
            RETURNING *
            `,
            [
                companyId,
                job.title,
                job.location_type,
                job.location,
                job.must_reside === "yes",
                job.timeline,
                job.hiring_count,
                job.pay_show_by,
                job.pay_min || null,
                job.pay_max || null,
                job.pay_rate,
                job.description,
                job.education,
                job.experience_years || null,
                job.experience_type,
                job.certifications,
                job.location_qual,
                job.travel,
                job.custom_benefits,
                job.status || "draft"
            ]
        );

        const jobId = jobRes.rows[0].id;

        /* ================= HELPERS ================= */
        const insertMany = async (table, field, values) => {
            if (!values || !values.length) return;
            const q = values.map((_, i) => `($1,$${i + 2})`).join(",");
            await pool.query(
                `INSERT INTO ${table} (job_id, ${field}) VALUES ${q}`,
                [jobId, ...values]
            );
        };

        /* ================= CHILD TABLES ================= */
        await insertMany("company_job_types", "type", job.job_types);
        await insertMany("company_job_benefits", "benefit", job.selected_benefits);
        await insertMany("company_job_languages", "language", job.language);
        await insertMany("company_job_shifts", "shift", job.shift);

        /* ================= CUSTOM QUESTIONS ================= */
        if (job.custom_questions?.length) {
            for (const q of job.custom_questions) {
                await pool.query(
                    `
                    INSERT INTO company_job_questions (job_id, question, is_required)
                    VALUES ($1,$2,$3)
                    `,
                    [jobId, q.text, q.required]
                );
            }
        }

        /* ================= SEND EMAIL ================= */
        console.log("\n📧 Attempting to send job creation email...");
        console.log("Company data:", { id: company.id, name: company.name, hr_email: company.hr_email, user_email: company.user_email, recipientEmail });
        console.log("Job ID:", jobId);
        
        try {
            if (recipientEmail && company.name) {
                const jobDetails = {
                    jobId: jobId,
                    title: job.title,
                    location: job.location || "Not specified",
                    postedDate: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                };
                
                console.log("✅ Sending email to:", recipientEmail);
                await sendJobLiveEmail(recipientEmail, company.name, jobDetails);
            } else {
                console.log("⚠️ Email NOT sent - Missing data:", {
                    hasEmail: !!recipientEmail,
                    hasName: !!company.name
                });
            }
        } catch (emailErr) {
            console.error("❌ Failed to send job creation email:", emailErr.message);
            console.error("Error stack:", emailErr.stack);
            // Don't fail the request if email fails
        }

        res.json({
            message: "Job post saved successfully",
            job: jobRes.rows[0],
        });

    } catch (err) {
        console.error("SAVE COMPANY POST ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getCompanyPosts = async (req, res) => {
    try {
        const userId = req.userId;

        const jobsRes = await pool.query(
            `
            SELECT j.*
            FROM company_jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE c.user_id = $1
            ORDER BY j.created_at DESC
            `,
            [userId]
        );

        res.json({ jobs: jobsRes.rows });
    } catch (err) {
        console.error("GET COMPANY POSTS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getCompanyPostById = async (req, res) => {
    try {
        const userId = req.userId;
        const { postId } = req.params;

        const jobRes = await pool.query(
            `
            SELECT j.*
            FROM company_jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE j.id = $1 AND c.user_id = $2
            `,
            [postId, userId]
        );

        if (!jobRes.rows.length) {
            return res.status(404).json({ message: "Job post not found" });
        }

        res.json({ job: jobRes.rows[0] });
    } catch (err) {
        console.error("GET COMPANY POST ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ✅ NEW: Update job post (including status)
exports.updateCompanyPost = async (req, res) => {
    try {
        const userId = req.userId;
        const { postId } = req.params;
        const { status, ...otherFields } = req.body;

        // Verify the job belongs to this company
        const verifyRes = await pool.query(
            `
            SELECT j.id, j.status as current_status
            FROM company_jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE j.id = $1 AND c.user_id = $2
            `,
            [postId, userId]
        );

        if (!verifyRes.rows.length) {
            return res.status(404).json({ message: "Job post not found" });
        }

        // Validate status if provided
        const validStatuses = ['draft', 'published', 'closed'];
        if (status && !validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Update only the status if that's all that's provided
        if (status && Object.keys(otherFields).length === 0) {
            const updateRes = await pool.query(
                `
                UPDATE company_jobs
                SET status = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [status.toLowerCase(), postId]
            );

            return res.json({
                message: "Job status updated successfully",
                job: updateRes.rows[0],
            });
        }

        // Otherwise update all provided fields
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (status) {
            updateFields.push(`status = $${paramCount++}`);
            updateValues.push(status.toLowerCase());
        }

        // Add other fields as needed
        Object.keys(otherFields).forEach(key => {
            if (key !== 'updated_at') {  // Skip updated_at if it's in the body
                updateFields.push(`${key} = $${paramCount++}`);
                updateValues.push(otherFields[key]);
            }
        });

        // Always update the updated_at timestamp
        updateFields.push('updated_at = NOW()');

        // Add postId for WHERE clause
        updateValues.push(postId);
        const whereParamIndex = paramCount;

        const updateRes = await pool.query(
            `
            UPDATE company_jobs
            SET ${updateFields.join(', ')}
            WHERE id = $${whereParamIndex}
            RETURNING *
            `,
            updateValues
        );

        res.json({
            message: "Job post updated successfully",
            job: updateRes.rows[0],
        });

    } catch (err) {
        console.error("UPDATE COMPANY POST ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteCompanyPost = async (req, res) => {
    try {
        const userId = req.userId;
        const { postId } = req.params;

        const result = await pool.query(
            `
            DELETE FROM company_jobs j
            USING companies c
            WHERE j.company_id = c.id
              AND j.id = $1
              AND c.user_id = $2
            RETURNING j.*
            `,
            [postId, userId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: "Job post not found" });
        }

        res.json({ message: "Job post deleted successfully" });
    } catch (err) {
        console.error("DELETE COMPANY POST ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getJobApplicants = async (req, res) => {
    try {
        const { jobId } = req.params;

        const result = await pool.query(
            `
            SELECT
                ja.id AS application_id,
                ja.status,
                ja.resume_url,
                ja.created_at AS applied_at,

                u.id AS student_id,
                u.name AS student_name,
                u.email AS student_email

            FROM job_applications ja
            JOIN users u ON u.id = ja.student_id
            WHERE ja.job_id = $1
            ORDER BY ja.created_at DESC
            `,
            [jobId]
        );

        res.status(200).json({
            applicants: result.rows
        });
    } catch (err) {
        console.error("GET JOB APPLICANTS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// UPDATE APPLICATION STATUS - Company accepts/rejects student application
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status } = req.body;
        const companyUserId = req.userId;

        // Validate status
        const validStatuses = ['pending', 'accepted', 'rejected'];
        if (!status || !validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: pending, accepted, rejected'
            });
        }

        // Verify the application belongs to a job posted by this company
        const verifyQuery = `
            SELECT 
                ja.id,
                ja.student_id,
                ja.job_id,
                ja.status as current_status,
                cj.title as job_title,
                cj.company_id,
                c.user_id as company_user_id,
                u.name as student_name,
                u.email as student_email
            FROM job_applications ja
            JOIN company_jobs cj ON ja.job_id = cj.id
            JOIN companies c ON cj.company_id = c.id
            JOIN users u ON ja.student_id = u.id
            WHERE ja.id = $1
        `;

        const verifyResult = await pool.query(verifyQuery, [applicationId]);

        if (verifyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const application = verifyResult.rows[0];

        // Check if the company owns this job posting
        if (application.company_user_id !== companyUserId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this application'
            });
        }

        // Update the application status
        const updateQuery = `
            UPDATE job_applications
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, student_id, job_id, status, updated_at
        `;

        const updateResult = await pool.query(updateQuery, [
            status.toLowerCase(),
            applicationId
        ]);

        const updatedApplication = updateResult.rows[0];

        res.status(200).json({
            success: true,
            message: `Application status updated to ${status}`,
            data: {
                applicationId: updatedApplication.id,
                studentId: updatedApplication.student_id,
                jobId: updatedApplication.job_id,
                status: updatedApplication.status,
                updatedAt: updatedApplication.updated_at,
                previousStatus: application.current_status
            }
        });

    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update application status',
            error: error.message
        });
    }
};

// GET APPLICATION STATISTICS FOR A JOB
exports.getJobApplicationStats = async (req, res) => {
    try {
        const { jobId } = req.params;
        const companyUserId = req.userId;

        // Verify the job belongs to this company
        const jobCheckQuery = `
            SELECT cj.id, cj.company_id, c.user_id as company_user_id
            FROM company_jobs cj
            JOIN companies c ON cj.company_id = c.id
            WHERE cj.id = $1
        `;

        const jobCheckResult = await pool.query(jobCheckQuery, [jobId]);

        if (jobCheckResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (jobCheckResult.rows[0].company_user_id !== companyUserId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view stats for this job'
            });
        }

        // Get application statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_applications,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
            FROM job_applications
            WHERE job_id = $1
        `;

        const statsResult = await pool.query(statsQuery, [jobId]);
        const stats = statsResult.rows[0];

        res.status(200).json({
            success: true,
            jobId: jobId,
            stats: {
                total: parseInt(stats.total_applications),
                pending: parseInt(stats.pending_count),
                accepted: parseInt(stats.accepted_count),
                rejected: parseInt(stats.rejected_count)
            }
        });

    } catch (error) {
        console.error('Error fetching application stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch application statistics',
            error: error.message
        });
    }
};
// Fetch complete profile of an applicant (student)
exports.getApplicantProfile = async (req, res) => {
    try {
        const { studentId } = req.params;
        const companyId = req.userId; // Company's user ID from auth middleware

        // Optional: Verify that the company has access to this student's profile
        // (i.e., the student has applied to one of the company's jobs)
        const accessCheck = await pool.query(
            `SELECT ja.id 
             FROM job_applications ja
             JOIN company_jobs cj ON ja.job_id = cj.id
             WHERE ja.student_id = $1 
             AND cj.company_id = (SELECT id FROM companies WHERE user_id = $2)
             LIMIT 1`,
            [studentId, companyId]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You don't have permission to view this profile"
            });
        }

        // Fetch basic user info
        const userResult = await pool.query(
            "SELECT name AS full_name, email FROM users WHERE id = $1",
            [studentId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Fetch profile
        const profileResult = await pool.query(
            "SELECT * FROM profiles WHERE user_id = $1",
            [studentId]
        );

        // Fetch education
        const educationResult = await pool.query(
            "SELECT * FROM education WHERE user_id = $1 ORDER BY start_year DESC",
            [studentId]
        );

        // Fetch experience
        const experienceResult = await pool.query(
            "SELECT * FROM experience WHERE user_id = $1 ORDER BY start_date DESC",
            [studentId]
        );

        // Fetch skills
        const skillsResult = await pool.query(
            `SELECT s.id, s.skill_name
             FROM skills s
             JOIN user_skills us ON s.id = us.skill_id
             WHERE us.user_id = $1`,
            [studentId]
        );

        // Fetch certifications
        const certificationsResult = await pool.query(
            "SELECT * FROM certifications WHERE user_id = $1 ORDER BY issue_date DESC",
            [studentId]
        );

        res.json({
            full_name: userResult.rows[0]?.full_name || null,
            email: userResult.rows[0]?.email || null,
            profile: profileResult.rows[0] || null,
            education: educationResult.rows,
            experience: experienceResult.rows,
            skills: skillsResult.rows,
            certifications: certificationsResult.rows,
        });
    } catch (err) {
        console.error("GET APPLICANT PROFILE ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};
