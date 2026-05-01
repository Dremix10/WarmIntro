// Single source for the welcome-email body. Approve flow + admin
// "Send welcome" button + test-welcome preview all build through here
// so wording stays consistent. The HTML is intentionally inline-styled
// (transactional email — no <style> in head, no external CSS, table-
// safe layout) so it renders cleanly in Gmail / Outlook / iOS Mail
// without surprises.
//
// Tone: STRICTLY transactional. Microsoft Defender ATP (which Rice and
// most other .edu sites use) scores promotional language hard — phrases
// like "founding-user perk", "free for you", "grandfathered" pushed
// previous versions into junk for @rice.edu while the informational
// night-preview digest (same FROM, same domain) landed cleanly. Keep
// the body to: greeting, what happened (access approved), one CTA,
// expiry note, fallback link, sign-off. Anything else moves to the
// in-app onboarding screen the link goes to.

export interface WelcomeEmailParams {
  greeting: string;       // "Hi" or "Hi <FirstName>"
  setupLink: string;      // /reset-password?token=… link minted at call time
  forgotPath: string;     // base URL + /forgot-password (fallback link)
  // Optional banner shown above the CTA. Used when an admin re-issues a
  // welcome after we shipped a fix between the original send and now —
  // explains "you're getting this because of an update" so the user
  // doesn't think it's a duplicate / scam. Subject also gets "(updated)"
  // so they can tell the two emails apart in their inbox.
  updateNote?: string;
}

export interface WelcomeEmailBody {
  subject: string;
  html: string;
  text: string;
}

export function buildWelcomeEmail(p: WelcomeEmailParams): WelcomeEmailBody {
  const subject = p.updateNote ? "Your Alma account is ready (updated link)" : "Your Alma account is ready";
  const noteHtml = p.updateNote
    ? `<p style="margin:0 0 16px 0;padding:10px 12px;background:#EAE3D2;border-radius:8px;font-size:13px;color:#14182A">${p.updateNote}</p>`
    : "";
  const noteText = p.updateNote ? `${p.updateNote}\n\n` : "";
  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6;margin:0"><div style="max-width:520px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px"><p style="font-size:22px;font-style:italic;color:#1B3B5F;margin:0 0 20px 0">alma</p><p style="font-size:16px;margin:0 0 12px 0">${p.greeting},</p>${noteHtml}<p style="margin:0 0 18px 0">Your account is ready. Use the link below to set a password and finish setup.</p><p style="margin:24px 0;text-align:center"><a href="${p.setupLink}" style="display:inline-block;background:#1B3B5F;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Set up my account</a></p><p style="margin:0 0 8px 0;font-size:13px;color:#5C6472">Link expires in one hour. If it expires, request a new one at <a href="${p.forgotPath}" style="color:#2E5A88">${p.forgotPath}</a>.</p><p style="margin:24px 0 0 0;font-size:13px;color:#5C6472">— The Alma team</p></div></body></html>`;
  const text = `${p.greeting},

${noteText}Your account is ready. Use this link to set a password and finish setup:

${p.setupLink}

Link expires in one hour. If it expires, request a new one at:
${p.forgotPath}

— The Alma team`;
  return { subject, html, text };
}
