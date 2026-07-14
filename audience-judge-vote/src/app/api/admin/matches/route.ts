import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGuard";

async function getDefaultEventId(supabase: ReturnType<typeof getSupabaseAdminClient>) {
  const { data } = await supabase
    .from("events")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id as string | undefined;
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const supabase = getSupabaseAdminClient();
  const eventId = await getDefaultEventId(supabase);
  if (!eventId) return NextResponse.json({ matches: [] });

  const { data, error } = await supabase
    .from("matches")
    .select(
      "*, performer_a:performer_a_id(*), performer_b:performer_b_id(*)"
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "対戦一覧の取得に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ matches: data });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  let body: {
    label?: string;
    performer_a_id?: string;
    performer_b_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  if (!body.label || !body.performer_a_id || !body.performer_b_id) {
    return NextResponse.json(
      { error: "対戦名・A組・B組は必須です。" },
      { status: 400 }
    );
  }

  if (body.performer_a_id === body.performer_b_id) {
    return NextResponse.json(
      { error: "A組とB組には異なるプレイヤーを選択してください。" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  let eventId = await getDefaultEventId(supabase);

  if (!eventId) {
    const { data: newEvent, error: createEventError } = await supabase
      .from("events")
      .insert({ name: "観客ジャッジ投票イベント" })
      .select("id")
      .single();
    if (createEventError || !newEvent) {
      return NextResponse.json(
        { error: "イベントの初期化に失敗しました。" },
        { status: 500 }
      );
    }
    eventId = newEvent.id;
  }

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { data, error } = await supabase
    .from("matches")
    .insert({
      event_id: eventId,
      label: body.label,
      performer_a_id: body.performer_a_id,
      performer_b_id: body.performer_b_id,
      sort_order: count ?? 0,
      status: "pending",
      results_public: false,
    })
    .select(
      "*, performer_a:performer_a_id(*), performer_b:performer_b_id(*)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "対戦カードの作成に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ match: data });
}
