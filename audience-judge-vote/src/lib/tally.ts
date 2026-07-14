import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tally } from "@/lib/types";

export async function computeTally(
  supabase: SupabaseClient,
  matchId: string
): Promise<Tally> {
  const { count: aCount } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .eq("choice", "A");

  const { count: bCount } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .eq("choice", "B");

  const a = aCount ?? 0;
  const b = bCount ?? 0;
  const total = a + b;

  return {
    a_votes: a,
    b_votes: b,
    total,
    a_pct: total > 0 ? Math.round((a / total) * 1000) / 10 : 0,
    b_pct: total > 0 ? Math.round((b / total) * 1000) / 10 : 0,
  };
}
