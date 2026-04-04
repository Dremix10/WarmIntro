import type {
  ParseResumeRequest,
  ParseResumeResponse,
  FindCompaniesRequest,
  FindCompaniesResponse,
  FindAlumniRequest,
  FindAlumniResponse,
  GenerateOutreachRequest,
  GenerateOutreachResponse,
  UpdateFunnelRequest,
  UpdateFunnelResponse,
  UserProfile,
  Company,
  Alumni,
  WarmPath,
  FunnelState,
  GameState,
  OutreachDraft,
  Badge,
} from "@/shared/types";

const USE_MOCKS = false;

function randomDelay(): Promise<void> {
  const ms = 500 + Math.random() * 300;
  return new Promise((r) => setTimeout(r, ms));
}

// ===== MOCK DATA =====

const MOCK_PROFILE: UserProfile = {
  name: "Alex Rivera",
  university: "Rice University",
  graduationYear: 2027,
  major: "Mechanical Engineering",
  skills: [
    "SolidWorks",
    "Python",
    "MATLAB",
    "Lean Manufacturing",
    "FEA",
    "GD&T",
    "CAD Design",
    "Robotics",
    "3D Printing",
    "Data Analysis",
  ],
  experience: [
    {
      company: "Rice Robotics Lab",
      role: "Undergraduate Research Assistant",
      duration: "Jan 2025 – Present",
      highlights: [
        "Designed and prototyped adaptive gripper mechanisms for soft robotic manipulation",
        "Conducted FEA simulations to optimize gripper contact surfaces, improving grip reliability by 35%",
        "Programmed Arduino-based control systems for real-time sensor feedback loops",
      ],
    },
    {
      company: "Apex Manufacturing Solutions",
      role: "Manufacturing Engineering Intern",
      duration: "May 2025 – Aug 2025",
      highlights: [
        "Implemented Lean Manufacturing principles on assembly line, reducing cycle time by 18%",
        "Created SolidWorks assemblies and technical drawings for 12 custom fixtures",
        "Led root cause analysis for defect reduction, saving $45K annually",
      ],
    },
  ],
  targetIndustries: ["Automotive & Manufacturing"],
  targetRoles: [
    "Manufacturing Engineering Intern",
    "Process Engineering Intern",
    "Mechanical Engineering Intern",
    "Product Design Intern",
  ],
  resumeText: "",
};

const MOCK_COMPANIES: Company[] = [
  {
    id: "tesla",
    name: "Tesla",
    industry: "Automotive & Manufacturing",
    location: "Fremont, CA",
    size: "enterprise",
    description:
      "Electric vehicle and clean energy company revolutionizing transportation and energy storage.",
    logoPlaceholder: "T",
    alumniCount: 12,
    warmthScore: 82,
    openInternships: [
      {
        id: "tesla-mfg-1",
        companyId: "tesla",
        title: "Manufacturing Engineering Intern",
        location: "Fremont, CA",
        type: "summer",
        description:
          "Work on Gigafactory production lines optimizing assembly processes.",
        requirements: [
          "Mechanical Engineering major",
          "CAD proficiency",
          "Lean Manufacturing knowledge",
        ],
        matchScore: 92,
      },
      {
        id: "tesla-design-1",
        companyId: "tesla",
        title: "Mechanical Design Intern",
        location: "Palo Alto, CA",
        type: "summer",
        description:
          "Design and prototype components for next-generation vehicle platforms.",
        requirements: [
          "SolidWorks expertise",
          "FEA experience",
          "GD&T knowledge",
        ],
        matchScore: 88,
      },
    ],
  },
  {
    id: "toyota",
    name: "Toyota",
    industry: "Automotive & Manufacturing",
    location: "Georgetown, KY",
    size: "enterprise",
    description:
      "Global leader in automotive manufacturing known for the Toyota Production System and quality excellence.",
    logoPlaceholder: "TO",
    alumniCount: 8,
    warmthScore: 71,
    openInternships: [
      {
        id: "toyota-process-1",
        companyId: "toyota",
        title: "Process Engineering Intern",
        location: "Georgetown, KY",
        type: "summer",
        description:
          "Apply TPS principles to optimize production workflows in powertrain manufacturing.",
        requirements: [
          "Engineering major",
          "Lean/Six Sigma exposure",
          "MATLAB or Python",
        ],
        matchScore: 85,
      },
    ],
  },
  {
    id: "ford",
    name: "Ford Motor Company",
    industry: "Automotive & Manufacturing",
    location: "Dearborn, MI",
    size: "enterprise",
    description:
      "Iconic American automaker investing heavily in EV and autonomous vehicle technology.",
    logoPlaceholder: "F",
    alumniCount: 6,
    warmthScore: 65,
    openInternships: [
      {
        id: "ford-mfg-1",
        companyId: "ford",
        title: "Manufacturing Engineering Intern",
        location: "Dearborn, MI",
        type: "summer",
        description:
          "Support vehicle launch programs and production system optimization.",
        requirements: [
          "ME or IE major",
          "CAD skills",
          "Problem-solving aptitude",
        ],
        matchScore: 80,
      },
    ],
  },
  {
    id: "rivian",
    name: "Rivian",
    industry: "Automotive & Manufacturing",
    location: "Normal, IL",
    size: "mid",
    description:
      "Electric adventure vehicle manufacturer building the future of sustainable transportation.",
    logoPlaceholder: "R",
    alumniCount: 3,
    warmthScore: 58,
    openInternships: [
      {
        id: "rivian-design-1",
        companyId: "rivian",
        title: "Product Design Engineering Intern",
        location: "Irvine, CA",
        type: "summer",
        description:
          "Collaborate on next-gen vehicle interior and exterior component design.",
        requirements: [
          "SolidWorks or CATIA",
          "Prototyping experience",
          "Creative problem solving",
        ],
        matchScore: 78,
      },
    ],
  },
  {
    id: "gm",
    name: "General Motors",
    industry: "Automotive & Manufacturing",
    location: "Detroit, MI",
    size: "enterprise",
    description:
      "Legacy automaker transforming into an all-electric future with the Ultium platform.",
    logoPlaceholder: "GM",
    alumniCount: 5,
    warmthScore: 62,
    openInternships: [
      {
        id: "gm-mfg-1",
        companyId: "gm",
        title: "Manufacturing Engineering Intern",
        location: "Detroit, MI",
        type: "summer",
        description:
          "Drive continuous improvement initiatives across EV battery assembly lines.",
        requirements: [
          "Engineering major",
          "Lean Manufacturing",
          "Data analysis skills",
        ],
        matchScore: 83,
      },
    ],
  },
  {
    id: "lucid",
    name: "Lucid Motors",
    industry: "Automotive & Manufacturing",
    location: "Newark, CA",
    size: "mid",
    description:
      "Luxury EV manufacturer pushing the boundaries of range, performance, and design.",
    logoPlaceholder: "L",
    alumniCount: 2,
    warmthScore: 48,
    openInternships: [
      {
        id: "lucid-mech-1",
        companyId: "lucid",
        title: "Mechanical Engineering Intern",
        location: "Newark, CA",
        type: "summer",
        description:
          "Support powertrain and chassis engineering teams on prototype development.",
        requirements: [
          "ME major",
          "FEA proficiency",
          "Hands-on prototyping",
        ],
        matchScore: 76,
      },
    ],
  },
  {
    id: "hyundai",
    name: "Hyundai Motor Group",
    industry: "Automotive & Manufacturing",
    location: "Savannah, GA",
    size: "enterprise",
    description:
      "South Korean automotive conglomerate with rapid EV expansion and advanced manufacturing in the US.",
    logoPlaceholder: "H",
    alumniCount: 4,
    warmthScore: 55,
    openInternships: [
      {
        id: "hyundai-quality-1",
        companyId: "hyundai",
        title: "Quality Engineering Intern",
        location: "Savannah, GA",
        type: "summer",
        description:
          "Implement quality control systems for new EV manufacturing facility.",
        requirements: [
          "Engineering major",
          "Statistical analysis",
          "GD&T knowledge",
        ],
        matchScore: 74,
      },
    ],
  },
  {
    id: "byd",
    name: "BYD",
    industry: "Automotive & Manufacturing",
    location: "Los Angeles, CA",
    size: "enterprise",
    description:
      "World's largest EV manufacturer expanding North American operations in buses and passenger vehicles.",
    logoPlaceholder: "B",
    alumniCount: 1,
    warmthScore: 35,
    openInternships: [
      {
        id: "byd-mfg-1",
        companyId: "byd",
        title: "Manufacturing Process Intern",
        location: "Lancaster, CA",
        type: "summer",
        description:
          "Optimize bus assembly line processes and support quality initiatives.",
        requirements: [
          "Engineering major",
          "Process improvement interest",
          "Bilingual a plus",
        ],
        matchScore: 68,
      },
    ],
  },
  {
    id: "volvo",
    name: "Volvo Cars",
    industry: "Automotive & Manufacturing",
    location: "Ridgeville, SC",
    size: "enterprise",
    description:
      "Swedish premium automaker committed to full electrification by 2030 with a US manufacturing presence.",
    logoPlaceholder: "V",
    alumniCount: 3,
    warmthScore: 52,
    openInternships: [
      {
        id: "volvo-safety-1",
        companyId: "volvo",
        title: "Safety Engineering Intern",
        location: "Ridgeville, SC",
        type: "summer",
        description:
          "Support crash simulation and occupant protection system development.",
        requirements: [
          "ME or Aerospace major",
          "FEA skills",
          "MATLAB proficiency",
        ],
        matchScore: 72,
      },
    ],
  },
  {
    id: "bmw",
    name: "BMW Group",
    industry: "Automotive & Manufacturing",
    location: "Spartanburg, SC",
    size: "enterprise",
    description:
      "German luxury automaker with the largest BMW plant in the world located in South Carolina.",
    logoPlaceholder: "BMW",
    alumniCount: 4,
    warmthScore: 60,
    openInternships: [
      {
        id: "bmw-prod-1",
        companyId: "bmw",
        title: "Production Engineering Intern",
        location: "Spartanburg, SC",
        type: "summer",
        description:
          "Support production planning and process optimization in body shop and assembly.",
        requirements: [
          "ME or IE major",
          "CAD experience",
          "Lean knowledge preferred",
        ],
        matchScore: 79,
      },
    ],
  },
];

const MOCK_TESLA_ALUMNI: Alumni[] = [
  {
    id: "alumni-1",
    name: "Sarah Chen",
    university: "Rice University",
    graduationYear: 2022,
    major: "Mechanical Engineering",
    currentCompany: "Tesla",
    currentRole: "Senior Manufacturing Engineer",
    linkedinUrl: "https://linkedin.com/in/sarahchen",
    connectionStrength: "strong",
    sharedBackground: [
      "Mechanical Engineering",
      "Rice Robotics Club",
      "Rice Engineering Student Council",
    ],
  },
  {
    id: "alumni-2",
    name: "James Park",
    university: "Rice University",
    graduationYear: 2021,
    major: "Electrical Engineering",
    currentCompany: "Tesla",
    currentRole: "Battery Systems Engineer",
    linkedinUrl: "https://linkedin.com/in/jamespark",
    connectionStrength: "medium",
    sharedBackground: ["Engineering Student Council"],
  },
  {
    id: "alumni-3",
    name: "Maria Gonzalez",
    university: "Rice University",
    graduationYear: 2024,
    major: "Mechanical Engineering",
    currentCompany: "Tesla",
    currentRole: "Process Engineer",
    linkedinUrl: "https://linkedin.com/in/mariagonzalez",
    connectionStrength: "strong",
    sharedBackground: [
      "Mechanical Engineering",
      "Rice Robotics Club",
      "Houston resident",
    ],
  },
  {
    id: "alumni-4",
    name: "David Kim",
    university: "Rice University",
    graduationYear: 2019,
    major: "Materials Science",
    currentCompany: "Tesla",
    currentRole: "Staff Engineer, Gigafactory",
    linkedinUrl: "https://linkedin.com/in/davidkim",
    connectionStrength: "weak",
    sharedBackground: ["Engineering division"],
  },
  {
    id: "alumni-5",
    name: "Priya Patel",
    university: "Rice University",
    graduationYear: 2023,
    major: "Industrial Engineering",
    currentCompany: "Tesla",
    currentRole: "Manufacturing Quality Engineer",
    linkedinUrl: "https://linkedin.com/in/priyapatel",
    connectionStrength: "medium",
    sharedBackground: [
      "Engineering Student Council",
      "Lean Manufacturing focus",
    ],
  },
];

const MOCK_WARM_PATHS: WarmPath[] = [
  {
    alumni: MOCK_TESLA_ALUMNI[0],
    narrative:
      "Sarah graduated from Rice MechE just 5 years ago and was in Rice Robotics Club — the same club you lead. She now leads manufacturing engineering at Tesla's Fremont plant. This is your strongest connection.",
    suggestedOpener:
      "Hi Sarah! I'm a fellow Rice MechE and current president of the Robotics Club. I'd love to hear about your path from Rice to Tesla's manufacturing team.",
    warmthScore: 92,
  },
  {
    alumni: MOCK_TESLA_ALUMNI[1],
    narrative:
      "James was on Engineering Student Council like you. Though he's in EE, his battery systems work overlaps with your manufacturing interests at Tesla.",
    suggestedOpener:
      "Hi James! Fellow Rice engineer here — I was on ESC too. I'm exploring manufacturing roles at Tesla and would love your perspective.",
    warmthScore: 65,
  },
  {
    alumni: MOCK_TESLA_ALUMNI[2],
    narrative:
      "Maria is a recent Rice MechE grad (2024) who was also in Robotics Club. She's only been at Tesla for a year, so she remembers the recruiting process well.",
    suggestedOpener:
      "Hi Maria! I'm a current Rice MechE in Robotics Club — just like you were! I'm targeting manufacturing internships and would love to hear about your experience at Tesla.",
    warmthScore: 88,
  },
  {
    alumni: MOCK_TESLA_ALUMNI[3],
    narrative:
      "David is a senior staff engineer at the Gigafactory. Different major (MatSci) and graduated 8 years ago, but his seniority means he could be a powerful referral source.",
    suggestedOpener:
      "Hi David! I'm a Rice engineering student exploring manufacturing roles. Your work at the Gigafactory is fascinating — would you have 15 minutes for a coffee chat?",
    warmthScore: 45,
  },
  {
    alumni: MOCK_TESLA_ALUMNI[4],
    narrative:
      "Priya shares your passion for Lean Manufacturing and was on ESC. Her quality engineering role aligns well with your manufacturing internship goals.",
    suggestedOpener:
      "Hi Priya! Fellow Rice engineer and ESC member here. Your work in manufacturing quality at Tesla aligns perfectly with my interests — I'd love to connect.",
    warmthScore: 72,
  },
];

const MOCK_FUNNEL: FunnelState = {
  stages: [
    {
      id: "stage-1",
      name: "Initial Outreach",
      targetCount: 100,
      currentCount: 5,
      conversionRate: 0.3,
      color: "#5DCAA5",
      icon: "📧",
    },
    {
      id: "stage-2",
      name: "Coffee Chat",
      targetCount: 30,
      currentCount: 1,
      conversionRate: 0.5,
      color: "#85B7EB",
      icon: "☕",
    },
    {
      id: "stage-3",
      name: "Warm Referral",
      targetCount: 15,
      currentCount: 0,
      conversionRate: 0.4,
      color: "#ED93B1",
      icon: "🤝",
    },
    {
      id: "stage-4",
      name: "Interview",
      targetCount: 6,
      currentCount: 0,
      conversionRate: 0.5,
      color: "#F0997B",
      icon: "🎯",
    },
    {
      id: "stage-5",
      name: "Offer",
      targetCount: 3,
      currentCount: 0,
      conversionRate: 0.33,
      color: "#AFA9EC",
      icon: "🎉",
    },
  ],
  totalOutreachNeeded: 100,
  totalOutreachDone: 5,
  estimatedOffers: 1,
  weekNumber: 2,
};

const MOCK_GAME_STATE: GameState = {
  xp: 50,
  level: 1,
  levelName: "Networking Novice",
  streak: 2,
  badges: [
    {
      id: "first_outreach",
      name: "First Outreach",
      icon: "🚀",
      earned: true,
      earnedAt: "2026-04-02T10:30:00Z",
    },
    {
      id: "ten_sent",
      name: "10 Emails Sent",
      icon: "📨",
      earned: false,
    },
    {
      id: "first_reply",
      name: "First Reply!",
      icon: "💬",
      earned: false,
    },
    {
      id: "five_coffees",
      name: "5 Coffee Chats",
      icon: "☕",
      earned: false,
    },
    {
      id: "first_referral",
      name: "Referral Unlocked",
      icon: "🔑",
      earned: false,
    },
    {
      id: "streak_7",
      name: "7-Day Streak",
      icon: "🔥",
      earned: false,
    },
    {
      id: "offer_secured",
      name: "Offer Secured",
      icon: "🏆",
      earned: false,
    },
  ],
  recentActions: [
    {
      type: "outreach_sent",
      xpGained: 10,
      description: "Sent outreach to Sarah Chen at Tesla",
      timestamp: "2026-04-03T14:20:00Z",
    },
    {
      type: "outreach_sent",
      xpGained: 10,
      description: "Sent outreach to Maria Gonzalez at Tesla",
      timestamp: "2026-04-03T14:35:00Z",
    },
    {
      type: "outreach_sent",
      xpGained: 10,
      description: "Sent outreach to James Park at Tesla",
      timestamp: "2026-04-02T10:30:00Z",
    },
    {
      type: "outreach_sent",
      xpGained: 10,
      description: "Sent outreach to Priya Patel at Tesla",
      timestamp: "2026-04-02T11:00:00Z",
    },
    {
      type: "coffee_booked",
      xpGained: 50,
      description: "Coffee chat scheduled with Sarah Chen",
      timestamp: "2026-04-03T16:00:00Z",
    },
  ],
};

const MOCK_OUTREACH_DRAFTS: OutreachDraft[] = [
  {
    id: "draft-email-1",
    alumniId: "alumni-1",
    companyId: "tesla",
    subject:
      "Fellow Rice MechE & Robotics Club member — quick question about Tesla",
    body: `Hi Sarah,

I hope this message finds you well! My name is Alex Rivera, and I'm a junior studying Mechanical Engineering at Rice University. I'm currently the president of the Rice Robotics Club — I saw that you were a member during your time at Rice, which is awesome!

I've been following your career at Tesla with great interest, especially your work in manufacturing engineering at the Fremont plant. As someone passionate about robotics and manufacturing optimization, I'd love to learn more about your experience.

I'm currently exploring manufacturing engineering internship opportunities for Summer 2026, and Tesla is at the top of my list. Would you have 15-20 minutes for a virtual coffee chat sometime in the next couple of weeks? I'd love to hear about:

- Your journey from Rice to Tesla
- What a typical day looks like in manufacturing engineering
- Any advice for a fellow Owl looking to break into the EV industry

Thank you so much for your time, and Go Owls! 🦉

Best regards,
Alex Rivera
Rice University '27 | Mechanical Engineering
Rice Robotics Club President`,
    channel: "email",
    tone: "warm",
  },
  {
    id: "draft-linkedin-1",
    alumniId: "alumni-1",
    companyId: "tesla",
    subject: "Connection request",
    body: `Hi Sarah! I'm a fellow Rice MechE and current Robotics Club president. I'd love to connect and hear about your path from Rice to Tesla's manufacturing team. Your work on production optimization is exactly the kind of career I'm working toward. Would you be open to a quick chat? Go Owls! 🦉`,
    channel: "linkedin",
    tone: "warm",
  },
];

// ===== API FUNCTIONS =====

export async function parseResume(
  req: ParseResumeRequest
): Promise<ParseResumeResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    return {
      profile: { ...MOCK_PROFILE, resumeText: req.resumeText },
    };
  }
  const res = await fetch("/api/parse-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function findCompanies(
  req: FindCompaniesRequest
): Promise<FindCompaniesResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    const filtered = MOCK_COMPANIES.filter(
      (c) =>
        req.industries.length === 0 || req.industries.includes(c.industry)
    );
    return {
      companies: filtered.sort((a, b) => b.warmthScore - a.warmthScore),
    };
  }
  const res = await fetch("/api/find-companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function findAlumni(
  req: FindAlumniRequest
): Promise<FindAlumniResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    if (req.companyId === "tesla") {
      return {
        alumni: MOCK_TESLA_ALUMNI,
        warmPaths: MOCK_WARM_PATHS,
      };
    }
    return { alumni: [], warmPaths: [] };
  }
  const res = await fetch("/api/find-alumni", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function generateOutreach(
  req: GenerateOutreachRequest
): Promise<GenerateOutreachResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    return {
      drafts: MOCK_OUTREACH_DRAFTS.map((d) => ({
        ...d,
        alumniId: req.alumni.id,
        companyId: req.company.id,
      })),
    };
  }
  const res = await fetch("/api/generate-outreach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}

export async function updateFunnel(
  req: UpdateFunnelRequest
): Promise<UpdateFunnelResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    const updatedFunnel = { ...MOCK_FUNNEL };
    const updatedGame = { ...MOCK_GAME_STATE };
    let xpGained = 0;
    const newBadges: Badge[] = [];

    switch (req.action) {
      case "outreach_sent":
        updatedFunnel.stages[0].currentCount += 1;
        updatedFunnel.totalOutreachDone += 1;
        xpGained = 10;
        break;
      case "reply_received":
        updatedFunnel.stages[1].currentCount += 1;
        xpGained = 25;
        break;
      case "coffee_booked":
        updatedFunnel.stages[1].currentCount += 1;
        xpGained = 50;
        break;
      case "referral_earned":
        updatedFunnel.stages[2].currentCount += 1;
        xpGained = 100;
        break;
    }

    updatedGame.xp += xpGained;
    updatedGame.recentActions = [
      {
        type: req.action,
        xpGained,
        description: `Action: ${req.action} for company ${req.companyId}`,
        timestamp: new Date().toISOString(),
      },
      ...updatedGame.recentActions,
    ];

    return {
      funnel: updatedFunnel,
      gameState: updatedGame,
      xpGained,
      newBadges,
    };
  }
  const res = await fetch("/api/update-funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}
