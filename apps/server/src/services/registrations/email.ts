import { Resend } from "resend";
import { getLogger } from "../../observability/request-context";

let resend: Resend | null = null;

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendBookingResumeEmail({
  to,
  eventTitle,
  orgName,
  resumeUrl,
}: {
  to: string;
  eventTitle: string;
  orgName: string;
  resumeUrl: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    getLogger().info({ to, eventTitle, orgName, resumeUrl }, "dev resume email");
    return;
  }

  try {
    await getResend()?.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      subject: `Complete your booking for ${eventTitle}`,
      html: renderResumeHtml({ eventTitle, orgName, resumeUrl }),
    });
  } catch (err) {
    getLogger().warn({ err, to, eventTitle }, "resume email send failed");
  }
}

function renderResumeHtml({
  eventTitle,
  orgName,
  resumeUrl,
}: {
  eventTitle: string;
  orgName: string;
  resumeUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:600;color:#0f172a;">
                  Complete your booking
                </h1>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:#475569;">
                  Your spot for <strong>${escapeHtml(eventTitle)}</strong> at ${escapeHtml(orgName)} is held as pending. Finish payment within 30 minutes to confirm.
                </p>
                <a href="${resumeUrl}"
                   style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:500;">
                  Complete payment
                </a>
                <p style="margin:24px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                  Or paste this link into your browser:<br/>
                  <span style="color:#475569;word-break:break-all;">${resumeUrl}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  If you didn't start this booking, you can ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
