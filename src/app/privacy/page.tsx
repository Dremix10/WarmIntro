import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Alma",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#EAE3D2] py-16">
      <div className="mx-auto max-w-2xl px-6">
        <h1 className="mb-2 text-3xl font-[family-name:var(--font-fraunces)] tracking-tight text-[#14182A]">
          Privacy Policy
        </h1>
        <p className="mb-8 text-sm text-[#8A8674]">Last updated: April 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-[#2A2F3B]">
          <Section title="What Alma Is">
            <p>
              Alma is a networking tool that helps Brown and Rice University students break into
              investment banking — finding alumni bankers, drafting outreach, and tracking the pipeline
              from a first networking call through superday.
            </p>
          </Section>

          <Section title="Data We Collect">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Account info</strong> — email address and password (or LinkedIn profile if you sign in with LinkedIn)</li>
              <li><strong>Resume data</strong> — name, university, major, skills, work experience, and target coverage groups (parsed from your uploaded resume)</li>
              <li><strong>Usage data</strong> — banks you select, outreach you send, pipeline progress, and XP/badges</li>
              <li><strong>Connection notes</strong> — any coffee chat notes or transcripts you upload for AI analysis</li>
              <li><strong>Gmail data (opt-in)</strong> — if you connect Gmail for Alma to send + track replies, we access only messages related to your Alma threads</li>
            </ul>
          </Section>

          <Section title="How We Use Your Data">
            <ul className="list-disc space-y-1 pl-5">
              <li>Match you with alumni bankers at your target banks and groups</li>
              <li>Generate personalized networking call requests using AI</li>
              <li>Track your pipeline through the IB funnel (calls → replies → coffee → referral → first round → superday → offer)</li>
              <li>Summarize coffee chat notes and provide coaching</li>
              <li>Power the cohort leaderboard (only if you opt in to resume sharing)</li>
            </ul>
          </Section>

          <Section title="Third-Party Services">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Supabase</strong> — database and authentication (your data is stored with row-level security so only you can access it)</li>
              <li><strong>Anthropic (Claude API)</strong> — AI text generation for resume parsing, outreach drafts, coaching, and note summaries. Your prompts are sent to Claude but are not used to train their models.</li>
              <li><strong>Google OAuth + Gmail API</strong> — if you opt in, used to send outreach and detect replies</li>
              <li><strong>Hunter.io + Google Serper</strong> — banker email lookup and LinkedIn discovery</li>
              <li><strong>Vercel</strong> — application hosting</li>
            </ul>
          </Section>

          <Section title="Data Sharing">
            <p>
              We do not sell your data. We do not share your personal information with third parties
              except as needed to provide the service (the APIs listed above). If you opt in to
              resume sharing on the cohort leaderboard, other opted-in classmates can see your parsed resume data.
            </p>
          </Section>

          <Section title="Data Storage and Security">
            <p>
              Your data is stored in Supabase with row-level security — only your authenticated account
              can read or modify your data. Passwords are hashed by Supabase Auth. All connections use HTTPS.
              OAuth tokens are encrypted at rest.
            </p>
          </Section>

          <Section title="Your Rights">
            <ul className="list-disc space-y-1 pl-5">
              <li>You can delete your account and all associated data at any time</li>
              <li>You can export your data by contacting us</li>
              <li>You can opt out of resume sharing on the cohort leaderboard</li>
              <li>You can revoke Gmail access at any time from your Google account settings</li>
            </ul>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy? Reach out to the Alma team — we&rsquo;re Brown and Rice
              students ourselves.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-[#D9CFB5] pt-6">
          <Link href="/" className="text-sm font-medium text-[#1B3B5F] hover:underline">
            &larr; Back to Alma
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold text-[#14182A]">{title}</h2>
      {children}
    </div>
  );
}
