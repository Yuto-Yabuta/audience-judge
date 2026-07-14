import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  let body: { match_id?: string; choice?: string; voter_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const { match_id, choice, voter_token } = body;

  if (!match_id || !voter_token || (choice !== "A" && choice !== "B")) {
    return NextResponse.json(
      { error: "match_id / choice(A/B) / voter_token が必要です。" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, status")
    .eq("id", match_id)
    .maybeSingle();

  if (matchError || !match) {
    return NextResponse.json({ error: "対戦が見つかりません。" }, { status: 404 });
  }

  if (match.status !== "voting_open") {
    return NextResponse.json(
      { error: "この対戦は現在投票を受け付けていません（受付前または締切済み）。" },
      { status: 409 }
    );
  }

  // 締切まで変更可（FR-13既定）: 同一 match_id × voter_token は upsert で上書きする
  const { error: upsertError } = await supabase.from("votes").upsert(
    {
      match_id,
      voter_token,
      choice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id,voter_token" }
  );

  if (upsertError) {
    return NextResponse.json(
      { error: "投票の保存に失敗しました。電波状況を確認しもう一度お試しください。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, my_choice: choice });
}
