"use client";

const TOKEN_KEY = "ajv_admin_access_token";
const EMAIL_KEY = "ajv_admin_email";

export function saveAdminSession(accessToken: string, email?: string) {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  if (email) window.localStorage.setItem(EMAIL_KEY, email);
}

export function getAdminAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getAdminEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EMAIL_KEY);
}

export function clearAdminSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(EMAIL_KEY);
}

/**
 * 管理API呼び出し用の認証付きfetch。401が返ってきた場合は
 * セッションを破棄してログイン画面に戻す。
 */
export async function adminFetch(input: string, init: RequestInit = {}) {
  const token = getAdminAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    clearAdminSession();
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
  }

  return res;
}
