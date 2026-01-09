export const getOtpHtml = (otp: string) => `
  <h2 style="color: #111; margin-top: 0;">Verify your Student Email</h2>
  <p>Welcome to Hitchly! To secure your account...</p>
  <div class="otp-code">${otp}</div>
`;
