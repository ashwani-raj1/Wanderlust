const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  requireTLS: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendOTP(email, otp) {
  try {

    const info = await transporter.sendMail({
      from: `"Wanderlust" <${process.env.EMAIL}>`,
      to: email,
      subject: "Wanderlust OTP Verification",
      html: `
        <h2>Your OTP is ${otp}</h2>
        <p>This OTP will expire in 5 minutes.</p>
      `
    });

    console.log("Mail sent:", info.response);

  } catch (err) {
    console.error("SMTP Error:", err);
    throw err;
  }
}

module.exports = sendOTP;