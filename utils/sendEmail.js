require('dotenv').config();
const nodemailer = require("nodemailer");

// configure transporter (Hostinger SMTP)
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS, // your email password
    },
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email transporter error:", error.message);
    } else {
        console.log("✅ Email transporter ready:", success);
    }
});

/**
 * Send verification email
 * @param {string} to - user's email
 * @param {string} token - verification token
 */
exports.sendVerificationEmail = async (to, token) => {
    const verifyUrl = `http://localhost:5173/verify-email/${token}`;

    try {
        const result = await transporter.sendMail({
            from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Verify your email",
            html: `
          <h2>Welcome to CCS Platform!</h2>
          <p>Please verify your email to activate your account:</p>
          <a href="${verifyUrl}" style="display:inline-block;margin-top:10px;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:5px;">Verify Email</a>
          <p>If you did not register, you can safely ignore this email.</p>
        `,
        });
        console.log("✅ Verification email sent. Message ID:", result.messageId);
        return result;
    } catch (error) {
        console.error("❌ Error sending verification email:", error.message);
        throw error;
    }
};

/**
 * 🔑 RESET PASSWORD EMAIL
 */
exports.sendResetPasswordEmail = async (to, token) => {
    const resetUrl = `http://localhost:5173/reset-password/${token}`;

    try {
        const result = await transporter.sendMail({
            from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Reset your password",
            html: `
          <h2>Password Reset Request</h2>
          <p>Click below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link expires in 15 minutes.</p>
        `,
        });
        console.log("✅ Reset password email sent. Message ID:", result.messageId);
        return result;
    } catch (error) {
        console.error("❌ Error sending reset password email:", error.message);
        throw error;
    }
};

/**
 * 🎉 WELCOME EMAIL - Student Account Created
 * Sent after student completes welcome page with location details
 */
exports.sendWelcomeStudentEmail = async (to, studentName, userType = "Student / Professional") => {
    console.log("\n🔄 sendWelcomeStudentEmail called");
    console.log("Recipient:", to);
    console.log("Student Name:", studentName);
    console.log("User Type:", userType);

    const loginLink = `http://localhost:5173/login`;
    const dashboardLink = `http://localhost:5173/dashboard`;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .section { margin: 20px 0; }
                .section-title { font-size: 18px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
                .btn { display: inline-block; margin-top: 10px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .btn:hover { background: #764ba2; }
                ul { margin: 10px 0; padding-left: 20px; }
                li { margin: 8px 0; }
                .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
                .contact { color: #667eea; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to CCS 🎉</h1>
                </div>
                <div class="content">
                    <p>Hi ${studentName || "{{user_name}}"},</p>
                    
                    <p>Welcome to <strong>CCS</strong> 🎉<br>
                    We're excited to have you join our community!</p>
                    
                    <p>Your account has been successfully created as a <strong>${userType}</strong>.<br>
                    You're now one step closer to exploring opportunities, building connections, and achieving your goals.</p>
                    
                    <div class="section">
                        <div class="section-title">What you can do next</div>
                        <ul>
                            <li>Complete your profile</li>
                            <li>Explore features tailored for your role</li>
                            <li>Start applying or posting opportunities</li>
                        </ul>
                    </div>
                    
                    <p>👉 <strong>Log in to your account:</strong><br>
                    <a href="${loginLink}" class="btn">Go to Login</a></p>
                    
                    <p>If you need help at any point, our support team is always here for you.</p>
                    
                    <p>We're glad you chose CCS.</p>
                    
                    <p>Best regards,<br>
                    <strong>Team CCS</strong><br>
                    <a href="mailto:support@ccs.com" class="contact">support@ccs.com</a><br>
                    www.ccs.com</p>
                </div>
                <div class="footer">
                    <p>© 2026 CCS Platform. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    console.log("HTML content prepared. Length:", htmlContent.length);
    console.log("Transporter status:", transporter.transporter || "Not available");

    try {
        console.log("Attempting to send email...");
        const result = await transporter.sendMail({
            from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Welcome to CCS – Let's Get Started!",
            html: htmlContent,
        });
        console.log("✅ Welcome email sent successfully!");
        console.log("📮 Message ID:", result.messageId);
        console.log("Response:", result.response);
        return result;
    } catch (error) {
        console.error("❌ Error in sendWelcomeStudentEmail function:");
        console.error("Error type:", error.name);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error response:", error.response);
        console.error("Full error:", error);
        throw error;
    }
};

/**
 * 📝 JOB APPLICATION EMAIL - Student Applied to Job
 * Sent when student successfully applies for a job
 */
exports.sendJobApplicationEmail = async (to, studentName, jobDetails) => {
    const dashboardLink = `http://localhost:5173/dashboard`;
    const { jobTitle = "{{job_title}}", companyName = "{{company_name}}", jobLocation = "{{job_location}}", applicationDate = new Date().toLocaleDateString() } = jobDetails || {};

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .success-badge { display: inline-block; background: #4caf50; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
                .details-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .detail-row { margin: 10px 0; }
                .detail-label { font-weight: bold; color: #667eea; }
                .btn { display: inline-block; margin-top: 10px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .btn:hover { background: #764ba2; }
                .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
                .contact { color: #667eea; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your Application Has Been Submitted Successfully</h1>
                </div>
                <div class="content">
                    <p>Hi ${studentName || "{{user_name}}"},</p>
                    
                    <p>Good news!<br>
                    Your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted.</p>
                    
                    <div class="details-box">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <span class="success-badge">✓ Successfully Submitted</span>
                        </div>
                        <h3 style="margin-top: 0; color: #333;">Application Details</h3>
                        <div class="detail-row">
                            <span class="detail-label">Position:</span> ${jobTitle}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Company:</span> ${companyName}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Location:</span> ${jobLocation}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Application Date:</span> ${applicationDate}
                        </div>
                    </div>
                    
                    <p>The employer will review your profile and contact you if your qualifications match their requirements.</p>
                    
                    <p>👉 <strong>Track your applications here:</strong><br>
                    <a href="${dashboardLink}" class="btn">View Dashboard</a></p>
                    
                    <p>We wish you the best of luck!</p>
                    
                    <p>Best regards,<br>
                    <strong>Team CCS</strong><br>
                    <a href="mailto:support@ccs.com" class="contact">support@ccs.com</a><br>
                    www.ccs.com</p>
                </div>
                <div class="footer">
                    <p>© 2026 CCS Platform. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const result = await transporter.sendMail({
            from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Your Application Has Been Submitted Successfully",
            html: htmlContent,
        });
        console.log("✅ Job application email sent. Message ID:", result.messageId);
        return result;
    } catch (error) {
        console.error("❌ Error sending job application email:", error.message);
        throw error;
    }
};

/**
 * 🎯 JOB LIVE EMAIL - Company Job Posted Successfully
 * Sent when company's job posting goes live and visible to candidates
 */
exports.sendJobLiveEmail = async (to, companyName, jobDetails) => {

    
    const jobLink = `http://localhost:5173/jobs/${jobDetails?.jobId || "{{job_id}}"}}`;
    const jobTitle = jobDetails?.title || "{{job_title}}";
    const jobLocation = jobDetails?.location || "{{job_location}}";
    const postedDate = jobDetails?.postedDate || new Date().toLocaleDateString();

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .live-badge { display: inline-block; background: #ff6b6b; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
                .job-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .job-title { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 10px; }
                .detail-row { margin: 10px 0; }
                .detail-label { font-weight: bold; color: #667eea; }
                .btn { display: inline-block; margin-top: 10px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .btn:hover { background: #764ba2; }
                .tip-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
                .contact { color: #667eea; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Congratulations – Your Job Is Now Live on CCS</h1>
                </div>
                <div class="content">
                    <p>Hi ${companyName || "{{company_name}}"} Team,</p>
                    
                    <p>Congratulations! 🎉<br>
                    Your job posting is now <strong>live on CCS</strong> and visible to candidates.</p>
                    
                    <div class="job-box">
                        <div style="text-align: center; margin-bottom: 15px;">
                            <span class="live-badge">🔴 LIVE</span>
                        </div>
                        <h3 style="margin-top: 0;">Job Details</h3>
                        <div class="job-title">${jobTitle}</div>
                        <div class="detail-row">
                            <span class="detail-label">Location:</span> ${jobLocation}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Posted On:</span> ${postedDate}
                        </div>
                    </div>
                    
                    <p>You can start receiving applications and manage candidates from your dashboard.</p>
                    
                    <div class="tip-box">
                        <strong>💡 Want to get more applicants faster?</strong><br>
                        Consider promoting your job for increased visibility.
                    </div>
                    
                    <p>👉 <strong>View your job posting:</strong><br>
                    <a href="${jobLink}" class="btn">View Job</a></p>
                    
                    <p>Thank you for choosing CCS.</p>
                    
                    <p>Best regards,<br>
                    <strong>Team CCS</strong><br>
                    <a href="mailto:support@ccs.com" class="contact">support@ccs.com</a><br>
                    www.ccs.com</p>
                </div>
                <div class="footer">
                    <p>© 2026 CCS Platform. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const result = await transporter.sendMail({
            from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Congratulations – Your Job Is Now Live on CCS",
            html: htmlContent,
        });
        console.log("✅ Job live email sent. Message ID:", result.messageId);
        return result;
    } catch (error) {
        console.error("❌ Error sending job live email:", error.message);
        throw error;
    }
};


// require('dotenv').config();
// const nodemailer = require("nodemailer");

// // configure transporter (Hostinger SMTP)
// const transporter = nodemailer.createTransport({
//     host: "smtp.hostinger.com",
//     port: 465,
//     secure: true,
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//     },
// });

// // Verify transporter configuration
// transporter.verify((error, success) => {
//     if (error) {
//         console.error("❌ Email transporter error:", error.message);
//     } else {
//         console.log("✅ Email transporter ready:", success);
//     }
// });

// /**
//  * Send verification email
//  * @param {string} to - user's email
//  * @param {string} token - verification token
//  */
// exports.sendVerificationEmail = async (to, token) => {
//     const verifyUrl = `http://192.168.29.249:5173/verify-email/${token}`;

//     try {
//         const result = await transporter.sendMail({
//             from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
//             to,
//             subject: "Verify your email",
//             html: `
//           <h2>Welcome to CCS Platform!</h2>
//           <p>Please verify your email to activate your account:</p>
//           <a href="${verifyUrl}" style="display:inline-block;margin-top:10px;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:5px;">Verify Email</a>
//           <p>If you did not register, you can safely ignore this email.</p>
//         `,
//         });
//         console.log("✅ Verification email sent. Message ID:", result.messageId);
//         return result;
//     } catch (error) {
//         console.error("❌ Error sending verification email:", error.message);
//         throw error;
//     }
// };

// /**
//  * 🔑 RESET PASSWORD EMAIL
//  */
// exports.sendResetPasswordEmail = async (to, token) => {
//     const resetUrl = `http://192.168.29.249:5173/reset-password/${token}`;

//     try {
//         const result = await transporter.sendMail({
//             from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
//             to,
//             subject: "Reset your password",
//             html: `
//           <h2>Password Reset Request</h2>
//           <p>Click below to reset your password:</p>
//           <a href="${resetUrl}">Reset Password</a>
//           <p>This link expires in 15 minutes.</p>
//         `,
//         });
//         console.log("✅ Reset password email sent. Message ID:", result.messageId);
//         return result;
//     } catch (error) {
//         console.error("❌ Error sending reset password email:", error.message);
//         throw error;
//     }
// };

// /**
//  * 🎉 WELCOME EMAIL - Student Account Created
//  */
// exports.sendWelcomeStudentEmail = async (to, studentName, userType = "Student / Professional") => {
//     console.log("\n🔄 sendWelcomeStudentEmail called");
//     console.log("Recipient:", to);
//     console.log("Student Name:", studentName);
//     console.log("User Type:", userType);

//     const loginLink = `http://192.168.29.249:5173/login`;
//     const dashboardLink = `http://192.168.29.249:5173/dashboard`;

//     const htmlContent = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <meta charset="UTF-8">
//             <style>
//                 body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//                 .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//                 .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
//                 .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
//                 .section { margin: 20px 0; }
//                 .section-title { font-size: 18px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
//                 .btn { display: inline-block; margin-top: 10px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
//                 .btn:hover { background: #764ba2; }
//                 ul { margin: 10px 0; padding-left: 20px; }
//                 li { margin: 8px 0; }
//                 .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
//                 .contact { color: #667eea; text-decoration: none; }
//             </style>
//         </head>
//         <body>
//             <div class="container">
//                 <div class="header">
//                     <h1>Welcome to CCS 🎉</h1>
//                 </div>
//                 <div class="content">
//                     <p>Hi ${studentName || "{{user_name}}"},</p>
                    
//                     <p>Welcome to <strong>CCS</strong> 🎉<br>
//                     We're excited to have you join our community!</p>
                    
//                     <p>Your account has been successfully created as a <strong>${userType}</strong>.<br>
//                     You're now one step closer to exploring opportunities, building connections, and achieving your goals.</p>
                    
//                     <div class="section">
//                         <div class="section-title">What you can do next</div>
//                         <ul>
//                             <li>Complete your profile</li>
//                             <li>Explore features tailored for your role</li>
//                             <li>Start applying or posting opportunities</li>
//                         </ul>
//                     </div>
                    
//                     <p>👉 <strong>Log in to your account:</strong><br>
//                     <a href="${loginLink}" class="btn">Go to Login</a></p>
                    
//                     <p>If you need help at any point, our support team is always here for you.</p>
                    
//                     <p>We're glad you chose CCS.</p>
                    
//                     <p>Best regards,<br>
//                     <strong>Team CCS</strong><br>
//                     <a href="mailto:support@ccs.com" class="contact">support@ccs.com</a><br>
//                     www.ccs.com</p>
//                 </div>
//                 <div class="footer">
//                     <p>© 2026 CCS Platform. All rights reserved.</p>
//                 </div>
//             </div>
//         </body>
//         </html>
//     `;

//     console.log("HTML content prepared. Length:", htmlContent.length);

//     try {
//         console.log("Attempting to send email...");
//         const result = await transporter.sendMail({
//             from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
//             to,
//             subject: "Welcome to CCS – Let's Get Started!",
//             html: htmlContent,
//         });
//         console.log("✅ Welcome email sent successfully!");
//         console.log("📮 Message ID:", result.messageId);
//         return result;
//     } catch (error) {
//         console.error("❌ Error in sendWelcomeStudentEmail function:");
//         console.error("Error message:", error.message);
//         throw error;
//     }
// };

// /**
//  * 📝 JOB APPLICATION EMAIL
//  */
// exports.sendJobApplicationEmail = async (to, studentName, jobDetails) => {
//     const dashboardLink = `http://192.168.29.249:5173/dashboard`;
//     const { jobTitle = "{{job_title}}", companyName = "{{company_name}}", jobLocation = "{{job_location}}", applicationDate = new Date().toLocaleDateString() } = jobDetails || {};

//     const htmlContent = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <meta charset="UTF-8">
//             <style>
//                 body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//                 .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//                 .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
//                 .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
//                 .success-badge { display: inline-block; background: #4caf50; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
//                 .details-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
//                 .detail-row { margin: 10px 0; }
//                 .detail-label { font-weight: bold; color: #667eea; }
//                 .btn { display: inline-block; margin-top: 10px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
//                 .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
//                 .contact { color: #667eea; text-decoration: none; }
//             </style>
//         </head>
//         <body>
//             <div class="container">
//                 <div class="header">
//                     <h1>Application Submitted Successfully</h1>
//                 </div>
//                 <div class="content">
//                     <p>Hi ${studentName || "{{user_name}}"},</p>
                    
//                     <p>Good news!<br>
//                     Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been submitted.</p>
                    
//                     <div class="details-box">
//                         <div style="text-align: center; margin-bottom: 20px;">
//                             <span class="success-badge">✓ Successfully Submitted</span>
//                         </div>
//                         <h3 style="margin-top: 0; color: #333;">Application Details</h3>
//                         <div class="detail-row">
//                             <span class="detail-label">Position:</span> ${jobTitle}
//                         </div>
//                         <div class="detail-row">
//                             <span class="detail-label">Company:</span> ${companyName}
//                         </div>
//                         <div class="detail-row">
//                             <span class="detail-label">Location:</span> ${jobLocation}
//                         </div>
//                         <div class="detail-row">
//                             <span class="detail-label">Date:</span> ${applicationDate}
//                         </div>
//                     </div>
                    
//                     <p>👉 <a href="${dashboardLink}" class="btn">View Dashboard</a></p>
                    
//                     <p>Best regards,<br>
//                     <strong>Team CCS</strong></p>
//                 </div>
//                 <div class="footer">
//                     <p>© 2026 CCS Platform. All rights reserved.</p>
//                 </div>
//             </div>
//         </body>
//         </html>
//     `;

//     try {
//         const result = await transporter.sendMail({
//             from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
//             to,
//             subject: "Application Submitted Successfully",
//             html: htmlContent,
//         });
//         console.log("✅ Job application email sent. Message ID:", result.messageId);
//         return result;
//     } catch (error) {
//         console.error("❌ Error sending job application email:", error.message);
//         throw error;
//     }
// };

// /**
//  * 🎯 JOB LIVE EMAIL
//  */
// exports.sendJobLiveEmail = async (to, companyName, jobDetails) => {
//     const jobLink = `http://192.168.29.249:5173/jobs/${jobDetails?.jobId || "{{job_id}}"}`;
//     const jobTitle = jobDetails?.title || "{{job_title}}";
//     const jobLocation = jobDetails?.location || "{{job_location}}";
//     const postedDate = jobDetails?.postedDate || new Date().toLocaleDateString();

//     const htmlContent = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <meta charset="UTF-8">
//             <style>
//                 body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//                 .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//                 .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
//                 .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
//                 .live-badge { display: inline-block; background: #ff6b6b; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
//                 .job-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
//                 .btn { display: inline-block; margin-top: 10px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
//                 .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
//             </style>
//         </head>
//         <body>
//             <div class="container">
//                 <div class="header">
//                     <h1>Your Job Is Now Live</h1>
//                 </div>
//                 <div class="content">
//                     <p>Hi ${companyName || "{{company_name}}"} Team,</p>
                    
//                     <p>Congratulations! 🎉<br>
//                     Your job posting is now live on CCS.</p>
                    
//                     <div class="job-box">
//                         <div style="text-align: center; margin-bottom: 15px;">
//                             <span class="live-badge">🔴 LIVE</span>
//                         </div>
//                         <h3>${jobTitle}</h3>
//                         <p>Location: ${jobLocation}</p>
//                         <p>Posted: ${postedDate}</p>
//                     </div>
                    
//                     <p>👉 <a href="${jobLink}" class="btn">View Job</a></p>
                    
//                     <p>Best regards,<br>
//                     <strong>Team CCS</strong></p>
//                 </div>
//                 <div class="footer">
//                     <p>© 2026 CCS Platform. All rights reserved.</p>
//                 </div>
//             </div>
//         </body>
//         </html>
//     `;

//     try {
//         const result = await transporter.sendMail({
//             from: `"CCS Platform" <${process.env.EMAIL_USER}>`,
//             to,
//             subject: "Your Job Is Now Live on CCS",
//             html: htmlContent,
//         });
//         console.log("✅ Job live email sent. Message ID:", result.messageId);
//         return result;
//     } catch (error) {
//         console.error("❌ Error sending job live email:", error.message);
//         throw error;
//     }
// };