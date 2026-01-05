// server/lib/email.ts
import nodemailer from "nodemailer";

/**
 * Configuration
 * Ensure GMAIL_USER and GMAIL_APP_PASS are set in your .env file
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

/**
 * Hitchly Base Email Template
 * Wraps content in a consistent header/footer with McMaster branding.
 */
const getEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset & Basics */
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; background-color: #f4f4f5; padding: 40px 0; }
    
    /* Main Container */
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff; 
      border-radius: 12px; 
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }

    /* Header - McMaster Maroon */
    .header { 
      background-color: #7A003C; 
      padding: 30px; 
      text-align: center; 
    }
    .header h1 { 
      color: #ffffff; 
      margin: 0; 
      font-size: 28px; 
      letter-spacing: 1px;
      font-weight: 700;
    }

    /* Body Content */
    .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
    
    /* Footer */
    .footer { 
      background-color: #f9fafb; 
      padding: 20px; 
      text-align: center; 
      border-top: 1px solid #e5e7eb;
    }
    .footer p { 
      color: #9ca3af; 
      font-size: 12px; 
      margin: 5px 0; 
    }

    /* Utilities */
    .button { 
      display: inline-block; 
      background-color: #7A003C; 
      color: #ffffff !important; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: bold; 
      margin-top: 20px; 
      text-align: center;
    }
    .otp-code { 
      font-size: 36px; 
      font-weight: 800; 
      color: #7A003C; 
      letter-spacing: 6px; 
      margin: 20px 0; 
      text-align: center;
      display: block;
      background-color: #fdf2f8;
      padding: 15px;
      border-radius: 8px;
      border: 2px dashed #7A003C;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Hitchly</h1>
      </div>
      
      <div class="content">
        ${content}
      </div>

      <div class="footer">
        <p>Ride smarter. Travel together.</p>
        <p>Made for McMaster University Students</p>
        <p>© ${new Date().getFullYear()} Hitchly Rideshare</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Generic Send Function
 */
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
  try {
    await transporter.sendMail({
      from: `"Hitchly Support" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: getEmailTemplate(html), // Wrap raw HTML in our branded template
    });
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return { success: false, error };
  }
};

/**
 * Specific Helper: Send OTP
 */
export const sendOTPEmail = async (email: string, otp: string) => {
  const content = `
    <h2 style="color: #111; margin-top: 0;">Verify your Student Email</h2>
    <p>Welcome to Hitchly! To secure your account and start sharing rides, please verify your McMaster email address.</p>
    
    <div class="otp-code">${otp}</div>
    
    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      This code will expire in 5 minutes. If you didn't request this, please ignore this email.
    </p>
  `;

  await sendEmail({
    to: email,
    subject: "Your Hitchly Verification Code",
    html: content,
  });
};

/**
 * Specific Helper: Welcome Email (Optional)
 */
export const sendWelcomeEmail = async (email: string, name: string) => {
  const content = `
    <h2>Welcome aboard, ${name}!</h2>
    <p>Your email has been verified. You are now ready to book your first ride or offer a seat to a fellow student.</p>
    
    <div style="text-align: center;">
      <a href="hitchly://home" class="button">Open App</a>
    </div>

    <p style="margin-top: 30px;">
      Remember to always check your driver's rating and meet in safe, public locations on campus.
    </p>
  `;

  await sendEmail({
    to: email,
    subject: "Welcome to Hitchly! 🚗",
    html: content,
  });
};
