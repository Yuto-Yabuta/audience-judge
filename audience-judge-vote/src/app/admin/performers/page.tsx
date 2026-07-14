"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminSession";
import type { Performer } from "@/lib/types";

type PerformerRow = Performer & { follow_click_count: number };

const emptyForm = { name: "", instagram_username: "", photo_url: "", affiliation: "" };

export default function AdminPerformersPage() {
  const [performers, setPerformers] = useState<PerformerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/performers");
      const json = await res.json();
      if (res.ok) setPerformers(json.performers ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (p: PerformerRow) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      instagram_username: p.instagram_username,
      photo_url: p.photo_url ?? "",
      affiliation: p.affiliation ?? "",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const path = editingId ? `/api/admin/performers/${editingId}` : "/api/admin/performers";
      const method = editingId ? "PATCH" : "POST";
      const res = await adminFetch(path, { method, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "保存に失敗しました。");
        return;
      }
      resetForm();
      load();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この出場者を削除しますか？（対戦カードで使用中の場合は削除できません）")) return;
    const res = await adminFetch(`/api/admin/performers/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const json = await res.json().catch(() => ({}));
      window.alert(json.error || "削除に失敗しました。");
    }
  };

  return (
    <div>
      <div className="admin-card">
        <h3>{editingId ? "出場者を編集" : "出場者を登録"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <label>表示名</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="admin-form-row">
            <label>Instagramユーザー名（@なし）</label>
            <input
              required
              value={form.instagram_username}
              onChange={(e) => setForm({ ...form, instagram_username: e.target.value })}
            />
          </div>
          <div className="admin-form-row">
            <label>写真URL（任意）</label>
            <input
              value={form.photo_url}
              onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="admin-form-row">
            <label>所属・肩書（任意）</label>
            <input
              value={form.affiliation}
              onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {editingId ? "更新する" : "登録する"}
            </button>
            {editingId && (
              <button type="button" className="admin-btn admin-btn-outline" onClick={resetForm}>
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>出場者一覧（{performers.length}名）</h3>
        {loading ? (
          <p className="help-text">読み込み中…</p>
        ) : performers.length === 0 ? (
          <p className="help-text">まだ出場者が登録されていません。</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>名前</th>
                <th>Instagram</th>
                <th>所属</th>
                <th>フォロータップ数</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {performers.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>@{p.instagram_username}</td>
                  <td>{p.affiliation || "—"}</td>
                  <td>{p.follow_click_count}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="admin-btn admin-btn-outline" onClick={() => startEdit(p)}>
                        編集
                      </button>
                      <button
                        className="admin-btn admin-btn-danger"
                        onClick={() => handleDelete(p.id)}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
