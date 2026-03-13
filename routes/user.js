const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/users.js");
// const transporter = require("../config/mail.js");
const sendOTP = require("../config/mail");

// ===============================
// GOOGLE AUTH
// ===============================

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
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
// SEND OTP
// ===============================

router.post("/send-otp", async (req, res) => {
  try {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    req.session.otp = otp;
    req.session.otpEmail = email;
    req.session.otpExpires = Date.now() + 5 * 60 * 1000;

    await sendOTP(email, otp);

    res.json({ message: "OTP sent successfully" });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });

  }
});


// ===============================
// VERIFY OTP
// ===============================

router.post("/verify-otp", async (req, res) => {

  try {

    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/signup");
    }

    if (user.otp !== otp) {
      req.flash("error", "Invalid OTP");
      return res.redirect("/verify");
    }

    if (user.otpExpires < Date.now()) {
      req.flash("error", "OTP expired");
      return res.redirect("/signup");
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    req.flash("success", "Email verified successfully");
    res.redirect("/login");

  } catch (err) {

    console.log(err);
    req.flash("error", "Verification failed");
    res.redirect("/signup");

  }

});


// ===============================
// NORMAL AUTH ROUTES
// ===============================

router.get("/signup", userController.renderSignupForm);

router.post("/signup", wrapAsync(userController.signup));

router.get("/login", userController.renderLoginForm);

router.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  userController.login
);

router.get("/logout", userController.logout);


module.exports = router;