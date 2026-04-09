import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) return NextResponse.json({ companies: [] });

    const { supabase, user } = auth;
    const { data } = await supabase
      .from("selected_companies")
      .select("company_data")
      .eq("user_id", user.id);

    const companies = (data ?? []).map((row) => row.company_data);
    return NextResponse.json({ companies });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { supabase, user } = auth;
    const { companies } = await request.json();

    // Delete old selections
    await supabase.from("selected_companies").delete().eq("user_id", user.id);

    // Insert new ones
    if (companies && companies.length > 0) {
      const rows = companies.map((c: { id: string }) => ({
        user_id: user.id,
        company_id: c.id,
        company_data: JSON.parse(JSON.stringify(c)),
      }));
      await supabase.from("selected_companies").insert(rows);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
