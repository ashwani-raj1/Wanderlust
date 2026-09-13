const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const passport = require("passport");
const { rateLimit } = require("express-rate-limit");

const User = require("../models/user.js");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/users.js");
const sendOTP = require("../config/mail");

// ===============================
// GOOGLE AUTH
// ===============================

router.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: true
    }),
    (req, res) => {
        req.flash("success", "Logged in with Google");
        res.redirect("/listings");
    }
);

// ===============================
// OTP RATE LIMITERS
// ===============================

// Maximum OTP requests from one IP
const otpIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes

    // You can keep 5 if traffic is small.
    // 10 is safer for shared college/WiFi networks.
    limit: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message:
            "Too many OTP requests from this network. Please try again after 15 minutes."
    }
});

// Maximum OTP requests for one email
const otpEmailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,

    keyGenerator: (req) => {
        return (req.body.email || "")
            .trim()
            .toLowerCase();
    },

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message:
            "Too many OTPs requested for this email. Please try again later."
    }
});

// ===============================
// SEND OTP
// ===============================

router.post(
    "/send-otp",
    otpIpLimiter,
    otpEmailLimiter,
    async (req, res) => {
        try {

            let { email } = req.body;

            // -------------------------------
            // Email required
            // -------------------------------

            if (!email) {
                return res.status(400).json({
                    message: "Email required"
                });
            }

            // Normalize email
            email = email.trim().toLowerCase();

            // -------------------------------
            // Basic email validation
            // -------------------------------

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    message: "Invalid email address"
                });
            }

            // -------------------------------
            // 60 second resend cooldown
            // -------------------------------

            if (
                req.session.lastOtpSent &&
                req.session.otpEmail === email &&
                Date.now() - req.session.lastOtpSent <
                    60 * 1000
            ) {
                const remainingSeconds =
                    60 -
                    Math.floor(
                        (
                            Date.now() -
                            req.session.lastOtpSent
                        ) / 1000
                    );

                return res.status(429).json({
                    message:
                        `Please wait ${remainingSeconds} seconds before requesting another OTP.`
                });
            }

            // -------------------------------
            // Generate secure 6 digit OTP
            // -------------------------------

            const otp = crypto
                .randomInt(100000, 1000000)
                .toString();

            // -------------------------------
            // Store OTP in session
            // -------------------------------

            req.session.otp = otp;
            req.session.otpEmail = email;

            // OTP valid for 5 minutes
            req.session.otpExpires =
                Date.now() + 5 * 60 * 1000;

            req.session.lastOtpSent =
                Date.now();

            // Reset verification attempts
            req.session.otpAttempts = 0;

            // -------------------------------
            // Send OTP
            // -------------------------------

            await sendOTP(email, otp);

            return res.status(200).json({
                message: "OTP sent successfully"
            });

        } catch (err) {

            console.error(
                "OTP sending error:",
                err
            );

            return res.status(500).json({
                message: "Failed to send OTP"
            });

        }
    }
);

// ===============================
// SIGNUP PAGE
// ===============================

router.get(
    "/signup",
    userController.renderSignupForm
);

// ===============================
// SIGNUP WITH OTP
// ===============================

router.post(
    "/signup",
    async (req, res) => {

        try {

            const {
                username,
                password,
                otp
            } = req.body;

            let { email } = req.body;

            // -------------------------------
            // Basic validation
            // -------------------------------

            if (
                !username ||
                !email ||
                !password
            ) {
                req.flash(
                    "error",
                    "All fields are required"
                );

                return res.redirect(
                    "/signup"
                );
            }

            email =
                email
                    .trim()
                    .toLowerCase();

            // -------------------------------
            // OTP required
            // -------------------------------

            if (!otp) {
                req.flash(
                    "error",
                    "Enter OTP"
                );

                return res.redirect(
                    "/signup"
                );
            }

            // -------------------------------
            // Check if OTP exists
            // -------------------------------

            if (
                !req.session.otp ||
                !req.session.otpExpires ||
                !req.session.otpEmail
            ) {
                req.flash(
                    "error",
                    "Please request a new OTP"
                );

                return res.redirect(
                    "/signup"
                );
            }

            // -------------------------------
            // OTP attempts protection
            // -------------------------------

            if (
                req.session.otpAttempts ===
                undefined
            ) {
                req.session.otpAttempts = 0;
            }

            if (
                req.session.otpAttempts >= 5
            ) {

                req.session.otp = null;
                req.session.otpExpires = null;
                req.session.otpEmail = null;
                req.session.otpAttempts = null;

                req.flash(
                    "error",
                    "Too many incorrect OTP attempts. Please request a new OTP."
                );

                return res.redirect(
                    "/signup"
                );
            }

            // -------------------------------
            // Check expiry BEFORE comparison
            // -------------------------------

            if (
                req.session.otpExpires <
                Date.now()
            ) {

                req.session.otp = null;
                req.session.otpExpires = null;
                req.session.otpEmail = null;
                req.session.otpAttempts = null;

                req.flash(
                    "error",
                    "OTP expired. Please request a new OTP."
                );

                return res.redirect(
                    "/signup"
                );
            }

            // -------------------------------
            // Check email
            // -------------------------------

            if (
                req.session.otpEmail !==
                email
            ) {

                req.flash(
                    "error",
                    "Email does not match the email used for OTP verification"
                );

                return res.redirect(
                    "/signup"
                );
            }

            // -------------------------------
            // Check OTP
            // -------------------------------

            if (
                req.session.otp !==
                String(otp).trim()
            ) {

                req.session.otpAttempts++;

                req.flash(
                    "error",
                    "Invalid OTP"
                );

                return res.redirect(
                    "/signup"
                );
            }

            // -------------------------------
            // Check existing user
            // -------------------------------

            const existingUser =
                await User.findOne({
                    email
                });

            if (existingUser) {

                req.flash(
                    "error",
                    "An account with this email already exists"
                );

                return res.redirect(
                    "/signup"
                );
            }

            // -------------------------------
            // Register user
            // -------------------------------

            const newUser =
                new User({
                    email,
                    username
                });

            const registeredUser =
                await User.register(
                    newUser,
                    password
                );

            // -------------------------------
            // Clear OTP data
            // -------------------------------

            req.session.otp = null;
            req.session.otpExpires = null;
            req.session.otpEmail = null;
            req.session.otpAttempts = null;
            req.session.lastOtpSent = null;

            // -------------------------------
            // Login after signup
            // -------------------------------

            req.login(
                registeredUser,
                (err) => {

                    if (err) {

                        console.error(
                            "Auto login error:",
                            err
                        );

                        req.flash(
                            "error",
                            "Account created, but login failed. Please login manually."
                        );

                        return res.redirect(
                            "/login"
                        );
                    }

                    req.flash(
                        "success",
                        "Welcome to Wanderlust!"
                    );

                    return res.redirect(
                        "/listings"
                    );

                }
            );

        } catch (err) {

            console.error(
                "Signup error:",
                err
            );

            req.flash(
                "error",
                err.message ||
                    "Signup failed"
            );

            return res.redirect(
                "/signup"
            );

        }
    }
);

// ===============================
// LOGIN
// ===============================

router.get(
    "/login",
    userController.renderLoginForm
);

router.post(
    "/login",
    saveRedirectUrl,
    passport.authenticate(
        "local",
        {
            failureRedirect: "/login",
            failureFlash: true
        }
    ),
    userController.login
);

// ===============================
// FORGOT PASSWORD PAGE
// ===============================

router.get(
    "/forgot-password",
    (req, res) => {

        res.render(
            "users/forgot"
        );

    }
);

// ===============================
// RESET PASSWORD WITH OTP
// ===============================

router.post(
    "/forgot-password",
    async (req, res, next) => {

        try {

            let {
                email,
                otp,
                password
            } = req.body;

            // -------------------------------
            // Required fields
            // -------------------------------

            if (
                !email ||
                !otp ||
                !password
            ) {

                req.flash(
                    "error",
                    "Email, OTP and new password are required"
                );

                return res.redirect(
                    "/forgot-password"
                );
            }

            email =
                email
                    .trim()
                    .toLowerCase();

            // -------------------------------
            // Find user
            // -------------------------------

            const user =
                await User.findOne({
                    email
                });

            if (!user) {

                req.flash(
                    "error",
                    "No user with this email"
                );

                return res.redirect(
                    "/forgot-password"
                );
            }

            // -------------------------------
            // Check OTP exists
            // -------------------------------

            if (
                !req.session.otp ||
                !req.session.otpExpires ||
                !req.session.otpEmail
            ) {

                req.flash(
                    "error",
                    "Please request a new OTP"
                );

                return res.redirect(
                    "/forgot-password"
                );
            }

            // -------------------------------
            // Attempt counter
            // -------------------------------

            if (
                req.session.otpAttempts ===
                undefined
            ) {
                req.session.otpAttempts = 0;
            }

            if (
                req.session.otpAttempts >= 5
            ) {

                req.session.otp = null;
                req.session.otpExpires = null;
                req.session.otpEmail = null;
                req.session.otpAttempts = null;

                req.flash(
                    "error",
                    "Too many incorrect OTP attempts. Please request a new OTP."
                );

                return res.redirect(
                    "/forgot-password"
                );
            }

            // -------------------------------
            // OTP expired
            // -------------------------------

            if (
                req.session.otpExpires <
                Date.now()
            ) {

                req.session.otp = null;
                req.session.otpExpires = null;
                req.session.otpEmail = null;
                req.session.otpAttempts = null;

                req.flash(
                    "error",
                    "OTP expired. Please request a new OTP."
                );

                return res.redirect(
                    "/forgot-password"
                );
            }

            // -------------------------------
            // Email mismatch
            // -------------------------------

            if (
                req.session.otpEmail !==
                email
            ) {

                req.flash(
                    "error",
                    "Email mismatch"
                );

                return res.redirect(
                    "/forgot-password"
                );
            }

            // -------------------------------
            // OTP mismatch
            // -------------------------------

            if (
                req.session.otp !==
                String(otp).trim()
            ) {

                req.session.otpAttempts++;

                req.flash(
                    "error",
                    "Invalid OTP"
                );

                return res.redirect(
                    "/forgot-password"
                );
            }

            // -------------------------------
            // Update password
            // -------------------------------

            await user.setPassword(
                password
            );

            await user.save();

            // -------------------------------
            // Clear OTP session
            // -------------------------------

            req.session.otp = null;
            req.session.otpExpires = null;
            req.session.otpEmail = null;
            req.session.otpAttempts = null;
            req.session.lastOtpSent = null;

            // -------------------------------
            // Auto login
            // -------------------------------

            req.login(
                user,
                (err) => {

                    if (err) {
                        return next(err);
                    }

                    req.flash(
                        "success",
                        "Password updated successfully"
                    );

                    return res.redirect(
                        "/listings"
                    );

                }
            );

        } catch (err) {

            console.error(
                "Password reset error:",
                err
            );

            req.flash(
                "error",
                "Password reset failed"
            );

            return res.redirect(
                "/forgot-password"
            );

        }
    }
);

// ===============================
// LOGOUT
// ===============================

router.get(
    "/logout",
    userController.logout
);

module.exports = router;