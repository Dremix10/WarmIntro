// Typed, direct-REST Supabase helpers.
// Used in preference to @supabase/supabase-js admin client because the JS SDK
// silently returns empty results for filtered queries in Vercel serverless
// runtimes (reproduced consistently against this project; REST with explicit
// service-role headers works fine). See PR history on /api/setup/firms and
// services/agents/researcher.ts for the diagnosis.
//
// Headers ALWAYS include both `apikey` and `Authorization: Bearer <service_role>`
// so RLS is bypassed cleanly.

import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];
type TableName = keyof Tables;

function restEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return { url, key };
}

function restHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const { key } = restEnv();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// ---------- filter helpers ----------

/** `eq.<value>` — exact match. */
export const eq = (value: string | number | boolean): string => `eq.${value}`;

/** `in.("a","b","c")` — PostgREST requires quotes around string values with special chars. */
export const inList = (values: Array<string | number>): string =>
  `in.(${values.map((v) => (typeof v === "string" ? `"${v.replace(/"/g, '\\"')}"` : v)).join(",")})`;

/** `is.null` / `not.is.null`. */
export const isNull = "is.null";
export const notNull = "not.is.null";

/** `gte.<value>` for timestamps etc. */
export const gte = (value: string | number): string => `gte.${value}`;
export const lt = (value: string | number): string => `lt.${value}`;

// ---------- core operations ----------

export async function restSelect<T extends TableName>(
  table: T,
  query: {
    select?: string;
    filters?: Record<string, string>;
    order?: string;
    limit?: number;
    single?: boolean;
  } = {}
): Promise<Tables[T]["Row"][]> {
  const { url } = restEnv();
  const params = new URLSearchParams();
  params.set("select", query.select ?? "*");
  for (const [k, v] of Object.entries(query.filters ?? {})) params.set(k, v);
  if (query.order) params.set("order", query.order);
  if (query.limit) params.set("limit", String(query.limit));

  const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    headers: restHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[supabase-rest] ${table} select ${res.status}: ${body.slice(0, 200)}`);
    return [];
  }
  return (await res.json()) as Tables[T]["Row"][];
}

export async function restSelectOne<T extends TableName>(
  table: T,
  query: {
    select?: string;
    filters: Record<string, string>;
  }
): Promise<Tables[T]["Row"] | null> {
  const rows = await restSelect(table, { ...query, limit: 1 });
  return rows[0] ?? null;
}

export async function restInsert<T extends TableName>(
  table: T,
  rows: Tables[T]["Insert"] | Tables[T]["Insert"][]
): Promise<Tables[T]["Row"][]> {
  const { url } = restEnv();
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[supabase-rest] ${table} insert ${res.status}: ${body.slice(0, 200)}`);
    return [];
  }
  return (await res.json()) as Tables[T]["Row"][];
}

export async function restUpsert<T extends TableName>(
  table: T,
  rows: Tables[T]["Insert"] | Tables[T]["Insert"][],
  opts?: { onConflict?: string }
): Promise<Tables[T]["Row"][]> {
  const { url } = restEnv();
  const params = new URLSearchParams();
  if (opts?.onConflict) params.set("on_conflict", opts.onConflict);

  const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    method: "POST",
    headers: restHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[supabase-rest] ${table} upsert ${res.status}: ${body.slice(0, 200)}`);
    return [];
  }
  return (await res.json()) as Tables[T]["Row"][];
}

export async function restUpdate<T extends TableName>(
  table: T,
  updates: Tables[T]["Update"],
  filters: Record<string, string>
): Promise<Tables[T]["Row"][]> {
  const { url } = restEnv();
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) params.set(k, v);

  const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    method: "PATCH",
    headers: restHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[supabase-rest] ${table} update ${res.status}: ${body.slice(0, 200)}`);
    return [];
  }
  return (await res.json()) as Tables[T]["Row"][];
}

export async function restDelete<T extends TableName>(
  table: T,
  filters: Record<string, string>
): Promise<boolean> {
  const { url } = restEnv();
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) params.set(k, v);

  const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    method: "DELETE",
    headers: restHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[supabase-rest] ${table} delete ${res.status}: ${body.slice(0, 200)}`);
    return false;
  }
  return true;
}

/** Return just the row count for a filter (head-only HEAD request). */
export async function restCount<T extends TableName>(
  table: T,
  filters: Record<string, string> = {}
): Promise<number> {
  const { url } = restEnv();
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) params.set(k, v);

  const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
    method: "HEAD",
    headers: restHeaders({ Prefer: "count=exact", Range: "0-0" }),
  });
  if (!res.ok) return 0;
  const contentRange = res.headers.get("content-range");
  const match = contentRange?.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}
