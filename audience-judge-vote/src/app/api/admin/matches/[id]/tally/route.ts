import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminGuard";
import { computeTally } from "@/lib/tally";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const supabase = getSupabaseAdminClient();
  const tally = await computeTally(supabase, params.id);
  return NextResponse.json({ results: tally });
}
