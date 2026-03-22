import type { SendVerificationRequestParams } from "next-auth/providers/email";
import { Resend } from "resend";

export async function sendVerificationRequest(
  params: SendVerificationRequestParams
) {
  const { identifier: email, url, provider } = params;

  // Lazy init — avoids crashing at module evaluation during build
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: provider.from,
    to: email,
    subject: "Sign in to FitCheck",
    html: `
      <div style="background:#0a0a0a;padding:40px 20px;font-family:'Courier New',monospace;">
        <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #22c55e;border-radius:4px;padding:32px;">
          <div style="color:#22c55e;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">
            FITCHECK TERMINAL
          </div>
          <h1 style="color:#fff;font-size:20px;font-weight:bold;margin:0 0 24px;">
            Sign in to FitCheck
          </h1>
          <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Click the button below to sign in. This link expires in 24 hours.
          </p>
          <a href="${url}" style="display:inline-block;background:#22c55e;color:#0a0a0a;font-family:'Courier New',monospace;font-weight:bold;font-size:12px;letter-spacing:2px;text-decoration:none;padding:12px 24px;border-radius:2px;">
            [ SIGN IN ]
          </a>
          <p style="color:#555;font-size:11px;margin-top:24px;">
            If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}
