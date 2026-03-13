const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS // Gmail App Password
  }
});

async function sendOTP(email, otp) {
  const info = await transporter.sendMail({
    from: `"Wanderlust" <${process.env.EMAIL}>`,
    to: email,
    subject: "Wanderlust OTP Verification",
    html: `<h2>Your OTP is ${otp}</h2><p>This OTP expires in 5 minutes.</p>`
  });

  console.log("Mail sent:", info.response);
}

module.exports = sendOTP;