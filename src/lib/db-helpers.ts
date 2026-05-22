// Type helpers derived from the auto-generated database.types.ts so we
// don't have to rewrite Supabase's verbose lookup paths everywhere.
// Keep this file separate from database.types.ts — that file is regenerated
// by `supabase gen types` and any edits there get clobbered.

import type { Database } from "./database.types";

type PublicTables = Database["public"]["Tables"];

export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
