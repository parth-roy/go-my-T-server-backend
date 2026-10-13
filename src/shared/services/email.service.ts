import { getMailer } from '@config/mailer';
import { env } from '@config/env';
import { logger } from '@shared/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Email Service — Zoho Mail via Nodemailer
// All admin-facing transactional emails go through here.
// ─────────────────────────────────────────────────────────────────────────────

const FROM_NAME = 'Parther Admin';
const FROM_EMAIL = env.ZOHO_FROM_EMAIL ?? 'admin@gomytruck.com';
const FROM = `"${FROM_NAME}" <${FROM_EMAIL}>`;

/**
 * Sends a password reset email to an admin user.
 * The reset link is valid for 1 hour.
 */
export async function sendPasswordResetEmail(
  to: string,
  adminName: string,
  resetToken: string
): Promise<void> {
  const resetLink = `${env.ADMIN_PANEL_URL}/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset your Parther Admin password</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background: #f4f5f7; margin: 0; padding: 20px; color: #1a1a2e; }
    .container { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #1e2235; padding: 32px; text-align: center; }
    .header h1 { color: #f4a31b; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: #8892a4; margin: 8px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .body p { font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 16px; }
    .button { display: block; width: fit-content; margin: 24px auto; background: #f4a31b; color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; }
    .note { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px; }
    .link { word-break: break-all; font-size: 12px; color: #6b7280; margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 6px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Parther Admin</h1>
      <p>gomytruck.com — Operations Dashboard</p>
    </div>
    <div class="body">
      <p>Hi ${adminName},</p>
      <p>We received a request to reset the password for your <strong>Parther Admin</strong> account.</p>
      <p>Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.</p>
      <a href="${resetLink}" class="button">Reset Password</a>
      <p class="note">If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="link">${resetLink}</div>
      <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
        If you did not request a password reset, you can safely ignore this email. 
        Your password will not change.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Parther Technologies Pvt Ltd &nbsp;·&nbsp; CIN: U62099WR2026PTC293183
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${adminName},\n\nReset your Parther Admin password by visiting:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email.\n\n— Parther Admin Team`;

  try {
    const mailer = getMailer();
    const info = await mailer.sendMail({
      from: FROM,
      to,
      subject: 'Reset your Parther Admin password',
      html,
      text,
    });
    logger.info(`[Email] Password reset email sent to ${to} — messageId: ${info.messageId}`);
  } catch (err: any) {
    // Log but don't crash — caller should surface a safe error message
    logger.error(`[Email] Failed to send password reset email to ${to}:`, err.message);
    throw new Error('Email delivery failed. Please try again later.');
  }
}

/**
 * Sends a 6-digit verification OTP email to a user.
 * Valid for 5 minutes.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your MetroMitra Verification Code</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 480px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 28px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 32px; text-align: center; }
    .otp-box { display: inline-block; background: #f1f5f9; border: 2px dashed #3b82f6; border-radius: 12px; padding: 14px 32px; margin: 24px 0; }
    .otp-code { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #1e3a8a; }
    .note { font-size: 13px; color: #64748b; line-height: 1.5; margin: 12px 0 0; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MetroMitra & GoMyTruck</h1>
      <p>Secure Verification</p>
    </div>
    <div class="body">
      <p style="font-size: 15px; color: #334155; margin: 0;">Use the verification code below to sign in:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p class="note">This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Parther Technologies Pvt Ltd · All rights reserved.
    </div>
  </div>
</body>
</html>`;

  const text = `Your MetroMitra verification code is: ${otp}\nValid for 5 minutes. Do not share with anyone.\n\n— MetroMitra Team`;

  try {
    const mailer = getMailer();
    const info = await mailer.sendMail({
      from: FROM,
      to,
      subject: `🔐 Your MetroMitra Verification Code: ${otp}`,
      html,
      text,
    });
    logger.info(`[Email] OTP email sent to ${to} — messageId: ${info.messageId}`);
  } catch (err: any) {
    logger.error(`[Email] Failed to send OTP email to ${to}:`, err.message);
  }
}

