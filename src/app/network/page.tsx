"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /network is now /deck. This file stays as a one-shot redirect so any
// bookmarked /network URL or in-app link that hasn't been updated still
// lands the user in the right place.
export default function NetworkRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/deck");
  }, [router]);
  return null;
}
