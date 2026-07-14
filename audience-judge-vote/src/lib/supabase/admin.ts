import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * サーバ側（API Routes）専用。service role key を使い RLS をバイパスして
 * データの読み書きを行う。ブラウザに露出させないこと。
 */
export function getSupabaseAdminClient(): SupabaseClient {
    if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
        throw new Error(
                "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません。"
              );
  }

  adminClient = createClient(url, serviceKey, {
        auth: {
                persistSession: false,
                autoRefreshToken: false,
        },
        global: {
                // Vercel の Fluid compute 環境では、外部APIへの GET フェッチが
          // 自動的にキャッシュされることがあるため、常に最新データを取得できるよう
          // service role クライアントの全リクエストでキャッシュを明示的に無効化する。
          fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
        },
  });

  return adminClient;
}

/**
 * anon key を使い、クライアントから送られてきたアクセストークンの正当性を
 * Supabase Auth に問い合わせて検証する（管理APIの認可チェック用）。
 */
export async function getAuthenticatedAdminUser(request: Request) {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

  const verifier = createClient(url, anonKey, {
        global: {
                fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
        },
  });
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
}
