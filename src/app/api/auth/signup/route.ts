// POST /api/auth/signup — DISABLED. Alma is in closed beta; account creation
// goes through admin invite (admin reset-password flow) only. Public users
// who land here are routed to /request-access instead.
//
// We keep the route mounted (rather than deleting it) so old clients that
// still POST here get a clear error + the redirect path, instead of a
// generic 404.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "closed_beta",
      message: "Alma is in closed beta. Request access at /request-access — we'll email you when a spot opens.",
      redirectTo: "/request-access",
    },
    { status: 403 }
  );
}
