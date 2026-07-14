"use client";

/**
 * Instagram プロフィールへのディープリンク遷移（8章の技術方針に準拠）。
 * instagram:// アプリスキームを試み、一定時間ページ遷移が起きなければ
 * ブラウザ版の https://www.instagram.com/<username>/ にフォールバックする。
 * 「ワンタップで確実にフォロー完了」ではなく「最短距離でフォロー画面まで運ぶ」設計。
 */
export function openInstagramProfile(username: string) {
  const clean = username.replace(/^@/, "");
  const appUrl = `instagram://user?username=${encodeURIComponent(clean)}`;
  const webUrl = `https://www.instagram.com/${encodeURIComponent(clean)}/`;

  const start = Date.now();
  let didHide = false;

  const onVisibilityChange = () => {
    if (document.hidden) didHide = true;
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  window.location.href = appUrl;

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    // アプリに遷移できていれば大抵このスクリプトは既に非表示(hidden)状態。
    // 遷移していない(=非インストール等)場合のみブラウザ版へフォールバック。
    if (!didHide && Date.now() - start < 2000) {
      window.location.href = webUrl;
    }
  }, 900);
}
