import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { scrapeLinkedInProfile } from "@/services/linkedin-profile-scraper";

export async function POST(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { name, university } = (await request.json()) as { name: string; university: string };

    if (!name || !university) {
      return NextResponse.json({ error: "name and university are required" }, { status: 400 });
    }

    const profile = await scrapeLinkedInProfile(name, university);

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to scrape profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
