import { NextResponse } from "next/server";
import type { FindAlumniRequest, FindAlumniResponse } from "@/shared/types";
import companiesData from "@/data/companies.json";
import {
  findAlumniAtCompany,
  generateWarmPaths,
} from "@/services/alumni-engine";
import { generateColdOutreach } from "@/services/cold-outreach";

interface CompanyData {
  id: string;
  name: string;
}

const companies = companiesData as CompanyData[];

// Cache full responses so alumni stay stable across page visits
const responseCache = new Map<string, FindAlumniResponse>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FindAlumniRequest;

    if (!body.companyId || !body.university || !body.userMajor || !body.userGradYear) {
      return NextResponse.json(
        { error: "companyId, university, userMajor, and userGradYear are required" },
        { status: 400 }
      );
    }

    // Return cached response if available (prevents alumni shuffling on re-entry)
    const cacheKey = `${body.companyId}::${body.university}`;
    if (responseCache.has(cacheKey)) {
      return NextResponse.json(responseCache.get(cacheKey)!);
    }

    const { alumni, scores } = await findAlumniAtCompany(
      body.companyId,
      body.university,
      body.userMajor,
      body.userGradYear
    );

    if (alumni.length > 0) {
      const warmPaths = await generateWarmPaths(
        alumni,
        scores,
        body.userMajor,
        body.userGradYear,
        body.university
      );
      const response: FindAlumniResponse = { alumni, warmPaths };
      responseCache.set(cacheKey, response);
      return NextResponse.json(response);
    }

    const companyName =
      companies.find((c) => c.id === body.companyId)?.name ?? body.companyId;

    const coldPaths = await generateColdOutreach(
      body.companyId,
      companyName,
      body.university,
      body.userMajor,
      body.userGradYear
    );

    const coldAlumni = coldPaths.map((p) => p.alumni);
    const response: FindAlumniResponse = {
      alumni: coldAlumni,
      warmPaths: coldPaths,
    };

    responseCache.set(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to find alumni";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
