export interface AccessRequestConfirmationParams {
  firstName?: string | null;
  requestEmail: string;
  siteUrl: string;
}

export interface AccessRequestConfirmationEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAccessRequestConfirmationEmail(
  p: AccessRequestConfirmationParams
): AccessRequestConfirmationEmail {
  const firstName = p.firstName?.trim() ? escapeHtml(p.firstName.trim()) : null;
  const greeting = firstName ? `Hi ${firstName}` : "Hi";
  const email = escapeHtml(p.requestEmail);
  const siteUrl = p.siteUrl.replace(/\/$/, "");
  const requestAccessUrl = `${siteUrl}/request-access`;
  const subject = "We received your Alma request";

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6;margin:0"><div style="max-width:540px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:18px;padding:36px"><p style="font-size:24px;font-style:italic;color:#1B3B5F;margin:0 0 20px 0">alma</p><p style="font-size:16px;margin:0 0 12px 0">${greeting},</p><p style="margin:0 0 18px 0">We received your request for Alma at <strong>${email}</strong>.</p><p style="margin:0 0 18px 0">We are processing requests in order. Expect an email in the next 24 hours with either your setup link or your position on the waitlist.</p><p style="margin:22px 0;padding:14px 16px;background:#F4EDDB;border:1px solid #D9CFB5;border-radius:12px;color:#1B3B5F;font-size:15px">Your networking spreadsheet just got nervous.</p><p style="margin:0 0 10px 0;font-size:13px;color:#5C6472">School inboxes sometimes route new senders to spam on first contact. If you do not see the invite, check spam and mark <strong>welcome@alma.careers</strong> as not-spam so future emails land cleanly.</p><p style="margin:20px 0 0 0;font-size:13px;color:#5C6472">Wrong email? Submit again at <a href="${requestAccessUrl}" style="color:#2E5A88">${requestAccessUrl}</a>.</p><p style="margin:24px 0 0 0;font-size:13px;color:#5C6472">The Alma team</p></div></body></html>`;

  const text = `${greeting},

We received your request for Alma at ${p.requestEmail}.

We are processing requests in order. Expect an email in the next 24 hours with either your setup link or your position on the waitlist.

Your networking spreadsheet just got nervous.

School inboxes sometimes route new senders to spam on first contact. If you do not see the invite, check spam and mark welcome@alma.careers as not-spam so future emails land cleanly.

Wrong email? Submit again at ${requestAccessUrl}.

The Alma team`;

  return { subject, html, text };
}
