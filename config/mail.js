const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOTP(email, otp) {
  try {

    const response = await resend.emails.send({
      from: "Wanderlust <noreply@wanderlustonline.in>",
      to: email,
      subject: "Wanderlust OTP Verification",
      html: `
        <div style="font-family:Arial; text-align:center;">
          <h2>Wanderlust Email Verification</h2>
          <p>Your One Time Password is:</p>

          <h1 style="
            letter-spacing:6px;
            background:#f2f2f2;
            display:inline-block;
            padding:10px 20px;
            border-radius:6px;">
            ${otp}
          </h1>

          <p>This OTP will expire in <b>5 minutes</b>.</p>
        </div>
      `
    });

    return response;

  } catch (error) {

    console.error("Email error:", error);
    throw error;

  }
}

module.exports = sendOTP;