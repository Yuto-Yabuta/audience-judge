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

  const { data, error } = await supabase
    .from("matches")
    .update({ status: "voting_closed", closed_at: new Date().toISOString() })
    .eq("id", params.id)
    .select(
      "*, performer_a:performer_a_id(*), performer_b:performer_b_id(*)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "締切に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ match: data });
}
