import { withLayout } from "./templates/layout";
import { getOtpHtml } from "./templates/otp";

export class EmailClient {
  private apiKey: string;
  private fromEmail = "hitchly.payments@gmail.com";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendOtp(email: string, otp: string) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Hitchly Support", email: this.fromEmail },
        to: [{ email: email }],
        subject: "Your Verification Code",
        htmlContent: withLayout(getOtpHtml(otp)),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[BREVO ERROR]:", errorData);
      throw new Error(
        `Email failed: ${errorData.message || response.statusText}`
      );
    }

    return await response.json();
  }
}
