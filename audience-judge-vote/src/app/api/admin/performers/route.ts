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
  if (!eventId) return NextResponse.json({ performers: [] });

  const { data, error } = await supabase
    .from("performers")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "出場者の取得に失敗しました。" }, { status: 500 });
  }

  // フォロータップ数を出場者ごとに集計する（FR-23）
  const { data: clicks } = await supabase
    .from("follow_clicks")
    .select("performer_id");

  const clickCounts = new Map<string, number>();
  for (const row of clicks ?? []) {
    const id = row.performer_id as string;
    clickCounts.set(id, (clickCounts.get(id) ?? 0) + 1);
  }

  const performers = (data ?? []).map((p) => ({
    ...p,
    follow_click_count: clickCounts.get(p.id) ?? 0,
  }));

  return NextResponse.json({ performers });
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  let body: {
    name?: string;
    instagram_username?: string;
    photo_url?: string;
    affiliation?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  if (!body.name || !body.instagram_username) {
    return NextResponse.json(
      { error: "名前とInstagramユーザー名は必須です。" },
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

  const { data, error } = await supabase
    .from("performers")
    .insert({
      event_id: eventId,
      name: body.name,
      instagram_username: body.instagram_username.replace(/^@/, ""),
      photo_url: body.photo_url || null,
      affiliation: body.affiliation || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "出場者の登録に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ performer: data });
}
