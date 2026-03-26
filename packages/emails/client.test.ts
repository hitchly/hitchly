import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailClient } from "./client";

describe("EmailClient (Brevo)", () => {
  const mockApiKey = "xkeysib-test-123";
  const client = new EmailClient(mockApiKey);

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.stubGlobal("fetch", vi.fn());
  });

  it("sends an OTP with correct Brevo API structure", async () => {
    // 1. Mock a successful Brevo response
    const mockFetch = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: "<unique-id-123>" }),
    } as Response);

    await client.sendOtp("test@mcmaster.ca", "123456");

    // 2. Assert Fetch was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "api-key": mockApiKey,
          "Content-Type": "application/json",
        }),
      })
    );

    // 3. Verify the payload body
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);

    expect(sentBody.to[0].email).toBe("test@mcmaster.ca");
    expect(sentBody.sender.email).toBe("hitchly.payments@gmail.com");
    expect(sentBody.htmlContent).toContain("123456");
    expect(sentBody.htmlContent).toContain("<!DOCTYPE html>");
  });

  it("throws an error if Brevo API returns a failure", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      statusText: "Unauthorized",
      json: async () => ({ message: "Invalid API Key" }),
    } as Response);

    await expect(client.sendOtp("test@mcmaster.ca", "123")).rejects.toThrow(
      "Email failed: Invalid API Key"
    );
  });
});
