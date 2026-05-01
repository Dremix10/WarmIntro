// Single source for the welcome-email body. Approve flow + admin
// "Send welcome" button + test-welcome preview all build through here
// so wording stays consistent. The HTML is intentionally inline-styled
// (transactional email — no <style> in head, no external CSS, table-
// safe layout) so it renders cleanly in Gmail / Outlook / iOS Mail
// without surprises.

export interface WelcomeEmailParams {
  greeting: string;       // "Hi" or "Hi <FirstName>"
  setupLink: string;      // /reset-password?token=… link minted at call time
  forgotPath: string;     // base URL + /forgot-password (fallback link)
}

export interface WelcomeEmailBody {
  subject: string;
  html: string;
  text: string;
}

export function buildWelcomeEmail(p: WelcomeEmailParams): WelcomeEmailBody {
  const subject = "You're in — Alma is yours";
  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6"><div style="max-width:520px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px"><p style="font-size:24px;font-style:italic;color:#1B3B5F;margin:0 0 24px 0">alma</p><p style="font-size:18px;font-weight:500;margin:0 0 12px 0">${p.greeting} — you&rsquo;re in.</p><p style="margin:0 0 18px 0">Your access to Alma&rsquo;s closed beta is approved. Click below to set a password and finish onboarding right inside the app.</p><p style="margin:24px 0;text-align:center"><a href="${p.setupLink}" style="display:inline-block;background:#1B3B5F;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600">Set up my account →</a></p><p style="margin:0 0 8px 0;font-size:13px;color:#5C6472">The link is good for one hour. Once you&rsquo;re in, Alma walks you through resume upload and firm picks — about three minutes.</p><p style="margin:0 0 18px 0;font-size:13px;color:#5C6472">Missed the window? Head to <a href="${p.forgotPath}" style="color:#2E5A88">${p.forgotPath}</a> and we&rsquo;ll send a fresh one.</p><hr style="border:0;border-top:1px solid #D9CFB5;margin:28px 0"><p style="margin:0 0 14px 0;font-size:14px"><strong>Founding-user perk:</strong> the full 2026 recruiting cycle is free for you. We&rsquo;ll roll out paid tiers after launch — you&rsquo;re grandfathered.</p><p style="margin:0 0 14px 0;font-size:14px">Some rough edges are expected — we&rsquo;re shipping fixes daily. Hit the floating <strong>Feedback</strong> button inside the app once you&rsquo;re signed in. We read everything.</p><p style="margin:24px 0 0 0;font-size:13px;color:#5C6472">— Demetris, Evangelos, Christos, Theofanis<br>4 students at Rice, Brown, and MIT, in the IB cycle right now too.</p></div></body></html>`;
  const text = `${p.greeting} — you're in.\n\nYour access to Alma's closed beta is approved. Set a password here:\n${p.setupLink}\n\nGood for one hour. Once you're in, Alma walks you through resume upload and firm picks (~3 min).\n\nMissed the window? Head to ${p.forgotPath} and we'll send a fresh one.\n\nFounding-user perk: the full 2026 recruiting cycle is free for you. We'll roll out paid tiers after launch — you're grandfathered.\n\nSome rough edges are expected — we're shipping fixes daily. Use the Feedback button inside the app to flag anything.\n\n— Demetris, Evangelos, Christos, Theofanis\n4 students at Rice, Brown, and MIT, in the IB cycle right now too.`;
  return { subject, html, text };
}
