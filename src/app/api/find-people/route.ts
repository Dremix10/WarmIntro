import { NextResponse } from "next/server";
import { findAndGenerateConnections } from "@/services/people-finder";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.major) {
      return NextResponse.json({ error: "name and major are required" }, { status: 400 });
    }

    const result = await findAndGenerateConnections(
      body.name,
      body.university ?? "Rice University",
      body.major,
      body.graduationYear ?? 2027,
      body.targetRoles ?? [],
      body.targetIndustries ?? []
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to find people";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
