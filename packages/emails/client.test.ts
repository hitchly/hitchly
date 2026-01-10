import { describe, expect, it, vi } from "vitest";
import { EmailClient } from "./client";

const sendMailMock = vi.fn().mockResolvedValue(true);
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: sendMailMock,
    }),
  },
}));

describe("EmailClient", () => {
  it("sends an OTP with correct layout", async () => {
    const client = new EmailClient("user", "pass");
    await client.sendOtp("test@mcmaster.ca", "123456");

    expect(sendMailMock).toHaveBeenCalled();
    const args = sendMailMock.mock.calls[0][0];

    expect(args.to).toBe("test@mcmaster.ca");
    expect(args.html).toContain("123456");
    expect(args.html).toContain("<!DOCTYPE html>");
  });
});
