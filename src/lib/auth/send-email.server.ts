/**
 * Transactional email (password reset, and anything else auth needs to send)
 * via Resend. Requires `RESEND_API_KEY` (from resend.com — free tier is
 * plenty for a church-sized app). Optional `RESEND_FROM_EMAIL` to send from a
 * verified domain instead of Resend's shared sandbox address (which only
 * reliably delivers to the Resend account's own inbox — fine for testing,
 * not for real members).
 */
export async function sendResetPasswordEmail(params: { to: string; url: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "[auth] RESEND_API_KEY is not set — password reset email was NOT sent. " +
        "Add RESEND_API_KEY (and optionally RESEND_FROM_EMAIL) in Vercel env vars.",
    );
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "Awake the Nations <onboarding@resend.dev>";
  await resend.emails.send({
    from,
    to: params.to,
    subject: "Reset your password — Awake the Nations",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>You asked to reset your Awake the Nations password.</p>
        <p><a href="${params.url}" style="display:inline-block;padding:10px 18px;background:#0080ff;color:#fff;border-radius:8px;text-decoration:none;">Reset password</a></p>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't ask for this, you can ignore this email.</p>
      </div>
    `,
  });
}
