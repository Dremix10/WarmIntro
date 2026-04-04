import { NextResponse } from "next/server";
import type {
  FindCompaniesRequest,
  FindCompaniesResponse,
} from "@/shared/types";
import { findCompanies } from "@/services/company-matcher";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FindCompaniesRequest;

    if (!body.industries || !body.skills || !body.roles) {
      return NextResponse.json(
        { error: "industries, skills, and roles are required" },
        { status: 400 }
      );
    }

    const companies = findCompanies(body.industries, body.skills, body.roles);
    const response: FindCompaniesResponse = { companies };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to find companies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
