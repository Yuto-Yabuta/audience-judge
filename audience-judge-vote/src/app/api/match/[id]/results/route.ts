import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTally } from "@/lib/tally";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdminClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, results_public, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ error: "対戦が見つかりません。" }, { status: 404 });
  }

  if (!match.results_public) {
    return NextResponse.json(
      { error: "この対戦の結果はまだ公開されていません。" },
      { status: 403 }
    );
  }

  const tally = await computeTally(supabase, match.id);
  return NextResponse.json({ results: tally });
}
