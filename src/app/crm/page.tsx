"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /crm is now /pipeline. This file stays as a one-shot redirect so any
// bookmarked /crm URL or in-app link that hasn't been updated still lands
// the user in the right place.
export default function CrmRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/pipeline");
  }, [router]);
  return null;
}
