// Legacy /profile route. The account settings + edit experience lives at /account now.
// Redirecting so the NavHeader "Profile" link lands on the right place.

import { redirect } from "next/navigation";

export default function LegacyProfileRedirect() {
  redirect("/account");
}
