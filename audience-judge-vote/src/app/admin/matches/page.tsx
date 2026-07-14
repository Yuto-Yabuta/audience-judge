"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminSession";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MatchWithPerformers, Performer, Tally } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "受付前",
  voting_open: "受付中",
  voting_closed: "締切",
  finished: "終了",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-pending",
  voting_open: "badge-open",
  voting_closed: "badge-closed",
  finished: "badge-finished",
};

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<MatchWithPerformers[]>([]);
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [tallies, setTallies] = useState<Record<string, Tally>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: "", performer_a_id: "", performer_b_id: "" });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    const res = await adminFetch("/api/admin/matches");
    const json = await res.json();
    if (res.ok) {
      const list: MatchWithPerformers[] = json.matches ?? [];
      setMatches(list);
      const nonPending = list.filter((m) => m.status !== "pending");
      const entries = await Promise.all(
        nonPending.map(async (m) => {
          const tRes = await adminFetch(`/api/admin/matches/${m.id}/tally`);
          const tJson = await tRes.json();
          return [m.id, tJson.results as Tally] as const;
        })
      );
      setTallies(Object.fromEntries(entries));
    }
  }, []);

  const loadPerformers = useCallback(async () => {
    const res = await adminFetch("/api/admin/performers");
    const json = await res.json();
    if (res.ok) setPerformers(json.performers ?? []);
  }, []);

  useEffect(() => {
    Promise.all([loadMatches(), loadPerformers()]).finally(() => setLoading(false));

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-match-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, loadMatches)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, loadMatches)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMatches, loadPerformers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await adminFetch("/api/admin/matches", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "作成に失敗しました。");
      return;
    }
    setForm({ label: "", performer_a_id: "", performer_b_id: "" });
    loadMatches();
  };

  const handleOpen = async (match: MatchWithPerformers) => {
    const already = matches.find((m) => m.status === "voting_open" && m.id !== match.id);
    const message = already
      ? `「${already.label}」が受付中です。締め切って「${match.label}」を受付開始しますか？`
      : `「${match.label}」の投票受付を開始しますか？`;
    if (!window.confirm(message)) return;
    setBusyId(match.id);
    try {
      const res = await adminFetch(`/api/admin/matches/${match.id}/open`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) window.alert(json.error || "受付開始に失敗しました。");
      loadMatches();
    } finally {
      setBusyId(null);
    }
  };

  const handleClose = async (match: MatchWithPerformers) => {
    if (!window.confirm(`「${match.label}」の投票を締め切りますか？`)) return;
    setBusyId(match.id);
    try {
      const res = await adminFetch(`/api/admin/matches/${match.id}/close`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) window.alert(json.error || "締切に失敗しました。");
      loadMatches();
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePublish = async (match: MatchWithPerformers) => {
    setBusyId(match.id);
    try {
      const res = await adminFetch(`/api/admin/matches/${match.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ public: !match.results_public }),
      });
      const json = await res.json();
      if (!res.ok) window.alert(json.error || "公開設定の変更に失敗しました。");
      loadMatches();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (match: MatchWithPerformers) => {
    if (!window.confirm(`「${match.label}」を削除しますか？投票データも削除されます。`)) return;
    const res = await adminFetch(`/api/admin/matches/${match.id}`, { method: "DELETE" });
    if (res.ok) loadMatches();
  };

  return (
    <div>
      <div className="admin-card">
        <h3>対戦カードを作成</h3>
        {performers.length < 2 ? (
          <p className="help-text">先に出場者管理から2名以上の出場者を登録してください。</p>
        ) : (
          <form onSubmit={handleCreate}>
            <div className="admin-form-row">
              <label>対戦名／ラウンド表示</label>
              <input
                required
                placeholder="例：準決勝1"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="admin-form-row">
              <label>A組</label>
              <select
                required
                value={form.performer_a_id}
                onChange={(e) => setForm({ ...form, performer_a_id: e.target.value })}
              >
                <option value="">選択してください</option>
                {performers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form-row">
              <label>B組</label>
              <select
                required
                value={form.performer_b_id}
                onChange={(e) => setForm({ ...form, performer_b_id: e.target.value })}
              >
                <option value="">選択してください</option>
                {performers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="admin-btn admin-btn-primary">
              対戦カードを作成
            </button>
          </form>
        )}
      </div>

      <div className="admin-card">
        <h3>対戦一覧（{matches.length}件）</h3>
        {loading ? (
          <p className="help-text">読み込み中…</p>
        ) : matches.length === 0 ? (
          <p className="help-text">まだ対戦カードが作成されていません。</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {matches.map((m) => {
              const tally = tallies[m.id];
              return (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid #eceef2",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <strong>{m.label}</strong>{" "}
                      <span className={`badge ${STATUS_BADGE[m.status]}`}>
                        {STATUS_LABEL[m.status]}
                      </span>
                    </div>
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleDelete(m)}
                    >
                      削除
                    </button>
                  </div>
                  <p className="help-text" style={{ margin: "0 0 10px" }}>
                    {m.performer_a?.name} vs {m.performer_b?.name}
                  </p>

                  {tally && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="results-bar-track" style={{ height: 10 }}>
                        <div className="results-bar-a" style={{ width: `${tally.a_pct}%` }} />
                        <div className="results-bar-b" style={{ width: `${tally.b_pct}%` }} />
                      </div>
                      <div className="results-pct">
                        <span>
                          {m.performer_a?.name} {tally.a_votes}票（{tally.a_pct}%）
                        </span>
                        <span>
                          {m.performer_b?.name} {tally.b_votes}票（{tally.b_pct}%）
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {m.status !== "voting_open" && (
                      <button
                        className="admin-btn admin-btn-primary"
                        disabled={busyId === m.id}
                        onClick={() => handleOpen(m)}
                      >
                        受付開始
                      </button>
                    )}
                    {m.status === "voting_open" && (
                      <button
                        className="admin-btn admin-btn-outline"
                        disabled={busyId === m.id}
                        onClick={() => handleClose(m)}
                      >
                        締切
                      </button>
                    )}
                    {(m.status === "voting_closed" || m.status === "finished") && (
                      <button
                        className="admin-btn admin-btn-outline"
                        disabled={busyId === m.id}
                        onClick={() => handleTogglePublish(m)}
                      >
                        結果を{m.results_public ? "非公開にする" : "公開する"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
