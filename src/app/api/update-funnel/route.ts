import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented yet — Dev A is working on it" },
    { status: 501 }
  );
}
