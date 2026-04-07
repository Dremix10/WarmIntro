import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — WarmIntro",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="mx-auto max-w-2xl px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: April 2026</p>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <Section title="What WarmIntro Is">
            <p>
              WarmIntro is a networking tool that helps university students find alumni at target companies
              and generate personalized outreach. It is built by Rice University students.
            </p>
          </Section>

          <Section title="Data We Collect">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account info</strong> — email address and password (or LinkedIn profile if you sign in with LinkedIn)</li>
              <li><strong>Resume data</strong> — name, university, major, skills, work experience, and target roles (parsed from your uploaded resume)</li>
              <li><strong>Usage data</strong> — companies you select, outreach you send, pipeline progress, and XP/badges</li>
              <li><strong>Connection notes</strong> — any coffee chat notes or transcripts you upload for AI analysis</li>
            </ul>
          </Section>

          <Section title="How We Use Your Data">
            <ul className="list-disc pl-5 space-y-1">
              <li>Match you with alumni at your target companies</li>
              <li>Generate personalized outreach drafts using AI</li>
              <li>Track your networking pipeline and gamification progress</li>
              <li>Summarize coffee chat notes and provide coaching tips</li>
              <li>Power the leaderboard (only if you opt in to resume sharing)</li>
            </ul>
          </Section>

          <Section title="Third-Party Services">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — database and authentication (your data is stored with row-level security so only you can access it)</li>
              <li><strong>Anthropic (Claude API)</strong> — AI text generation for resume parsing, outreach drafts, coaching tips, and note summaries. Your prompts are sent to Claude but are not used to train their models.</li>
              <li><strong>Google Serper API</strong> — LinkedIn profile lookups to find real alumni at companies</li>
              <li><strong>Vercel</strong> — application hosting</li>
            </ul>
          </Section>

          <Section title="Data Sharing">
            <p>
              We do not sell your data. We do not share your personal information with third parties
              except as needed to provide the service (the APIs listed above). If you opt in to
              resume sharing on the leaderboard, other opted-in members can see your parsed resume data.
            </p>
          </Section>

          <Section title="Data Storage and Security">
            <p>
              Your data is stored in Supabase with row-level security — only your authenticated account
              can read or modify your data. Passwords are hashed by Supabase Auth. All connections use HTTPS.
            </p>
          </Section>

          <Section title="Your Rights">
            <ul className="list-disc pl-5 space-y-1">
              <li>You can delete your account and all associated data at any time</li>
              <li>You can export your data by contacting us</li>
              <li>You can opt out of resume sharing on the leaderboard</li>
            </ul>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy? Reach out to the WarmIntro team at Rice University.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200">
          <a href="/" className="text-sm text-emerald-600 font-medium hover:underline">
            &larr; Back to WarmIntro
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 mb-2">{title}</h2>
      {children}
    </div>
  );
}
