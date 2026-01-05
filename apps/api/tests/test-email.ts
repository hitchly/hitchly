// scripts/test-email.ts
import dotenv from "dotenv";
import path from "path";

// 1. Load .env file explicitly
// We assume .env is in the root directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 2. Import your email functions
// ADJUST THIS PATH to point to where your actual email.ts file is located
import { sendOTPEmail, sendWelcomeEmail } from "../lib/email";

const runTest = async () => {
  // Use your own email to test receiving
  const targetEmail = process.env.GMAIL_USER;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
    console.error("❌ Error: Missing GMAIL_USER or GMAIL_APP_PASS in .env");
    process.exit(1);
  }

  console.log(`📧 Testing email service using: ${process.env.GMAIL_USER}`);
  console.log(`📨 Sending to: ${targetEmail}...\n`);

  try {
    // --- Test 1: Verification OTP ---
    console.log("1️⃣  Sending OTP Verification Email...");
    await sendOTPEmail(targetEmail!, "884422");
    console.log("   -> OTP Email command finished.\n");

    // --- Test 2: Welcome Email ---
    console.log("2️⃣  Sending Welcome Email...");
    await sendWelcomeEmail(targetEmail!, "McMaster Student");
    console.log("   -> Welcome Email command finished.\n");

    console.log(
      "✅ DONE! Check your inbox (and spam folder) for two emails from 'Hitchly Support'."
    );
  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
};

runTest();
