import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from("pilot_signups").upsert({
      email: body.email,
      name: body.name ?? null,
      university: body.university ?? null,
      major: body.major ?? null,
      graduation_year: body.graduationYear ?? null,
      skills: body.skills ? JSON.parse(JSON.stringify(body.skills)) : [],
      target_industries: body.targetIndustries ? JSON.parse(JSON.stringify(body.targetIndustries)) : [],
    }, { onConflict: "email" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
