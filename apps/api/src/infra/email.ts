export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  send(payload: EmailPayload): Promise<{ success: boolean; error?: string }>;
  sendPasswordReset(email: string, resetUrl: string): Promise<boolean>;
  sendEmailVerification(email: string, verifyUrl: string): Promise<boolean>;
}

export class ConfiguredEmailService implements EmailService {
  private readonly provider: string;
  private readonly fromAddress: string;
  private readonly resendApiKey: string | undefined;

  constructor() {
    this.provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
    this.fromAddress = process.env.EMAIL_FROM || 'Anonna Mart <no-reply@anonnamart.com>';
    this.resendApiKey = process.env.RESEND_API_KEY;
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    if (this.resendApiKey && (this.provider === 'resend' || this.provider === 'auto')) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.fromAddress,
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
          }),
        });
        if (!response.ok) {
          const body = await response.text();
          console.error('[EmailService] Resend API error:', response.status, body);
          return { success: false, error: `Resend error: ${response.status}` };
        }
        return { success: true };
      } catch (err) {
        console.error('[EmailService] Failed to send email via Resend:', err);
        return { success: false, error: String(err) };
      }
    }

    // Default console/test transport
    if (process.env.NODE_ENV !== 'production' || process.env.EMAIL_LOG_FALLBACK === 'true') {
      console.log(`[EmailService:Dev] To: ${payload.to} | Subject: "${payload.subject}"`);
      return { success: true };
    }

    console.warn(
      `[EmailService] Email not sent to ${payload.to}. Email provider credentials not configured in production.`
    );
    return { success: false, error: 'Email provider not configured' };
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a4d2e;">Reset Your Anonna Mart Password</h2>
        <p>We received a request to reset your password. Click the link below to choose a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #1a4d2e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">If you did not request this, you can safely ignore this email. The link will expire in 1 hour.</p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">Anonna Mart Bangladesh</p>
      </div>
    `;
    const res = await this.send({
      to: email,
      subject: 'Reset your Anonna Mart password',
      html,
      text: `Reset your password by following this link: ${resetUrl}`,
    });
    return res.success;
  }

  async sendEmailVerification(email: string, verifyUrl: string): Promise<boolean> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a4d2e;">Verify Your Anonna Mart Account</h2>
        <p>Thank you for registering with Anonna Mart. Click the link below to verify your email address:</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background-color: #1a4d2e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">If you did not create this account, please ignore this email.</p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">Anonna Mart Bangladesh</p>
      </div>
    `;
    const res = await this.send({
      to: email,
      subject: 'Verify your email address - Anonna Mart',
      html,
      text: `Verify your email address by following this link: ${verifyUrl}`,
    });
    return res.success;
  }
}

export const emailService: EmailService = new ConfiguredEmailService();
