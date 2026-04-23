import type { Connection, Stage } from "./ConnectionCard";

export const CONNECTIONS: Connection[] = [
  { id: "1", name: "Jamie Wu", company: "Stripe", role: "Senior SWE", classOf: 2018, university: "Brown", warmth: 78, stage: "sent", lastAction: "Sent email", daysAgo: 2 },
  { id: "2", name: "Riya Sharma", company: "Linear", role: "Data Scientist", classOf: 2022, university: "Brown", warmth: 58, stage: "sent", lastAction: "Sent email", daysAgo: 3 },
  { id: "3", name: "Jordan Klein", company: "Linear", role: "Eng Manager", classOf: 2016, university: "Brown", warmth: 65, stage: "sent", lastAction: "Sent LinkedIn", daysAgo: 6, needsFollowUp: true },
  { id: "4", name: "Ravi Patel", company: "Figma", role: "Design Eng", classOf: 2020, university: "Rice", warmth: 71, stage: "sent", lastAction: "Sent email", daysAgo: 7, needsFollowUp: true },
  { id: "5", name: "Nina Ortiz", company: "Notion", role: "PM", classOf: 2021, university: "Rice", warmth: 68, stage: "sent", lastAction: "Sent email", daysAgo: 1 },
  { id: "6", name: "Sam Okafor", company: "Linear", role: "Frontend Eng", classOf: 2021, university: "Brown", warmth: 63, stage: "sent", lastAction: "Sent email", daysAgo: 4 },

  { id: "7", name: "Maya Chen", company: "Linear", role: "Senior PM", classOf: 2019, university: "Brown", warmth: 88, stage: "replied", lastAction: "Replied", daysAgo: 1, fresh: true },
  { id: "8", name: "Alex Park", company: "Linear", role: "Staff Eng", classOf: 2017, university: "Brown", warmth: 76, stage: "replied", lastAction: "Replied", daysAgo: 2 },
  { id: "9", name: "Priya Venkat", company: "Notion", role: "Product Designer", classOf: 2020, university: "Rice", warmth: 72, stage: "replied", lastAction: "Replied", daysAgo: 5, needsFollowUp: true },

  { id: "10", name: "Amir Shah", company: "Linear", role: "Eng Lead", classOf: 2015, university: "Brown", warmth: 81, stage: "coffee", lastAction: "Coffee booked · Thu 2pm", daysAgo: 0 },
  { id: "11", name: "Taylor Reese", company: "Stripe", role: "PM", classOf: 2018, university: "Rice", warmth: 74, stage: "coffee", lastAction: "Coffee done", daysAgo: 3 },

  { id: "12", name: "Dana Kim", company: "Ramp", role: "Senior SWE", classOf: 2016, university: "Rice", warmth: 82, stage: "referral", lastAction: "Referral submitted", daysAgo: 4 },
  { id: "13", name: "Ben Torres", company: "Stripe", role: "Staff PM", classOf: 2014, university: "Brown", warmth: 79, stage: "referral", lastAction: "Referral submitted", daysAgo: 8 },

  { id: "14", name: "Leila Haddad", company: "Ramp", role: "Hiring Manager", classOf: 0, university: "Other", warmth: 70, stage: "interview", lastAction: "Phone screen · Apr 28", daysAgo: 0 },
];

export const STAGES: { id: Stage; label: string; target: number }[] = [
  { id: "sent", label: "Sent", target: 100 },
  { id: "replied", label: "Replied", target: 30 },
  { id: "coffee", label: "Coffee", target: 15 },
  { id: "referral", label: "Referral", target: 6 },
  { id: "interview", label: "Interview", target: 3 },
  { id: "offer", label: "Offer", target: 1 },
];
