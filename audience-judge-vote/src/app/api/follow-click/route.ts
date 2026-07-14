import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  let body: { performer_id?: string; voter_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const { performer_id, voter_token } = body;

  if (!performer_id) {
    return NextResponse.json({ error: "performer_id が必要です。" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("follow_clicks").insert({
    performer_id,
    voter_token: voter_token ?? null,
  });

  if (error) {
    // フォロー導線の計測失敗は致命的ではないため、来場者体験は止めない
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
