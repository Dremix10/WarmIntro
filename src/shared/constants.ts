export const INDUSTRIES = [
  "Automotive & Manufacturing",
  "Technology",
  "Finance & Consulting",
  "Healthcare & Biotech",
  "Energy & Sustainability",
  "Consumer & Retail",
] as const;

export const FUNNEL_STAGES = [
  { name: "Initial Outreach", targetMultiplier: 100, conversionRate: 0.30, color: "#5DCAA5", icon: "📧" },
  { name: "Coffee Chat",      targetMultiplier: 30,  conversionRate: 0.50, color: "#85B7EB", icon: "☕" },
  { name: "Warm Referral",    targetMultiplier: 15,  conversionRate: 0.40, color: "#ED93B1", icon: "🤝" },
  { name: "Interview",        targetMultiplier: 6,   conversionRate: 0.50, color: "#F0997B", icon: "🎯" },
  { name: "Offer",            targetMultiplier: 3,   conversionRate: 0.33, color: "#AFA9EC", icon: "🎉" },
] as const;

export const LEVELS = [
  { level: 1, name: "Networking Novice",     minXP: 0 },
  { level: 2, name: "Connection Seeker",     minXP: 100 },
  { level: 3, name: "Coffee Chat Champion",  minXP: 300 },
  { level: 4, name: "Referral Hunter",       minXP: 600 },
  { level: 5, name: "Warm Intro Master",     minXP: 1000 },
] as const;

export const XP_VALUES = {
  outreach_sent: 10,
  reply_received: 25,
  coffee_booked: 50,
  referral_earned: 100,
} as const;

export const BADGES = [
  { id: "first_outreach",  name: "First Outreach",     icon: "🚀" },
  { id: "ten_sent",        name: "10 Emails Sent",     icon: "📨" },
  { id: "first_reply",     name: "First Reply!",       icon: "💬" },
  { id: "five_coffees",    name: "5 Coffee Chats",     icon: "☕" },
  { id: "first_referral",  name: "Referral Unlocked",  icon: "🔑" },
  { id: "streak_7",        name: "7-Day Streak",       icon: "🔥" },
  { id: "offer_secured",   name: "Offer Secured",      icon: "🏆" },
] as const;
