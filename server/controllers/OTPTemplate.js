// Email template for OTP verification
const generateOTPEmailTemplate = (OTP) => {
    return {
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Tale</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #2a2a2a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 48px 40px 32px; background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);">
                            <div style="width: 64px; height: 64px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; border: 1px solid rgba(255, 255, 255, 0.1);">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                                    <polyline points="3,4 12,13 21,4"></polyline>
                                </svg>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">
                                Verify Your Email
                            </h1>
                            <p style="margin: 16px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.5;">
                                Welcome to <span style="color: #f97316; font-weight: 600;">Tale</span>! Please verify your email address to get started.
                            </p>
                        </td>
                    </tr>

                    <!-- OTP Section -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 32px; background-color: #2a2a2a;">
                            <p style="margin: 0 0 24px; color: #d1d5db; font-size: 15px;">
                                Your verification code is:
                            </p>
                            <div style="background: #3a3a3a; border: 2px solid rgba(249, 115, 22, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                                <div style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #f97316; font-family: 'Courier New', monospace; text-align: center;">
                                    ${OTP}
                                </div>
                            </div>
                            <div style="background: rgba(249, 115, 22, 0.1); border-left: 3px solid #f97316; padding: 16px; border-radius: 8px; margin-top: 24px;">
                                <p style="margin: 0; color: #d1d5db; font-size: 14px; line-height: 1.6;">
                                    <strong style="color: #f97316;">⏱️ Time Limit:</strong> This code will expire in <strong style="color: #ffffff;">5 minutes</strong>.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Instructions -->
                    <tr>
                        <td style="padding: 0 40px 40px; background-color: #2a2a2a;">
                            <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 20px;">
                                <p style="margin: 0 0 12px; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                                    <strong style="color: #ffffff;">Security Tips:</strong>
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #9ca3af; font-size: 13px; line-height: 1.8;">
                                    <li>Never share this code with anyone</li>
                                    <li>Tale staff will never ask for your verification code</li>
                                    <li>If you didn't request this code, please ignore this email</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 32px 40px; background-color: #1a1a1a; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                            <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                                © 2025 Tale. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">
                                This is an automated message, please do not reply.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `,
        text: `
Tale - Email Verification

Your verification code is: ${OTP}

This code will expire in 5 minutes.

Security Tips:
- Never share this code with anyone
- Tale staff will never ask for your verification code
- If you didn't request this code, please ignore this email

© 2025 Tale. All rights reserved.
This is an automated message, please do not reply.
        `
    };
};

export default generateOTPEmailTemplate;