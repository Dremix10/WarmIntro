// Gmail access-token management for a given Alma user.
// Centralizes: lookup refresh/access tokens from profile, decrypt, refresh when
// near expiry, persist new tokens. Previously duplicated across send.ts + poll.ts.

import { decryptToken, encryptToken, refreshAccessToken } from "./oauth";
import { restSelectOne, restUpdate, eq } from "@/lib/supabase-rest";

const REFRESH_BUFFER_MS = 60_000; // refresh if token expires within a minute

export async function getAccessTokenForUser(userId: string): Promise<string | null> {
  const profile = await restSelectOne("profiles", {
    select: "gmail_refresh_token_encrypted, gmail_access_token_encrypted, gmail_token_expires_at",
    filters: { id: eq(userId) },
  });
  if (!profile?.gmail_refresh_token_encrypted) return null;

  const now = Date.now();
  const expiresAt = profile.gmail_token_expires_at ? new Date(profile.gmail_token_expires_at).getTime() : 0;

  // Use cached access token if still valid
  if (profile.gmail_access_token_encrypted && expiresAt > now + REFRESH_BUFFER_MS) {
    try {
      return decryptToken(profile.gmail_access_token_encrypted);
    } catch {
      // decrypt failed — fall through to refresh
    }
  }

  // Refresh
  try {
    const refreshToken = decryptToken(profile.gmail_refresh_token_encrypted);
    const refreshed = await refreshAccessToken(refreshToken);
    if (!refreshed) return null;
    await restUpdate(
      "profiles",
      {
        gmail_access_token_encrypted: encryptToken(refreshed.accessToken),
        gmail_token_expires_at: refreshed.expiresAt.toISOString(),
      },
      { id: eq(userId) }
    );
    return refreshed.accessToken;
  } catch {
    return null;
  }
}
