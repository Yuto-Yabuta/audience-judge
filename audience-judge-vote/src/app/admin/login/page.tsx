"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAdminSession } from "@/lib/adminSession";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ログインに失敗しました。");
        return;
      }
      saveAdminSession(json.access_token, json.user?.email);
      router.replace("/admin/matches");
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-shell">
      <div className="admin-main" style={{ maxWidth: 380, paddingTop: 60 }}>
        <div className="admin-card">
          <h3>運営ログイン</h3>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-row">
              <label>メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="admin-form-row">
              <label>パスワード</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "ログイン中…" : "ログイン"}
            </button>
          </form>
        </div>
        <p className="help-text">
          管理アカウントは Supabase の Authentication からあらかじめ作成してください。
        </p>
      </div>
    </div>
  );
}
