import { EmailClient } from "@hitchly/emails";

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_APP_PASS;

if (!gmailUser || !gmailPass) {
  throw new Error("Missing GMAIL_USER or GMAIL_APP_PASS environment variables");
}

export const emailClient = new EmailClient(gmailUser, gmailPass);
