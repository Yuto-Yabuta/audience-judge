import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGuard";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  let body: { public?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ results_public: !!body.public })
    .eq("id", params.id)
    .select(
      "*, performer_a:performer_a_id(*), performer_b:performer_b_id(*)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "公開設定の更新に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ match: data });
}
