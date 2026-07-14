import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTally } from "@/lib/tally";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const voterToken = request.nextUrl.searchParams.get("voter_token");

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ match: null, my_choice: null, results: null });
  }

  // 1) 現在受付中の対戦を優先
  let { data: match } = await supabase
    .from("matches")
    .select(
      "*, performer_a:performer_a_id(*), performer_b:performer_b_id(*)"
    )
    .eq("event_id", event.id)
    .eq("status", "voting_open")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  // 2) 受付中が無ければ、直近に締切/終了した対戦を表示（結果公開判定用）
  if (!match) {
    const { data: recentMatch } = await supabase
      .from("matches")
      .select(
        "*, performer_a:performer_a_id(*), performer_b:performer_b_id(*)"
      )
      .eq("event_id", event.id)
      .in("status", ["voting_closed", "finished"])
      .order("closed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    match = recentMatch ?? null;
  }

  if (!match) {
    return NextResponse.json({ match: null, my_choice: null, results: null });
  }

  let myChoice: "A" | "B" | null = null;
  if (voterToken) {
    const { data: myVote } = await supabase
      .from("votes")
      .select("choice")
      .eq("match_id", match.id)
      .eq("voter_token", voterToken)
      .maybeSingle();
    myChoice = (myVote?.choice as "A" | "B" | undefined) ?? null;
  }

  let results = null;
  if (match.status !== "voting_open" && match.results_public) {
    results = await computeTally(supabase, match.id);
  }

  return NextResponse.json({ match, my_choice: myChoice, results });
}
