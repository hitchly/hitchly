import { EmailClient } from "@hitchly/emails";
export const emailClient = new EmailClient(
  process.env.GMAIL_USER,
  process.env.GMAIL_APP_PASS
);
