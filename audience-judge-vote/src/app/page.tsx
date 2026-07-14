"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getOrCreateVoterToken } from "@/lib/voterToken";
import { fetchWithRetry } from "@/lib/apiFetch";
import { openInstagramProfile } from "@/lib/instagram";
import type { CurrentMatchResponse, Performer, Tally } from "@/lib/types";

function initials(name: string) {
  return name.trim().slice(0, 2);
}

function PlayerAvatar({ performer }: { performer: Performer }) {
  if (performer.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={performer.photo_url} alt={performer.name} className="player-photo" />;
  }
  return <div className="player-photo">{initials(performer.name)}</div>;
}

function FollowButton({
  performer,
  voterToken,
  emphasize,
}: {
  performer: Performer;
  voterToken: string;
  emphasize?: boolean;
}) {
  const handleClick = () => {
    try {
      fetch("/api/follow-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performer_id: performer.id, voter_token: voterToken }),
        keepalive: true,
      }).catch(() => {});
    } finally {
      openInstagramProfile(performer.instagram_username);
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-follow ${emphasize ? "btn-follow--emph" : ""}`}
      onClick={handleClick}
    >
      📸 @{performer.instagram_username} をフォロー
    </button>
  );
}

function ResultsBar({ tally, aName, bName }: { tally: Tally; aName: string; bName: string }) {
  return (
    <div className="results-bar-wrap">
      <div className="results-bar-track">
        <div className="results-bar-a" style={{ width: `${tally.a_pct}%` }} />
        <div className="results-bar-b" style={{ width: `${tally.b_pct}%` }} />
      </div>
      <div className="results-pct">
        <span>{aName} {tally.a_pct}%</span>
        <span>{bName} {tally.b_pct}%</span>
      </div>
      <p className="help-text" style={{ marginTop: 8 }}>総投票数 {tally.total} 票</p>
    </div>
  );
}

export default function VisitorHome() {
  const [voterToken, setVoterToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CurrentMatchResponse & { results: Tally | null }>({
    match: null,
    my_choice: null,
    results: null,
  });
  const [pendingChoice, setPendingChoice] = useState<"A" | "B" | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const tokenRef = useRef("");

  const load = useCallback(async (token: string) => {
    try {
      const res = await fetchWithRetry(
        `/api/current-match?voter_token=${encodeURIComponent(token)}`
      );
      const json = await res.json();
      setData(json);
    } catch {
      // 通信エラー時は現状の画面を維持し、次のRealtimeイベントか再取得を待つ
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getOrCreateVoterToken();
    setVoterToken(token);
    tokenRef.current = token;
    load(token);

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("public-match-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => load(tokenRef.current)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => load(tokenRef.current)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const handleVote = async (choice: "A" | "B") => {
    if (!data.match) return;
    setPendingChoice(choice);
    setVoteError(null);
    try {
      const res = await fetchWithRetry("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: data.match.id,
          choice,
          voter_token: voterToken,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setVoteError(json.error || "投票に失敗しました。もう一度お試しください。");
      } else {
        setData((prev) => ({ ...prev, my_choice: choice }));
      }
    } catch {
      setVoteError("通信エラーが発生しました。電波状況を確認しもう一度お試しください。");
    } finally {
      setPendingChoice(null);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <div className="center-fill">
          <div className="spinner" />
          <p>読み込み中…</p>
        </div>
      </div>
    );
  }

  const { match, my_choice, results } = data;

  if (!match) {
    return (
      <div className="screen">
        <div className="center-fill">
          <h1>まもなく開始します</h1>
          <p>
            会場のスタッフの案内をお待ちください。
            <br />
            対戦がはじまると、この画面に投票カードが表示されます。
          </p>
        </div>
      </div>
    );
  }

  if (match.status === "pending") {
    return (
      <div className="screen">
        <div className="top-bar">
          <div className="top-bar__title">次の対戦</div>
          <div className="top-bar__label">{match.label}</div>
        </div>
        <div className="center-fill">
          <h1>まもなく開始します</h1>
          <p>投票受付が始まるまでこのままお待ちください。</p>
        </div>
      </div>
    );
  }

  if (match.status === "voting_open") {
    const voted = !!my_choice;
    return (
      <div className="screen">
        <div className="top-bar">
          <div className="top-bar__title">投票受付中</div>
          <div className="top-bar__label">{match.label}</div>
        </div>

        <div className="vote-note">
          技術の採点ではありません。「どちらのパフォーマンスに感動したか」で投票してください。
        </div>

        {voteError && <p className="error-text" style={{ textAlign: "center" }}>{voteError}</p>}

        <div className="card-stack">
          <div
            className={`player-card player-card--a ${
              my_choice === "A" ? "player-card--voted-for" : ""
            }`}
          >
            <PlayerAvatar performer={match.performer_a} />
            <div className="player-name">{match.performer_a.name}</div>
            {match.performer_a.affiliation && (
              <div className="player-affiliation">{match.performer_a.affiliation}</div>
            )}
            <button
              type="button"
              className={`btn btn-vote btn-vote--a ${
                my_choice === "A" ? "btn-vote--voted" : ""
              }`}
              disabled={pendingChoice !== null}
              onClick={() => handleVote("A")}
            >
              {my_choice === "A" ? "✓ 投票済み" : `${match.performer_a.name} に投票`}
            </button>
            <FollowButton performer={match.performer_a} voterToken={voterToken} />
          </div>

          <div className="vs-divider">VS</div>

          <div
            className={`player-card player-card--b ${
              my_choice === "B" ? "player-card--voted-for" : ""
            }`}
          >
            <PlayerAvatar performer={match.performer_b} />
            <div className="player-name">{match.performer_b.name}</div>
            {match.performer_b.affiliation && (
              <div className="player-affiliation">{match.performer_b.affiliation}</div>
            )}
            <button
              type="button"
              className={`btn btn-vote btn-vote--b ${
                my_choice === "B" ? "btn-vote--voted" : ""
              }`}
              disabled={pendingChoice !== null}
              onClick={() => handleVote("B")}
            >
              {my_choice === "B" ? "✓ 投票済み" : `${match.performer_b.name} に投票`}
            </button>
            <FollowButton performer={match.performer_b} voterToken={voterToken} />
          </div>
        </div>

        {voted && (
          <p className="help-text" style={{ marginTop: 14 }}>
            締切までは投票先を変更できます。
          </p>
        )}
      </div>
    );
  }

  // voting_closed / finished
  return (
    <div className="screen">
      <div className="top-bar">
        <div className="top-bar__title">{match.label}</div>
      </div>

      <div className="status-banner status-banner--closed">投票は締め切られました</div>

      <div className="center-fill" style={{ flex: "none", paddingBottom: 8 }}>
        {my_choice ? (
          <p>ご投票ありがとうございました！</p>
        ) : (
          <p>この対戦の投票は終了しました。</p>
        )}
        {results ? (
          <ResultsBar tally={results} aName={match.performer_a.name} bName={match.performer_b.name} />
        ) : (
          <p className="help-text">結果は運営が公開すると表示されます。</p>
        )}
      </div>

      <div className="follow-promo">
        <h2>気に入ったプレイヤーをフォローしよう</h2>
        <p>会場の熱量そのままに、Instagramでも応援できます。</p>
        <div className="follow-row">
          <FollowButton performer={match.performer_a} voterToken={voterToken} emphasize />
          <FollowButton performer={match.performer_b} voterToken={voterToken} emphasize />
        </div>
      </div>
    </div>
  );
}
