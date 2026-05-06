import { Resend } from "resend";
import { getLogger } from "../observability/request-context";

let resend: Resend | null = null;

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendInviteEmail({
  email,
  organizationName,
  inviteLink,
}: {
  email: string;
  organizationName: string;
  inviteLink: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    getLogger().info({ to: email, organizationName, inviteLink }, "dev invite email");
    return;
  }

  await getResend()?.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `You've been invited to join ${organizationName}`,
    html: `
      <h1>Organization Invitation</h1>
      <p>You've been invited to join <strong>${organizationName}</strong>.</p>
      <p><a href="${inviteLink}">Click here to accept the invitation</a></p>
    `,
  });
}
