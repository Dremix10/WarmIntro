import type { UserProfile } from "@/shared/types";
import type { LeaderboardMember } from "@/components/AppProvider";

export const MOCK_PROFILES: Record<string, UserProfile> = {
  "jordan-lee": {
    name: "Jordan Lee",
    university: "Rice University",
    graduationYear: 2027,
    major: "Computer Science",
    skills: ["Python", "React", "TypeScript", "Machine Learning", "SQL", "AWS", "Docker", "Git"],
    experience: [
      { company: "Rice CS Department", role: "Teaching Assistant — COMP 140", duration: "Aug 2025 – Present", highlights: ["Led weekly lab sessions for 30+ students in introductory CS", "Developed autograder scripts reducing grading time by 60%"] },
      { company: "StartupXYZ", role: "Software Engineering Intern", duration: "May – Aug 2025", highlights: ["Built real-time dashboard with React and WebSockets", "Deployed ML pipeline processing 10K events/day on AWS"] },
    ],
    targetIndustries: ["Technology", "Finance & Consulting"],
    targetRoles: ["Software Engineering Intern", "ML Engineering Intern", "Full-Stack Intern"],
    resumeText: "",
  },
  "samira-patel": {
    name: "Samira Patel",
    university: "Rice University",
    graduationYear: 2026,
    major: "Chemical Engineering",
    skills: ["MATLAB", "Aspen Plus", "Python", "Process Simulation", "Lab Research", "Technical Writing", "Six Sigma"],
    experience: [
      { company: "Rice Chemical Engineering Lab", role: "Research Assistant", duration: "Jan 2025 – Present", highlights: ["Synthesized novel catalysts for CO2 conversion with 40% improved selectivity", "Published co-author paper in Journal of Catalysis"] },
      { company: "ExxonMobil", role: "Process Engineering Intern", duration: "May – Aug 2025", highlights: ["Optimized distillation column parameters saving $120K/year in energy costs", "Created Aspen Plus models for new product line feasibility study"] },
    ],
    targetIndustries: ["Energy & Sustainability", "Healthcare & Biotech"],
    targetRoles: ["Process Engineering Intern", "Chemical Engineering Intern", "Research Intern"],
    resumeText: "",
  },
  "aaliyah-williams": {
    name: "Aaliyah Williams",
    university: "Rice University",
    graduationYear: 2027,
    major: "Electrical Engineering",
    skills: ["VHDL", "SystemVerilog", "C++", "PCB Design", "Altium", "Oscilloscope", "Signal Processing"],
    experience: [
      { company: "Rice ELEC Lab", role: "Undergraduate Researcher", duration: "Sep 2025 – Present", highlights: ["Designed FPGA-based signal processing pipeline for biomedical sensors", "Reduced sensor noise floor by 25% through custom filter design"] },
    ],
    targetIndustries: ["Technology", "Healthcare & Biotech"],
    targetRoles: ["Hardware Engineering Intern", "Embedded Systems Intern", "EE Intern"],
    resumeText: "",
  },
  "elena-rodriguez": {
    name: "Elena Rodriguez",
    university: "Rice University",
    graduationYear: 2027,
    major: "Civil Engineering",
    skills: ["AutoCAD", "Revit", "MATLAB", "Structural Analysis", "GIS", "Project Management"],
    experience: [
      { company: "AECOM", role: "Civil Engineering Intern", duration: "May – Aug 2025", highlights: ["Assisted in structural analysis for a $50M bridge rehabilitation project", "Created AutoCAD drawings and Revit models for client presentations"] },
    ],
    targetIndustries: ["Energy & Sustainability"],
    targetRoles: ["Structural Engineering Intern", "Civil Engineering Intern", "Project Engineer Intern"],
    resumeText: "",
  },
};

export const MOCK_MEMBERS: LeaderboardMember[] = [
  { id: "jordan-lee", name: "Jordan Lee", university: "Rice University", xp: 320, level: 3, levelName: "Coffee Chat Champion", streak: 5, outreachSent: 24, isCurrentUser: false, profileShared: true, sharedProfile: MOCK_PROFILES["jordan-lee"] },
  { id: "samira-patel", name: "Samira Patel", university: "Rice University", xp: 275, level: 2, levelName: "Connection Seeker", streak: 3, outreachSent: 18, isCurrentUser: false, profileShared: true, sharedProfile: MOCK_PROFILES["samira-patel"] },
  { id: "marcus-chen", name: "Marcus Chen", university: "Rice University", xp: 190, level: 2, levelName: "Connection Seeker", streak: 0, outreachSent: 14, isCurrentUser: false, profileShared: false, sharedProfile: null },
  { id: "aaliyah-williams", name: "Aaliyah Williams", university: "Rice University", xp: 140, level: 2, levelName: "Connection Seeker", streak: 7, outreachSent: 11, isCurrentUser: false, profileShared: true, sharedProfile: MOCK_PROFILES["aaliyah-williams"] },
  { id: "chris-nakamura", name: "Chris Nakamura", university: "Rice University", xp: 85, level: 1, levelName: "Networking Novice", streak: 1, outreachSent: 6, isCurrentUser: false, profileShared: false, sharedProfile: null },
  { id: "elena-rodriguez", name: "Elena Rodriguez", university: "Rice University", xp: 60, level: 1, levelName: "Networking Novice", streak: 2, outreachSent: 4, isCurrentUser: false, profileShared: true, sharedProfile: MOCK_PROFILES["elena-rodriguez"] },
  { id: "dev-kapoor", name: "Dev Kapoor", university: "Rice University", xp: 30, level: 1, levelName: "Networking Novice", streak: 0, outreachSent: 2, isCurrentUser: false, profileShared: false, sharedProfile: null },
];
