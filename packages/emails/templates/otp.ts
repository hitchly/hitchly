export const getOtpHtml = (otp: string) => `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: center;">

  <h2 style="
    color: #111111; 
    font-size: 24px; 
    font-weight: 700; 
    margin: 0 0 16px 0;
    letter-spacing: -0.5px;
  ">
    Verify your Email
  </h2>

  <p style="
    color: #666666; 
    font-size: 16px; 
    line-height: 24px; 
    margin: 0 0 32px 0;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  ">
    Welcome to Hitchly! Please enter the following code to verify your account and start riding.
  </p>

  <div style="
    background-color: #fafafa; 
    border: 1px solid #e5e5e5; 
    border-radius: 12px; 
    padding: 24px; 
    margin: 0 auto 32px auto; 
    max-width: 280px;
  ">
    <span style="
      display: block; 
      color: #666666; 
      font-size: 12px; 
      text-transform: uppercase; 
      letter-spacing: 1px; 
      font-weight: 600; 
      margin-bottom: 8px;
    ">
      Verification Code
    </span>
    
    <span style="
      display: block; 
      font-family: 'Courier New', Courier, monospace; 
      font-size: 36px; 
      font-weight: 700; 
      color: #7A003C; 
      letter-spacing: 4px;
    ">
      ${otp}
    </span>
  </div>

  <p style="
    color: #999999; 
    font-size: 14px; 
    margin: 0;
  ">
    This code will expire in 10 minutes.<br>
    If you didn't request this, you can safely ignore this email.
  </p>
  
  <div style="display: none; opacity: 0; font-size: 1px;">
    Your Hitchly verification code is ${otp}
  </div>

</div>
`;
