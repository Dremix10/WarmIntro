"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";

interface SentDraft {
  id: string;
  banker_id: string | null;
  subject: string | null;
  body: string;
  sent_at: string | null;
  sent_message_id: string | null;
  bankers: { name: string; title: string; firms: { name: string } | null } | null;
}

interface WatcherSignal {
  id: string;
  signal_type: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
  banker_id: string | null;
  draft_id: string | null;
}

interface AlmaMail {
  id: string;
  signal_type: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

interface ActivityResponse {
  sent: SentDraft[];
  watcher: WatcherSignal[];
  almaEmails: AlmaMail[];
}

export default function PrivacyActivityPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login");
      return;
    }
    if (session) load();
    // Use user.id — token refresh shouldn't refetch.
  }, [authLoading, session?.user?.id]);

  async function load() {
    setLoading(true);
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/account/activity", {
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E5A88] border-t-transparent" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-2">Transparency</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-3">What Alma touched in your Gmail</h1>
        <p className="text-sm text-[#14182A]/70 font-[family-name:var(--font-fraunces)] italic mb-8">
          Every email Alma sent on your behalf, every reply it detected, every outbound from Alma to you. If anything here
          looks like Alma read something it shouldn&apos;t have — tell us and we&apos;ll fix it.
        </p>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard label="Sent on your behalf" value={data?.sent.length ?? 0} />
          <StatCard label="Replies detected" value={data?.watcher.filter((s) => s.signal_type === "reply_received").length ?? 0} />
          <StatCard label="Night previews from Alma" value={data?.almaEmails.filter((s) => s.signal_type === "night_preview_sent").length ?? 0} />
        </div>

        {/* Sent emails */}
        <Section title="Emails Alma sent for you" subtitle="Every cold outreach, follow-up, and reply sent from your Gmail by Alma.">
          {data?.sent.length === 0 ? (
            <Empty text="Alma hasn't sent anything yet." />
          ) : (
            <div className="space-y-3">
              {data?.sent.map((d) => (
                <div key={d.id} className="rounded-2xl bg-white p-4 border border-[#D9CFB5]">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div>
                      <p className="text-sm font-medium">{d.bankers?.name ?? "Unknown"} — {d.bankers?.title ?? ""}{d.bankers?.firms?.name ? ` at ${d.bankers.firms.name}` : ""}</p>
                      {d.subject && <p className="text-xs text-[#14182A]/60 mt-0.5">{d.subject}</p>}
                    </div>
                    <span className="text-xs text-[#14182A]/40 shrink-0">{d.sent_at ? new Date(d.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</span>
                  </div>
                  <details className="text-xs text-[#14182A]/70">
                    <summary className="cursor-pointer hover:underline">view body</summary>
                    <pre className="whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] mt-2 bg-[#EAE3D2]/50 p-3 rounded-lg">{d.body}</pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Watcher events */}
        <Section title="Replies Alma detected" subtitle="Alma only reads email threads tied to messages it sent on your behalf. If a thread isn't in this list, Alma never saw it.">
          {data?.watcher.length === 0 ? (
            <Empty text="No replies yet. Alma will log one here the moment a banker replies to an Alma-sent thread." />
          ) : (
            <div className="space-y-2">
              {data?.watcher.map((s) => (
                <div key={s.id} className="rounded-xl bg-white border border-[#D9CFB5] p-3 flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs font-medium">{s.signal_type.replaceAll("_", " ")}</p>
                    <p className="text-xs text-[#14182A]/60 mt-0.5">{JSON.stringify(s.metadata).slice(0, 180)}</p>
                  </div>
                  <span className="text-xs text-[#14182A]/40 shrink-0">{new Date(s.occurred_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Alma-to-you emails */}
        <Section title="Alma emailing you" subtitle="Night previews, digests, weekly recaps. These are emails FROM Alma TO you — separate from anything Alma sent to bankers.">
          {(data?.almaEmails.length ?? 0) === 0 ? (
            <Empty text="Nothing sent yet — night previews start after your first active day." />
          ) : (
            <div className="space-y-2">
              {data?.almaEmails.map((s) => (
                <div key={s.id} className="rounded-xl bg-white border border-[#D9CFB5] p-3 flex justify-between items-start gap-3">
                  <p className="text-xs font-medium">{s.signal_type.replaceAll("_", " ")}</p>
                  <span className="text-xs text-[#14182A]/40 shrink-0">{new Date(s.occurred_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* What Alma can theoretically see */}
        <Section title="About the Gmail permissions" subtitle="">
          <div className="rounded-2xl bg-white p-5 border border-[#D9CFB5] text-sm text-[#14182A]/80 space-y-3">
            <p>
              Google&apos;s OAuth scopes are coarse — there&apos;s no &ldquo;only read messages tied to emails I sent via this app&rdquo; scope. Alma requests two:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>gmail.compose</code> — lets Alma save drafts to your Gmail Drafts folder and send from your address. Does NOT grant read access to other email.</li>
              <li><code>gmail.readonly</code> — technically grants read access to your whole inbox. We use it only to check for replies on threads Alma sent. Every query is logged above.</li>
            </ul>
            <p>
              You can revoke access anytime at{" "}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="underline text-[#2E5A88]">
                myaccount.google.com/permissions
              </a>.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 border border-[#D9CFB5]">
      <p className="font-[family-name:var(--font-fraunces)] text-3xl">{value}</p>
      <p className="text-xs text-[#14182A]/60 mt-1">{label}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-[family-name:var(--font-fraunces)] text-xl mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-[#14182A]/60 italic font-[family-name:var(--font-fraunces)] mb-3">{subtitle}</p>}
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl bg-white/60 p-4 border border-[#D9CFB5] text-sm text-[#14182A]/60 italic">{text}</div>;
}
