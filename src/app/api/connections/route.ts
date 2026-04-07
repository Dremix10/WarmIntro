import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ connections: [] });
    }

    const { supabase, user } = auth;
    const { data } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false });

    return NextResponse.json({ connections: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load connections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { supabase, user } = auth;
    const body = await request.json();

    if (!body.alumni_id || !body.company_id) {
      return NextResponse.json({ error: "alumni_id and company_id are required" }, { status: 400 });
    }

    const { data, error } = await supabase.from("connections").upsert({
      user_id: user.id,
      alumni_id: body.alumni_id,
      alumni_name: body.alumni_name,
      alumni_role: body.alumni_role,
      alumni_email: body.alumni_email ?? null,
      alumni_linkedin_url: body.alumni_linkedin_url,
      company_id: body.company_id,
      company_name: body.company_name,
      stage: body.stage ?? "sent",
    }, {
      onConflict: "user_id,alumni_id",
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { supabase, user } = auth;
    const body = await request.json();

    if (!body.alumni_id) {
      return NextResponse.json({ error: "alumni_id is required" }, { status: 400 });
    }

    const updates: { stage?: string; notes_summary?: string } = {};
    if (body.stage) updates.stage = body.stage;
    if (body.notes_summary) updates.notes_summary = JSON.parse(JSON.stringify(body.notes_summary));

    const { data, error } = await supabase
      .from("connections")
      .update(updates as { stage?: string })
      .eq("user_id", user.id)
      .eq("alumni_id", body.alumni_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
