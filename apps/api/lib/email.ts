import { EmailClient } from "@hitchly/emails";

const brevoKey = process.env.BREVO_API_KEY;

if (!brevoKey) {
  throw new Error("Missing BREVO_API_KEY environment variable");
}

export const emailClient = new EmailClient(brevoKey);
