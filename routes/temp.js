
// const express = require("express");
// const router = express.Router();
// const pool = require("../db");
// const authMiddleware = require("../middleware/authMiddleware");

// // ================================================
// // TEST ROUTE - Remove this after testing
// // ================================================
// router.get("/test", (req, res) => {
//     console.log("✅ Skill test routes are accessible!");
//     res.json({ 
//         message: "Skill test routes working!", 
//         timestamp: new Date().toISOString() 
//     });
// });

// // ================================================
// // GET ALL ACTIVE SKILL TESTS WITH ATTEMPT STATUS
// // ================================================
// router.get("/", authMiddleware, async (req, res) => {
//     try {
//         const userId = req.user.id;
//         console.log("📋 Fetching skill tests for user:", userId);

//         const result = await pool.query(
//             `SELECT 
//                 st.*,
//                 CASE 
//                     WHEN sta.id IS NOT NULL AND sta.status = 'COMPLETED' THEN true
//                     ELSE false
//                 END as has_attempted,
//                 sta.score,
//                 sta.status as attempt_status,
//                 sta.result_status,
//                 sta.submitted_at
//              FROM skill_tests st
//              LEFT JOIN skill_test_attempts sta 
//                 ON st.id = sta.test_id 
//                 AND sta.user_id = $1 
//                 AND sta.status = 'COMPLETED'
//              WHERE st.is_active = true
//              ORDER BY st.created_at DESC`,
//             [userId]
//         );

//         console.log(`✅ Found ${result.rows.length} skill tests`);
//         res.json(result.rows);
//     } catch (err) {
//         console.error("❌ Fetch skill tests error:", err);
//         res.status(500).json({ 
//             message: "Server error", 
//             error: err.message 
//         });
//     }
// });

// // ================================================
// // GET SINGLE SKILL TEST
// // ================================================
// router.get("/:testId", authMiddleware, async (req, res) => {
//     try {
//         const { testId } = req.params;
//         console.log("📋 Fetching skill test:", testId);

//         const result = await pool.query(
//             "SELECT * FROM skill_tests WHERE id = $1 AND is_active = true",
//             [testId]
//         );

//         if (result.rows.length === 0) {
//             console.log("❌ Skill test not found:", testId);
//             return res.status(404).json({ message: "Skill test not found" });
//         }

//         console.log("✅ Found skill test:", result.rows[0].title);
//         res.json(result.rows[0]);
//     } catch (err) {
//         console.error("❌ Fetch skill test error:", err);
//         res.status(500).json({ 
//             message: "Server error", 
//             error: err.message 
//         });
//     }
// });

// // ================================================
// // GET QUESTIONS FOR SKILL TEST
// // ================================================
// router.get("/:testId/questions", authMiddleware, async (req, res) => {
//     try {
//         const { testId } = req.params;
//         console.log("📋 Fetching questions for test:", testId);

//         const result = await pool.query(
//             `SELECT id, question, option_a, option_b, option_c, option_d
//              FROM skill_test_questions
//              WHERE test_id = $1
//              ORDER BY id`,
//             [testId]
//         );

//         console.log(`✅ Found ${result.rows.length} questions`);
//         res.json(result.rows);
//     } catch (err) {
//         console.error("❌ Fetch questions error:", err);
//         res.status(500).json({ 
//             message: "Server error", 
//             error: err.message 
//         });
//     }
// });

// // ================================================
// // START SKILL TEST - THIS IS THE CRITICAL ONE
// // ================================================
// router.post("/:testId/start", authMiddleware, async (req, res) => {
//     const userId = req.user.id;
//     const testId = req.params.testId;

//     console.log("=".repeat(60));
//     console.log("🎯 START SKILL TEST REQUEST");
//     console.log("   Timestamp:", new Date().toISOString());
//     console.log("   User ID:", userId);
//     console.log("   Test ID:", testId);
//     console.log("   User Email:", req.user.email || "N/A");
//     console.log("=".repeat(60));

//     try {
//         // Step 1: Check if test exists
//         console.log("Step 1: Checking if test exists...");
//         const testResult = await pool.query(
//             "SELECT * FROM skill_tests WHERE id = $1 AND is_active = true",
//             [testId]
//         );

//         if (testResult.rows.length === 0) {
//             console.log("❌ Test not found");
//             return res.status(404).json({ message: "Skill test not found" });
//         }

//         console.log("✅ Test exists:", testResult.rows[0].title);

//         // Step 2: Check if user has already COMPLETED this test
//         console.log("Step 2: Checking for completed attempts...");
//         const completedAttempt = await pool.query(
//             `SELECT * FROM skill_test_attempts 
//              WHERE user_id = $1 AND test_id = $2 AND status = 'COMPLETED'`,
//             [userId, testId]
//         );

//         if (completedAttempt.rows.length > 0) {
//             console.log("❌ User has already completed this test");
//             return res.status(403).json({
//                 message: "You have already attempted this Skill Test",
//                 hasAttempted: true
//             });
//         }

//         console.log("✅ No completed attempts found");

//         // Step 3: Check for IN_PROGRESS attempt
//         console.log("Step 3: Checking for in-progress attempts...");
//         const inProgressAttempt = await pool.query(
//             `SELECT * FROM skill_test_attempts 
//              WHERE user_id = $1 AND test_id = $2 AND status = 'IN_PROGRESS'`,
//             [userId, testId]
//         );

//         if (inProgressAttempt.rows.length > 0) {
//             console.log("⚠️  Found in-progress attempt:", inProgressAttempt.rows[0].id);
//             console.log("   Returning attemptId to resume test");
//             return res.status(200).json({
//                 message: "Resuming skill test",
//                 attemptId: inProgressAttempt.rows[0].id,
//                 isResume: true
//             });
//         }

//         console.log("✅ No in-progress attempts found");

//         // Step 4: Create new attempt
//         console.log("Step 4: Creating new attempt...");
//         const attemptResult = await pool.query(
//             `INSERT INTO skill_test_attempts (user_id, test_id, status, started_at)
//              VALUES ($1, $2, 'IN_PROGRESS', NOW())
//              RETURNING id`,
//             [userId, testId]
//         );

//         const attemptId = attemptResult.rows[0].id;
//         console.log("✅ Created new attempt:", attemptId);
//         console.log("=".repeat(60));

//         res.status(200).json({
//             message: "Skill test started successfully",
//             attemptId: attemptId,
//             isResume: false
//         });

//     } catch (err) {
//         console.error("=".repeat(60));
//         console.error("❌ START TEST ERROR:");
//         console.error("   Message:", err.message);
//         console.error("   Code:", err.code);
//         console.error("   Detail:", err.detail);
//         console.error("   Stack:", err.stack);
//         console.error("=".repeat(60));
        
//         res.status(500).json({ 
//             message: "Server error", 
//             error: err.message,
//             code: err.code
//         });
//     }
// });

// // ================================================
// // SAVE / UPDATE ANSWER
// // ================================================
// router.post("/answer", authMiddleware, async (req, res) => {
//     try {
//         const { attemptId, questionId, selectedOption, isMarkedForReview } = req.body;
//         const userId = req.user.id;

//         const attemptCheck = await pool.query(
//             `SELECT * FROM skill_test_attempts 
//              WHERE id = $1 AND user_id = $2 AND status = 'IN_PROGRESS'`,
//             [attemptId, userId]
//         );

//         if (attemptCheck.rows.length === 0) {
//             return res.status(403).json({ message: "Invalid attempt" });
//         }

//         const existing = await pool.query(
//             `SELECT id FROM skill_test_answers 
//              WHERE attempt_id = $1 AND question_id = $2`,
//             [attemptId, questionId]
//         );

//         if (existing.rows.length > 0) {
//             await pool.query(
//                 `UPDATE skill_test_answers
//                  SET selected_option = $1, is_marked_for_review = $2
//                  WHERE attempt_id = $3 AND question_id = $4`,
//                 [selectedOption, isMarkedForReview, attemptId, questionId]
//             );
//         } else {
//             await pool.query(
//                 `INSERT INTO skill_test_answers
//                  (attempt_id, question_id, selected_option, is_marked_for_review)
//                  VALUES ($1, $2, $3, $4)`,
//                 [attemptId, questionId, selectedOption, isMarkedForReview]
//             );
//         }

//         res.json({ message: "Answer saved" });
//     } catch (err) {
//         console.error("❌ Save answer error:", err);
//         res.status(500).json({ 
//             message: "Server error", 
//             error: err.message 
//         });
//     }
// });

// // ================================================
// // SUBMIT SKILL TEST
// // ================================================
// router.post("/:attemptId/submit", authMiddleware, async (req, res) => {
//     try {
//         const { attemptId } = req.params;
//         const userId = req.user.id;

//         console.log("🎯 SUBMIT TEST - Attempt ID:", attemptId, "User ID:", userId);

//         const attemptResult = await pool.query(
//             `SELECT sta.*, st.id as test_id, st.passing_percentage
//              FROM skill_test_attempts sta
//              JOIN skill_tests st ON sta.test_id = st.id
//              WHERE sta.id = $1 AND sta.user_id = $2 AND sta.status = 'IN_PROGRESS'`,
//             [attemptId, userId]
//         );

//         if (attemptResult.rows.length === 0) {
//             console.log("❌ Attempt not found or already submitted");
//             return res.status(404).json({ 
//                 message: "Attempt not found or already submitted" 
//             });
//         }

//         const attempt = attemptResult.rows[0];

//         // Get total questions
//         const totalQuestionsResult = await pool.query(
//             `SELECT COUNT(*) as total FROM skill_test_questions WHERE test_id = $1`,
//             [attempt.test_id]
//         );
//         const totalQuestions = parseInt(totalQuestionsResult.rows[0].total);

//         // Calculate score
//         const scoreResult = await pool.query(
//             `SELECT COUNT(*) AS score
//              FROM skill_test_answers sta
//              JOIN skill_test_questions stq ON sta.question_id = stq.id
//              WHERE sta.attempt_id = $1
//              AND sta.selected_option = stq.correct_option`,
//             [attemptId]
//         );

//         const score = parseInt(scoreResult.rows[0].score);
//         const percentage = (score / totalQuestions) * 100;
//         const passed = percentage >= (attempt.passing_percentage || 40);

//         // Update attempt
//         await pool.query(
//             `UPDATE skill_test_attempts
//              SET score = $1, 
//                  total_questions = $2,
//                  percentage = $3,
//                  status = 'COMPLETED', 
//                  result_status = $4,
//                  submitted_at = NOW()
//              WHERE id = $5`,
//             [score, totalQuestions, percentage, passed ? 'PASSED' : 'FAILED', attemptId]
//         );

//         console.log("✅ Test submitted - Score:", score, "/", totalQuestions);

//         res.json({
//             message: "Skill test submitted successfully",
//             score,
//             totalQuestions,
//             percentage: percentage.toFixed(1),
//             passed
//         });

//     } catch (err) {
//         console.error("❌ Submit test error:", err);
//         res.status(500).json({ 
//             message: "Server error", 
//             error: err.message 
//         });
//     }
// });

// // ================================================
// // GET SKILL TEST HISTORY
// // ================================================
// router.get("/history/all", authMiddleware, async (req, res) => {
//     try {
//         const userId = req.user.id;
//         console.log("📋 Fetching history for user:", userId);

//         const result = await pool.query(
//             `SELECT 
//                 sta.*,
//                 st.title,
//                 st.description,
//                 st.duration_minutes
//              FROM skill_test_attempts sta
//              JOIN skill_tests st ON sta.test_id = st.id
//              WHERE sta.user_id = $1 AND sta.status = 'COMPLETED'
//              ORDER BY sta.submitted_at DESC`,
//             [userId]
//         );

//         console.log(`✅ Found ${result.rows.length} history records`);
//         res.json(result.rows);
//     } catch (err) {
//         console.error("❌ Fetch history error:", err);
//         res.status(500).json({ 
//             message: "Server error", 
//             error: err.message 
//         });
//     }
// });

// module.exports = router;


//2
const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const crypto = require("crypto");

// ================================================
// HELPER FUNCTIONS
// ================================================

const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const calculateTokenExpiry = (durationMinutes) => {
    const now = new Date();
    return new Date(now.getTime() + (durationMinutes + 5) * 60000);
};

// ================================================
// GET ALL CATEGORIES
// ================================================
router.get("/categories", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("📂 Fetching categories for user:", userId);

        const result = await pool.query(
            `SELECT 
                c.id,
                c.name,
                c.description,
                c.icon,
                COUNT(DISTINCT l.id) as language_count,
                COUNT(DISTINCT t.id) as total_tests,
                COUNT(DISTINCT CASE WHEN sta.status = 'COMPLETED' THEN sta.id END) as completed_tests
             FROM skill_categories c
             LEFT JOIN skill_languages l ON c.id = l.category_id AND l.is_active = true
             LEFT JOIN skill_tests t ON l.id = t.language_id AND t.is_active = true
             LEFT JOIN skill_test_attempts sta 
                ON t.id = sta.test_id 
                AND sta.user_id = $1 
                AND sta.status = 'COMPLETED'
             WHERE c.is_active = true
             GROUP BY c.id
             ORDER BY c.display_order`,
            [userId]
        );

        console.log(`✅ Found ${result.rows.length} categories`);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Fetch categories error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================================================
// GET LANGUAGES FOR A CATEGORY
// ================================================
router.get("/categories/:categoryId/languages", authMiddleware, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const userId = req.user.id;

        console.log(`📋 Fetching languages for category ${categoryId}`);

        const result = await pool.query(
            `SELECT 
                l.id,
                l.name,
                l.description,
                l.icon,
                l.display_order,
                COUNT(DISTINCT t.id) as test_count,
                COUNT(DISTINCT CASE WHEN sta.status = 'COMPLETED' THEN sta.id END) as completed_count
             FROM skill_languages l
             LEFT JOIN skill_tests t ON l.id = t.language_id AND t.is_active = true
             LEFT JOIN skill_test_attempts sta 
                ON t.id = sta.test_id 
                AND sta.user_id = $1 
                AND sta.status = 'COMPLETED'
             WHERE l.category_id = $2 AND l.is_active = true
             GROUP BY l.id
             ORDER BY l.display_order`,
            [userId, categoryId]
        );

        console.log(`✅ Found ${result.rows.length} languages`);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Fetch languages error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================================================
// GET LEVELS FOR A LANGUAGE (Returns 4 levels with exam info)
// ================================================
router.get("/languages/:languageId/levels", authMiddleware, async (req, res) => {
    try {
        const { languageId } = req.params;
        const userId = req.user.id;

        console.log(`📋 Fetching levels for language ${languageId}`);

        // Define all 4 levels
        const levels = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
        
        // Get exam info for each level
        const result = await pool.query(
            `SELECT 
                t.level,
                t.id as test_id,
                t.title,
                t.description,
                t.duration_minutes,
                t.total_questions,
                t.mcq_count,
                t.fill_blank_count,
                t.programming_count,
                t.passing_percentage,
                CASE 
                    WHEN sta.id IS NOT NULL AND sta.status = 'COMPLETED' THEN true
                    ELSE false
                END as has_attempted,
                sta.result_status,
                sta.submitted_at
             FROM skill_tests t
             LEFT JOIN skill_test_attempts sta 
                ON t.id = sta.test_id 
                AND sta.user_id = $1 
                AND sta.status = 'COMPLETED'
             WHERE t.language_id = $2 AND t.is_active = true
             ORDER BY 
                CASE t.level 
                    WHEN 'Beginner' THEN 1
                    WHEN 'Intermediate' THEN 2
                    WHEN 'Advanced' THEN 3
                    WHEN 'Professional' THEN 4
                END`,
            [userId, languageId]
        );

        // Create response with all 4 levels (even if exam doesn't exist yet)
        const levelsData = levels.map(level => {
            const exam = result.rows.find(row => row.level === level);
            return {
                level: level,
                has_exam: !!exam,
                test_id: exam?.test_id || null,
                title: exam?.title || `${level} Level - Coming Soon`,
                description: exam?.description || `${level} level exam`,
                duration_minutes: exam?.duration_minutes || 60,
                total_questions: exam?.total_questions || 25,
                mcq_count: exam?.mcq_count || 10,
                fill_blank_count: exam?.fill_blank_count || 5,
                programming_count: exam?.programming_count || 10,
                passing_percentage: exam?.passing_percentage || 60,
                has_attempted: exam?.has_attempted || false,
                result_status: exam?.result_status || null,
                submitted_at: exam?.submitted_at || null
            };
        });

        console.log(`✅ Returning 4 levels for language`);
        res.json(levelsData);
    } catch (err) {
        console.error("❌ Fetch levels error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================================================
// GET SINGLE TEST WITH MODULES
// ================================================
router.get("/tests/:testId", authMiddleware, async (req, res) => {
    try {
        const { testId } = req.params;
        const userId = req.user.id;

        console.log("📋 Fetching test:", testId);

        // Get test details
        const testResult = await pool.query(
            `SELECT 
                t.*,
                l.name as language_name,
                c.name as category_name,
                CASE 
                    WHEN sta.id IS NOT NULL AND sta.status = 'COMPLETED' THEN true
                    ELSE false
                END as has_attempted,
                sta.result_status
             FROM skill_tests t
             JOIN skill_languages l ON t.language_id = l.id
             JOIN skill_categories c ON l.category_id = c.id
             LEFT JOIN skill_test_attempts sta 
                ON t.id = sta.test_id 
                AND sta.user_id = $1 
                AND sta.status = 'COMPLETED'
             WHERE t.id = $2 AND t.is_active = true`,
            [userId, testId]
        );

        if (testResult.rows.length === 0) {
            return res.status(404).json({ message: "Test not found" });
        }

        // Get modules for this test
        const modulesResult = await pool.query(
            `SELECT * FROM skill_test_modules 
             WHERE test_id = $1 
             ORDER BY display_order`,
            [testId]
        );

        const test = testResult.rows[0];
        test.modules = modulesResult.rows;

        console.log("✅ Found test:", test.title);
        res.json(test);
    } catch (err) {
        console.error("❌ Fetch test error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================================================
// GET QUESTIONS BY MODULE
// ================================================
router.get("/tests/:testId/modules/:moduleId/questions", authMiddleware, async (req, res) => {
    try {
        const { testId, moduleId } = req.params;
        console.log(`📋 Fetching questions for test ${testId}, module ${moduleId}`);

        const result = await pool.query(
            `SELECT 
                id, 
                question_type,
                question,
                option_a,
                option_b,
                option_c,
                option_d,
                starter_code,
                points,
                display_order
             FROM skill_test_questions
             WHERE test_id = $1 AND module_id = $2
             ORDER BY display_order`,
            [testId, moduleId]
        );

        console.log(`✅ Found ${result.rows.length} questions`);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Fetch questions error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================================================
// START TEST WITH TOKEN
// ================================================
router.post("/tests/:testId/start", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const testId = req.params.testId;

    console.log("=".repeat(60));
    console.log("🎯 START TEST REQUEST");
    console.log("   User ID:", userId);
    console.log("   Test ID:", testId);
    console.log("=".repeat(60));

    try {
        // Check if test exists
        const testResult = await pool.query(
            "SELECT * FROM skill_tests WHERE id = $1 AND is_active = true",
            [testId]
        );

        if (testResult.rows.length === 0) {
            return res.status(404).json({ message: "Test not found" });
        }

        const test = testResult.rows[0];

        // Check if already completed
        const completedAttempt = await pool.query(
            `SELECT * FROM skill_test_attempts 
             WHERE user_id = $1 AND test_id = $2 AND status = 'COMPLETED'`,
            [userId, testId]
        );

        if (completedAttempt.rows.length > 0) {
            return res.status(403).json({
                message: "You have already attempted this test",
                hasAttempted: true
            });
        }

        // Check for in-progress with valid token
        const inProgressAttempt = await pool.query(
            `SELECT * FROM skill_test_attempts 
             WHERE user_id = $1 AND test_id = $2 AND status = 'IN_PROGRESS'
             AND token_expires_at > NOW()`,
            [userId, testId]
        );

        if (inProgressAttempt.rows.length > 0) {
            return res.status(200).json({
                message: "Resuming test",
                attemptId: inProgressAttempt.rows[0].id,
                token: inProgressAttempt.rows[0].attempt_token,
                isResume: true
            });
        }

        // Clean expired attempts
        await pool.query(
            `DELETE FROM skill_test_attempts 
             WHERE user_id = $1 AND test_id = $2 
             AND status = 'IN_PROGRESS' AND token_expires_at < NOW()`,
            [userId, testId]
        );

        // Get first module
        const firstModule = await pool.query(
            `SELECT id FROM skill_test_modules 
             WHERE test_id = $1 
             ORDER BY display_order LIMIT 1`,
            [testId]
        );

        // Generate token and create attempt
        const token = generateToken();
        const tokenExpiry = calculateTokenExpiry(test.duration_minutes);

        const attemptResult = await pool.query(
            `INSERT INTO skill_test_attempts 
             (user_id, test_id, status, attempt_token, token_expires_at, current_module_id, started_at)
             VALUES ($1, $2, 'IN_PROGRESS', $3, $4, $5, NOW())
             RETURNING id`,
            [userId, testId, token, tokenExpiry, firstModule.rows[0]?.id]
        );

        console.log("✅ Created attempt:", attemptResult.rows[0].id);

        res.status(200).json({
            message: "Test started successfully",
            attemptId: attemptResult.rows[0].id,
            token: token,
            isResume: false
        });

    } catch (err) {
        console.error("❌ Start test error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================================================
// SAVE ANSWER WITH TOKEN VALIDATION
// ================================================
router.post("/answer", authMiddleware, async (req, res) => {
    try {
        const { attemptId, questionId, answerText, isMarkedForReview, token } = req.body;
        const userId = req.user.id;

        // Validate token
        const attemptCheck = await pool.query(
            `SELECT * FROM skill_test_attempts 
             WHERE id = $1 AND user_id = $2 AND status = 'IN_PROGRESS'
             AND attempt_token = $3 AND token_expires_at > NOW()`,
            [attemptId, userId, token]
        );

        if (attemptCheck.rows.length === 0) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }

        // Check if answer is correct
        const questionResult = await pool.query(
            `SELECT correct_answer, question_type FROM skill_test_questions WHERE id = $1`,
            [questionId]
        );

        const question = questionResult.rows[0];
        let isCorrect = false;
        
        if (answerText) {
            isCorrect = answerText.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
        }

        // Upsert answer
        const existing = await pool.query(
            `SELECT id FROM skill_test_answers WHERE attempt_id = $1 AND question_id = $2`,
            [attemptId, questionId]
        );

        if (existing.rows.length > 0) {
            await pool.query(
                `UPDATE skill_test_answers
                 SET answer_text = $1, is_correct = $2, is_marked_for_review = $3, updated_at = NOW()
                 WHERE attempt_id = $4 AND question_id = $5`,
                [answerText, isCorrect, isMarkedForReview, attemptId, questionId]
            );
        } else {
            await pool.query(
                `INSERT INTO skill_test_answers
                 (attempt_id, question_id, answer_text, is_correct, is_marked_for_review)
                 VALUES ($1, $2, $3, $4, $5)`,
                [attemptId, questionId, answerText, isCorrect, isMarkedForReview]
            );
        }

        res.json({ message: "Answer saved", isCorrect });
    } catch (err) {
        console.error("❌ Save answer error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================================================
// SUBMIT TEST
// ================================================
router.post("/attempts/:attemptId/submit", authMiddleware, async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { token } = req.body;
        const userId = req.user.id;

        console.log("🎯 SUBMIT TEST - Attempt:", attemptId);

        // Validate token
        const attemptResult = await pool.query(
            `SELECT sta.*, st.passing_percentage, st.total_questions
             FROM skill_test_attempts sta
             JOIN skill_tests st ON sta.test_id = st.id
             WHERE sta.id = $1 AND sta.user_id = $2 
             AND sta.status = 'IN_PROGRESS'
             AND sta.attempt_token = $3`,
            [attemptId, userId, token]
        );

        if (attemptResult.rows.length === 0) {
            return res.status(403).json({ message: "Invalid token or already submitted" });
        }

        const attempt = attemptResult.rows[0];

        // Count correct answers
        const correctResult = await pool.query(
            `SELECT COUNT(*) as correct FROM skill_test_answers
             WHERE attempt_id = $1 AND is_correct = true`,
            [attemptId]
        );

        const correctAnswers = parseInt(correctResult.rows[0].correct);
        const totalQuestions = attempt.total_questions;
        const percentage = (correctAnswers / totalQuestions) * 100;
        const passed = percentage >= (attempt.passing_percentage || 40);

        // Update attempt
        await pool.query(
            `UPDATE skill_test_attempts
             SET total_questions = $1,
                 correct_answers = $2,
                 status = 'COMPLETED',
                 result_status = $3,
                 submitted_at = NOW()
             WHERE id = $4`,
            [totalQuestions, correctAnswers, passed ? 'PASSED' : 'FAILED', attemptId]
        );

        console.log("✅ Test submitted -", passed ? 'PASSED' : 'FAILED');

        res.json({
            message: "Test submitted successfully",
            result_status: passed ? 'PASSED' : 'FAILED',
            passed: passed,
            score: correctAnswers,
            totalQuestions: totalQuestions,
            percentage: percentage.toFixed(2)
        });

    } catch (err) {
        console.error("❌ Submit test error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ================================================
// GET COMPLETED TESTS HISTORY
// ================================================
router.get("/history/completed", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("📋 Fetching completed tests");

        const result = await pool.query(
            `SELECT 
                sta.id,
                sta.submitted_at,
                sta.result_status,
                t.title,
                t.level,
                l.name as language_name,
                c.name as category_name
             FROM skill_test_attempts sta
             JOIN skill_tests t ON sta.test_id = t.id
             JOIN skill_languages l ON t.language_id = l.id
             JOIN skill_categories c ON l.category_id = c.id
             WHERE sta.user_id = $1 AND sta.status = 'COMPLETED'
             ORDER BY sta.submitted_at DESC`,
            [userId]
        );

        console.log(`✅ Found ${result.rows.length} completed tests`);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Fetch history error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;