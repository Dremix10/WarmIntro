import { NextResponse } from "next/server";
import type { UserProfile, WorkExperience } from "@/shared/types";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { supabase, user } = auth;
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const cacheHeaders = {
      "Cache-Control": "private, max-age=0, stale-while-revalidate=300",
    };

    if (!profile) {
      return NextResponse.json(
        { profile: null, referralCode: null, companyUnlocks: 5 },
        { headers: cacheHeaders },
      );
    }

    const userProfile: UserProfile = {
      name: profile.name,
      email: profile.email ?? undefined,
      university: profile.university,
      graduationYear: profile.graduation_year,
      major: profile.major,
      skills: profile.skills as string[],
      experience: profile.experience as unknown as WorkExperience[],
      targetIndustries: profile.target_industries as string[],
      targetRoles: profile.target_roles as string[],
      resumeText: profile.resume_text,
    };

    return NextResponse.json(
      {
        profile: userProfile,
        referralCode: profile.referral_code,
        companyUnlocks: profile.company_unlocks,
      },
      { headers: cacheHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile";
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
    const body = (await request.json()) as { profile: UserProfile };

    if (!body.profile) {
      return NextResponse.json({ error: "profile is required" }, { status: 400 });
    }

    const p = body.profile;
    const referralCode = generateReferralCode();

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: p.name,
      email: p.email ?? null,
      university: p.university,
      graduation_year: p.graduationYear,
      major: p.major,
      skills: JSON.parse(JSON.stringify(p.skills)),
      experience: JSON.parse(JSON.stringify(p.experience)),
      target_industries: JSON.parse(JSON.stringify(p.targetIndustries)),
      target_roles: JSON.parse(JSON.stringify(p.targetRoles)),
      resume_text: p.resumeText,
      referral_code: referralCode,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, referralCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
