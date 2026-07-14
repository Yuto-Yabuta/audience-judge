import { NextResponse } from "next/server";
import { getAuthenticatedAdminUser } from "@/lib/supabase/admin";

export async function requireAdmin(request: Request) {
  const user = await getAuthenticatedAdminUser(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "認証が必要です。管理画面に再ログインしてください。" },
        { status: 401 }
      ),
    };
  }
  return { user, response: null };
}
