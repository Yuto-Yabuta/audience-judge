import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGuard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  let body: {
    label?: string;
    sort_order?: number;
    performer_a_id?: string;
    performer_b_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = body.label;
  if (body.sort_order !== undefined) update.sort_order = body.sort_order;
  if (body.performer_a_id !== undefined) update.performer_a_id = body.performer_a_id;
  if (body.performer_b_id !== undefined) update.performer_b_id = body.performer_b_id;

  const { data, error } = await supabase
    .from("matches")
    .update(update)
    .eq("id", params.id)
    .select(
      "*, performer_a:performer_a_id(*), performer_b:performer_b_id(*)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "更新に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ match: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("matches").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
