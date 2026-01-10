import nodemailer from "nodemailer";
import { withLayout } from "./templates/layout";
import { getOtpHtml } from "./templates/otp";

export class EmailClient {
  private transporter: nodemailer.Transporter;

  constructor(user: string, pass: string) {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  private async send(to: string, subject: string, htmlContent: string) {
    const html = withLayout(htmlContent);
    return this.transporter.sendMail({
      from: '"Hitchly Support" <no-reply@hitchly.app>',
      to,
      subject,
      html,
    });
  }

  async sendOtp(email: string, otp: string) {
    return this.send(email, "Your Verification Code", getOtpHtml(otp));
  }
}
