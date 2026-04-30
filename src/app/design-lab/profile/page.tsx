import { IndustryPicker } from "./_parts/IndustryPicker";

const PROFILE = {
  name: "Kinsey Harper",
  university: "Brown University",
  major: "Computer Science",
  classOf: 2027,
  gpa: 3.78,
  location: "Providence, RI",
  pronouns: "she/her",
};

const EDUCATION = [
  {
    school: "Brown University",
    degree: "B.S. Computer Science",
    dates: "2023 – 2027",
    detail: "GPA 3.78 · Concentration: Software Systems · Relevant coursework: Algorithms, Distributed Systems, Computer Vision, HCI",
  },
];

const EXPERIENCE = [
  {
    role: "Software Engineering Intern",
    org: "Cloudflare",
    dates: "Summer 2025",
    bullets: [
      "Built an internal analytics dashboard used by 40+ engineers",
      "Shipped 3 features in the Workers AI product area",
      "Stack: React, TypeScript, Rust (first time!), Postgres",
    ],
  },
  {
    role: "Research Assistant",
    org: "Brown Visual Computing Lab",
    dates: "Sept 2024 – present",
    bullets: [
      "Computer vision research on low-light image reconstruction",
      "Co-authored one workshop paper, submitted to CVPR 2026",
      "Python, PyTorch, CUDA",
    ],
  },
  {
    role: "Teaching Assistant",
    org: "CS32 · Introduction to OOP",
    dates: "Fall 2024",
    bullets: [
      "Led weekly section for 22 students",
      "Graded projects, held 4 hours of office hours per week",
    ],
  },
];

const SKILLS = {
  Languages: ["TypeScript", "Python", "Rust (beginner)", "Java"],
  Frameworks: ["React", "Next.js", "PyTorch", "Express"],
  Tools: ["Figma", "Postgres", "AWS basics", "Docker"],
  Interests: ["Product engineering", "Dev tools", "Distributed systems", "HCI"],
};

const EXTRACURRICULARS = [
  { role: "VP", org: "Brown Women in Computer Science (WICS)", dates: "2024 – present", note: "runs monthly alumni coffees — ask her about this" },
  { role: "Organizer", org: "Hack@Brown", dates: "2024 – present", note: "250-person annual hackathon" },
  { role: "Member", org: "Brown CS Crew (social)", dates: "2023 – present" },
];

export default function ProfileTemplate() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-40">
        <Header />

        <div className="mt-14">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">Resume read · confidence 94%</p>
          <h1 className="mt-4 text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
            Alma read your resume, <span className="italic text-[#2E5A88]">{PROFILE.name.split(" ")[0]}</span>.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-[#4A5260]">
            Here’s what we picked up. Give it a look — anything wrong, click to fix.
            Once it feels right, pick one to three industries where you want to land, and we’ll
            build your company shortlist.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-[#D9CFB5] bg-white p-6">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2E5A88] to-[#1B3B5F] text-2xl font-[family-name:var(--font-fraunces)] text-white">
              {PROFILE.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <h2 className="text-2xl font-[family-name:var(--font-fraunces)] leading-tight text-[#14182A]">
                  {PROFILE.name}
                </h2>
                <span className="text-xs text-[#5C6472]">{PROFILE.pronouns}</span>
              </div>
              <p className="mt-1 text-sm text-[#4A5260]">
                {PROFILE.university} · {PROFILE.major} · Class of {PROFILE.classOf}
              </p>
              <p className="mt-0.5 text-xs text-[#5C6472]">
                GPA {PROFILE.gpa.toFixed(2)} · {PROFILE.location}
              </p>
            </div>
            <EditButton />
          </div>
        </div>

        <Section label="Education">
          {EDUCATION.map((e) => (
            <Entry key={e.school} title={e.degree} org={e.school} dates={e.dates} detail={e.detail} />
          ))}
        </Section>

        <Section label="Experience">
          {EXPERIENCE.map((e) => (
            <div key={e.role + e.org} className="border-b border-[#ECE5D0] py-4 last:border-0 last:pb-0 first:pt-0">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-semibold text-[#14182A]">
                  {e.role} <span className="font-normal text-[#5C6472]">· {e.org}</span>
                </p>
                <p className="shrink-0 text-xs text-[#5C6472]">{e.dates}</p>
              </div>
              <ul className="mt-2 space-y-1.5">
                {e.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-xs text-[#4A5260]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#D9CFB5]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        <Section label="Skills Alma noticed">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(SKILLS).map(([group, items]) => (
              <div key={group}>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{group}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-[#D9CFB5] bg-[#FBF7EC] px-2.5 py-1 text-[11px] font-medium text-[#14182A]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section label="Outside of class">
          {EXTRACURRICULARS.map((x) => (
            <div key={x.role + x.org} className="flex items-start justify-between gap-4 border-b border-[#ECE5D0] py-3 last:border-0 last:pb-0 first:pt-0">
              <div>
                <p className="text-sm font-semibold text-[#14182A]">
                  {x.role} <span className="font-normal text-[#5C6472]">· {x.org}</span>
                </p>
                {x.note && (
                  <p className="mt-0.5 text-xs italic text-[#5C6472] font-[family-name:var(--font-fraunces)]">
                    Alma noted: {x.note}
                  </p>
                )}
              </div>
              <p className="shrink-0 text-xs text-[#5C6472]">{x.dates}</p>
            </div>
          ))}
        </Section>

        <div className="mt-10 rounded-2xl border border-[#D9CFB5] bg-[#F4EDDB] p-5">
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none">✦</span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Alma’s take on you</p>
              <p className="mt-2 text-sm leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)] italic">
                “You&rsquo;re positioned well for banking. 3.78 GPA clears the BB screen, the Cloudflare
                intern is a real story to pitch, and WICS leadership is a strong narrative. TMT is
                the obvious group given your CS background, but don&rsquo;t sleep on M&A or Healthcare —
                your bullets convert there too. Start calls by Labor Day; apps open in September.”
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">Next step</p>
          <h2 className="mt-3 text-3xl font-[family-name:var(--font-fraunces)] text-[#14182A]">
            Which <span className="italic text-[#2E5A88]">coverage groups?</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#4A5260]">
            Pick one to three groups to focus on — M&amp;A, TMT, Healthcare, Restructuring, whatever
            fits your story. Alma uses this to rank every bank and seed your networking list.
          </p>
        </div>

        <IndustryPicker />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
      <nav className="flex items-center gap-6 text-sm text-[#5C6472]">
        <span>Pipeline</span>
        <span>Companies</span>
        <span>CRM</span>
        <span>Leaderboard</span>
        <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
      </nav>
    </header>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-[#D9CFB5] bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{label}</p>
        <EditButton />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EditButton() {
  return (
    <button
      type="button"
      className="text-[11px] font-medium text-[#2E5A88] hover:underline"
    >
      Edit
    </button>
  );
}

function Entry({ title, org, dates, detail }: { title: string; org: string; dates: string; detail?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-[#14182A]">
          {title} <span className="font-normal text-[#5C6472]">· {org}</span>
        </p>
        <p className="shrink-0 text-xs text-[#5C6472]">{dates}</p>
      </div>
      {detail && <p className="mt-1.5 text-xs leading-relaxed text-[#4A5260]">{detail}</p>}
    </div>
  );
}
