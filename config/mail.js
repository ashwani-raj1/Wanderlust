const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // must be false for port 587
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});
module.exports = transporter;