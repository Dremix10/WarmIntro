import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that call Claude API — expensive, tight limits
const AI_ROUTES = [
  "/api/parse-resume",
  "/api/generate-outreach",
  "/api/find-alumni",
  "/api/coaching-tip",
  "/api/summarize-recording",
  "/api/generate-followup",
];

// Auth routes — brute-force protection
const AUTH_ROUTES = ["/api/auth/signin", "/api/auth/signup"];

// Rate limit tiers (requests per window)
const RATE_LIMITS = {
  ai: { max: 10, windowMs: 60_000 },
  auth: { max: 5, windowMs: 60_000 },
  default: { max: 30, windowMs: 60_000 },
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function getTier(pathname: string): keyof typeof RATE_LIMITS {
  if (AI_ROUTES.some((r) => pathname.startsWith(r))) return "ai";
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) return "auth";
  return "default";
}

function cleanupStaleEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  }
}

function checkRateLimit(ip: string, tier: keyof typeof RATE_LIMITS): { allowed: boolean; retryAfter: number } {
  const { max, windowMs } = RATE_LIMITS[tier];
  const key = `${tier}:${ip}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Periodic cleanup (~1% of requests)
  if (Math.random() < 0.01) cleanupStaleEntries();

  const ip = getClientIp(request);
  const tier = getTier(pathname);

  // Auth gating: AI routes require an Authorization header
  if (tier === "ai") {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  // Rate limiting
  const { allowed, retryAfter } = checkRateLimit(ip, tier);

  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
