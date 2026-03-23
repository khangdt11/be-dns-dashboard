import crypto from 'crypto';

export const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateForgotPasswordToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(resetToken);
  return { resetToken, hashedToken };
};

export const generateTemplateEmail = (resetToken: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;padding:40px;">
            
            <tr>
              <td align="center" style="font-size:24px;font-weight:bold;color:#333;">
                Adhub DNS Management Dashboard
              </td>
            </tr>

            <tr>
              <td style="padding-top:30px;font-size:16px;color:#444;">
                Hello,
              </td>
            </tr>

            <tr>
              <td style="padding-top:10px;font-size:15px;color:#555;line-height:1.6;">
                We received a request to reset your password for your <b>Adhub DNS Management Dashboard</b> account.
                Click the button below to set a new password.
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:30px 0;">
                <a href="${resetUrl}" 
                   style="background:#2563eb;color:#ffffff;padding:14px 28px;
                   text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;
                   display:inline-block;">
                   Reset Password
                </a>
              </td>
            </tr>

            <tr>
              <td style="font-size:14px;color:#666;line-height:1.6;">
                If you did not request a password reset, please ignore this email.
              </td>
            </tr>

            <tr>
              <td style="padding-top:20px;font-size:14px;color:#666;">
                Or copy and paste this link into your browser:
                <br/>
                <a href="${resetUrl}" style="color:#2563eb;">${resetUrl}</a>
              </td>
            </tr>

            <tr>
              <td style="padding-top:40px;font-size:12px;color:#999;text-align:center;">
                © ${new Date().getFullYear()} Adhub DNS Management Dashboard
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};
