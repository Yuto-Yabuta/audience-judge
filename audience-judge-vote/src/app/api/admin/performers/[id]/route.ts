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
    name?: string;
    instagram_username?: string;
    photo_url?: string | null;
    affiliation?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.instagram_username !== undefined)
    update.instagram_username = body.instagram_username.replace(/^@/, "");
  if (body.photo_url !== undefined) update.photo_url = body.photo_url || null;
  if (body.affiliation !== undefined) update.affiliation = body.affiliation || null;

  const { data, error } = await supabase
    .from("performers")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "更新に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ performer: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("performers").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "削除に失敗しました（対戦カードで使用中の可能性があります）。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
