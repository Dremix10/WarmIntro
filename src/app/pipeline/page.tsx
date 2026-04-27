"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /pipeline is the legacy WarmIntro funnel page wired to in-memory React
// Context. The IB equivalent is /network (firms + bankers + stages) and
// /crm (kanban). Until /pipeline is rewritten as the IB-funnel summary
// (counts per stage), we redirect there to avoid the "No pipeline yet"
// dead end.
export default function PipelineLegacyRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/network");
  }, [router]);
  return null;
}
