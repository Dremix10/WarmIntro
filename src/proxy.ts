import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that call Claude API — require auth + tight limits
const AI_ROUTES = [
  "/api/coaching-tip",
  "/api/summarize-recording",
  "/api/generate-followup",
  "/api/scrape-linkedin",
];

// Routes that call Claude but allow guest access (no auth required)
const GUEST_AI_ROUTES = ["/api/parse-resume", "/api/find-alumni", "/api/generate-outreach", "/api/find-people"];

// Auth routes — brute-force protection
const AUTH_ROUTES = ["/api/auth/signin", "/api/auth/signup"];

// Rate limit tiers (requests per window)
const RATE_LIMITS = {
  ai: { max: 5, windowMs: 60_000 },
  guest_ai: { max: 5, windowMs: 60_000 },
  auth: { max: 3, windowMs: 60_000 },
  default: { max: 20, windowMs: 60_000 },
  global: { max: 60, windowMs: 60_000 },
};

// User-Agent substrings that indicate automated tooling (case-insensitive match)
const BOT_UA_PATTERNS = ["curl", "wget", "python-requests", "httpie", "postmanruntime"];

// Routes exempt from bot UA checks (cron runs as a bot by design; uploads; analytics)
const BOT_CHECK_EXEMPT_ROUTES = ["/api/extract-pdf", "/api/analytics", "/api/admin", "/api/cron"];

// Routes that bypass rate limiting entirely (authenticated crons on fixed schedules)
const RATE_LIMIT_EXEMPT_ROUTES = ["/api/cron"];

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  // x-real-ip is set by Vercel from the socket — cannot be spoofed by client headers
  // x-forwarded-for can be spoofed, only use as last resort
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function getTier(pathname: string): keyof typeof RATE_LIMITS {
  if (AI_ROUTES.some((r) => pathname.startsWith(r))) return "ai";
  if (GUEST_AI_ROUTES.some((r) => pathname.startsWith(r))) return "guest_ai";
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

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB (PDF uploads)

// Private-beta gate — blocks public access except for allowlisted testers.
// Disable by setting TESTING_GATE_ENABLED=false in env.
const TESTING_GATE_ENABLED = process.env.TESTING_GATE_ENABLED !== "false";
const TESTING_ALLOWED_EMAILS = (process.env.TESTING_ALLOWED_EMAILS ?? "dc118@rice.edu,evangelos_paraskeva@brown.edu")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Gate passthrough list — these paths are always accessible (signup flow, static, cron, the gate itself)
const GATE_BYPASS_PREFIXES = [
  "/coming-soon",
  "/login", // testers sign in here
  "/api/pilot-signup",
  "/api/extract-pdf", // pre-auth resume upload
  "/api/cron",
  "/api/auth",
  "/api/analytics",
  "/auth/callback",
];

// Gate passthrough API pattern — these run after Supabase auth check and emit a 403 if email isn't whitelisted
function isGatedApiRoute(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  return !GATE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p));
}

function getSessionEmailFromCookie(request: NextRequest): string | null {
  // Supabase auth cookie: sb-<project-ref>-auth-token (base64-encoded JSON array)
  const cookies = request.cookies;
  for (const cookie of cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")) {
      try {
        const raw = cookie.value.startsWith("base64-") ? cookie.value.slice(7) : cookie.value;
        const decoded = typeof atob === "function" ? atob(raw) : Buffer.from(raw, "base64").toString("utf8");
        const parsed = JSON.parse(decoded);
        const email = parsed?.user?.email ?? parsed?.[0]?.user?.email;
        return typeof email === "string" ? email.toLowerCase() : null;
      } catch {
        continue;
      }
    }
  }
  return null;
}

function checkTestingGate(request: NextRequest): NextResponse | null {
  if (!TESTING_GATE_ENABLED) return null;

  const { pathname, origin } = request.nextUrl;

  // Always allow the gate page itself + bypass routes + Next internals
  if (pathname === "/coming-soon" || GATE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const email = getSessionEmailFromCookie(request);
  if (email && TESTING_ALLOWED_EMAILS.includes(email)) {
    return null; // whitelisted tester, let through
  }

  // For API routes: 403 JSON
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Private beta. Contact founders for access." },
      { status: 403 }
    );
  }

  // For pages: redirect to /coming-soon
  return NextResponse.redirect(new URL("/coming-soon", origin));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Private-beta gate runs FIRST — everything else is inside the gate
  const gate = checkTestingGate(request);
  if (gate) return gate;

  // Reject oversized payloads
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  // Periodic cleanup, also triggered when map is large
  if (Math.random() < 0.01 || rateLimitMap.size > 10000) cleanupStaleEntries();

  const ip = getClientIp(request);

  // Only do IP-based rate limiting for API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Rate-limit exempt routes (cron) skip both global and tier checks
  if (RATE_LIMIT_EXEMPT_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Global per-IP rate limit — applies before any tier-specific check
  const globalCheck = checkRateLimit(ip, "global");
  if (!globalCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(globalCheck.retryAfter) },
      }
    );
  }

  // Bot detection — block requests with missing or suspicious User-Agent
  const userAgent = request.headers.get("user-agent");
  const isExemptRoute = BOT_CHECK_EXEMPT_ROUTES.some((r) => pathname.startsWith(r));

  if (!isExemptRoute) {
    if (!userAgent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const uaLower = userAgent.toLowerCase();
    if (BOT_UA_PATTERNS.some((pattern) => uaLower.includes(pattern))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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
  matcher: ["/api/:path*", "/((?!coming-soon|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)"],
};
