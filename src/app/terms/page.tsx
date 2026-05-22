export const metadata = {
  title: "Terms of Service · Alma",
  description: "Terms of service for Alma — the AI recruiting team for students breaking into investment banking.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">Terms of Service</h1>
        <p className="text-xs text-[#14182A]/50 mb-10">Last updated: 2026-04-24</p>

        <div className="prose prose-sm space-y-5 text-[#14182A]/80">
          <p>
            Alma (&ldquo;we&rdquo;, &ldquo;our&rdquo;) is a private-beta recruiting tool for students pursuing
            investment banking. By using Alma you agree to these terms. If you don&apos;t
            agree, don&apos;t use Alma.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-xl pt-4">Who can use Alma</h2>
          <p>
            Alma is currently invite-only and limited to approved students with verified school email addresses.
            You must be 18 or older. You must be a real person, not an automated agent or company.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-xl pt-4">What Alma does on your behalf</h2>
          <p>
            With your permission (via Gmail OAuth), Alma will:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Draft professional networking emails in your voice to investment banking professionals you target.</li>
            <li>Send those emails from your Gmail account (only those you approve, per your configured trust level).</li>
            <li>Watch your inbox for replies to emails Alma sent on your behalf, to advance your recruiting pipeline.</li>
          </ul>
          <p>
            Alma only reads email threads tied to outbound messages it sent for you. Alma does not read unrelated
            email. You can revoke access at any time from your{" "}
            <a href="https://myaccount.google.com/permissions" className="underline">Google Account permissions page</a>.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-xl pt-4">Your data</h2>
          <p>
            See our <a href="/privacy" className="underline">Privacy Policy</a> for the full picture. In short:
            we store the resume you upload, the profile you configure, the emails Alma drafts and sends, and the
            replies Alma detects. We use this data to run the product for you and to improve match quality for other
            students. We do not sell your data.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-xl pt-4">What you&apos;re responsible for</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>The content of emails sent via Alma — you approve and authorize every send (or set trust level = A).</li>
            <li>Compliance with your school&apos;s honor code and any recruiting program rules.</li>
            <li>Maintaining the security of your account and Gmail connection.</li>
          </ul>

          <h2 className="font-[family-name:var(--font-fraunces)] text-xl pt-4">What Alma isn&apos;t</h2>
          <p>
            Alma is not career counseling or a guarantee of employment. Recruitment outcomes depend on many factors
            Alma does not control. Alma is a tool, not a promise.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-xl pt-4">Service availability</h2>
          <p>
            Private beta. Features change frequently. Alma may be unavailable at times. We&apos;ll try not to lose your
            data but we can&apos;t guarantee uptime.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-xl pt-4">Ending use</h2>
          <p>
            You can delete your account and associated data at any time by emailing the founders. We may terminate
            accounts for abuse, fraud, or violations of these terms.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-xl pt-4">Contact</h2>
          <p>
            Founders: Demetris Chrysostomou (Rice &apos;28) &amp; Evangelos Paraskeva (Brown &apos;28). Reach us at{" "}
            <a href="mailto:founders@alma.careers" className="underline">founders@alma.careers</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
