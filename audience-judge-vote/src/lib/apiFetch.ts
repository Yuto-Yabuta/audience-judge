"use client";

/**
 * 会場回線が不安定な場合を想定し、失敗時に自動で1回だけリトライするfetch。
 * それでも失敗した場合は例外を投げるので、呼び出し側でエラー表示する（9.2）。
 */
export async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  retries = 1
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok && res.status >= 500 && attempt < retries) {
        lastError = new Error(`server error: ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("network error");
}
