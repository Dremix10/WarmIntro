import type { Connection, Stage } from "./ConnectionCard";

export const CONNECTIONS: Connection[] = [
  { id: "1", name: "Ethan Wu", company: "Goldman Sachs", role: "VP, TMT", classOf: 2015, university: "Brown", warmth: 78, stage: "sent", lastAction: "Sent email", daysAgo: 2 },
  { id: "2", name: "Riya Sharma", company: "Morgan Stanley", role: "Associate, Sponsors", classOf: 2020, university: "Brown", warmth: 58, stage: "sent", lastAction: "Sent LinkedIn", daysAgo: 3 },
  { id: "3", name: "Jordan Klein", company: "Morgan Stanley", role: "VP, M&A", classOf: 2013, university: "Brown", warmth: 65, stage: "sent", lastAction: "Sent email", daysAgo: 6, needsFollowUp: true },
  { id: "4", name: "Ravi Patel", company: "Evercore", role: "Associate", classOf: 2019, university: "Rice", warmth: 71, stage: "sent", lastAction: "Sent email", daysAgo: 7, needsFollowUp: true },
  { id: "5", name: "Nina Ortiz", company: "JPMorgan", role: "Analyst, LevFin", classOf: 2022, university: "Rice", warmth: 68, stage: "sent", lastAction: "Sent email", daysAgo: 1 },
  { id: "6", name: "Sam Okafor", company: "Morgan Stanley", role: "Analyst, TMT", classOf: 2023, university: "Brown", warmth: 63, stage: "sent", lastAction: "Sent email", daysAgo: 4 },

  { id: "7", name: "Maya Chen", company: "Morgan Stanley", role: "VP, TMT", classOf: 2016, university: "Brown", warmth: 88, stage: "replied", lastAction: "Replied, wants call", daysAgo: 1, fresh: true },
  { id: "8", name: "Alex Park", company: "Morgan Stanley", role: "Associate, M&A", classOf: 2019, university: "Brown", warmth: 76, stage: "replied", lastAction: "Replied, suggested Tue", daysAgo: 2 },
  { id: "9", name: "Priya Venkat", company: "JPMorgan", role: "Associate, Healthcare", classOf: 2020, university: "Rice", warmth: 72, stage: "replied", lastAction: "Replied, scheduling", daysAgo: 5, needsFollowUp: true },

  { id: "10", name: "Amir Shah", company: "Morgan Stanley", role: "VP, TMT", classOf: 2012, university: "Brown", warmth: 81, stage: "coffee", lastAction: "Coffee booked · Thu 2pm", daysAgo: 0 },
  { id: "11", name: "Taylor Reese", company: "Goldman Sachs", role: "Associate, M&A", classOf: 2018, university: "Rice", warmth: 74, stage: "coffee", lastAction: "Coffee done", daysAgo: 3 },

  { id: "12", name: "Dana Kim", company: "Evercore", role: "MD, M&A", classOf: 2008, university: "Rice", warmth: 82, stage: "referral", lastAction: "Referral to HR", daysAgo: 4 },
  { id: "13", name: "Ben Torres", company: "Goldman Sachs", role: "VP, TMT", classOf: 2014, university: "Brown", warmth: 79, stage: "referral", lastAction: "Referral submitted", daysAgo: 8 },

  { id: "14", name: "Leila Haddad", company: "Centerview", role: "HR Campus Lead", classOf: 0, university: "Other", warmth: 70, stage: "firstRound", lastAction: "HireVue complete · Apr 22", daysAgo: 1, fresh: true },
  { id: "15", name: "Owen Park", company: "PJT Partners", role: "Associate, RSSG", classOf: 2017, university: "Brown", warmth: 75, stage: "superday", lastAction: "Superday invite · May 3", daysAgo: 0, fresh: true },
];

export const STAGES: { id: Stage; label: string; target: number }[] = [
  { id: "sent", label: "Sent", target: 120 },
  { id: "replied", label: "Replied", target: 40 },
  { id: "coffee", label: "Coffee", target: 20 },
  { id: "referral", label: "Referral", target: 8 },
  { id: "firstRound", label: "1st Round", target: 4 },
  { id: "superday", label: "Superday", target: 2 },
  { id: "offer", label: "Offer", target: 1 },
];
