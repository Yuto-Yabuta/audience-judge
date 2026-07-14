import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGuard";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const supabase = getSupabaseAdminClient();

  const { data: target, error: targetError } = await supabase
    .from("matches")
    .select("id, event_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json({ error: "対戦が見つかりません。" }, { status: 404 });
  }

  // 同時に受付中の対戦は1つのみ。他に受付中があれば先に締切にする。
  const { error: closeError } = await supabase
    .from("matches")
    .update({ status: "voting_closed", closed_at: new Date().toISOString() })
    .eq("event_id", target.event_id)
    .eq("status", "voting_open")
    .neq("id", target.id);

  if (closeError) {
    return NextResponse.json(
      { error: "既存の受付中対戦の締切に失敗しました。" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("matches")
    .update({
      status: "voting_open",
      opened_at: new Date().toISOString(),
      closed_at: null,
    })
    .eq("id", target.id)
    .select(
      "*, performer_a:performer_a_id(*), performer_b:performer_b_id(*)"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: "受付開始に失敗しました。他に受付中の対戦が残っていないか確認してください。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ match: data });
}
