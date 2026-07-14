"use client";

const STORAGE_KEY = "ajv_voter_token_v1";
const COOKIE_KEY = "ajv_voter_token_v1";

function generateToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // フォールバック（古いブラウザ向け簡易UUID）
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * 端末ごとの匿名投票トークンを取得する。初回アクセス時に自動発行し、
 * localStorage と Cookie の両方に保存する（どちらかが消えても復元できるように）。
 * 個人情報は含まない、イベント終了後に破棄してよい匿名IDである（9.3参照）。
 */
export function getOrCreateVoterToken(): string {
  if (typeof window === "undefined") return "";

  let token = window.localStorage.getItem(STORAGE_KEY) || getCookie(COOKIE_KEY);

  if (!token) {
    token = generateToken();
  }

  window.localStorage.setItem(STORAGE_KEY, token);
  setCookie(COOKIE_KEY, token, 30);

  return token;
}
