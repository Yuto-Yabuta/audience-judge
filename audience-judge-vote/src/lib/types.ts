export type MatchStatus = "pending" | "voting_open" | "voting_closed" | "finished";

export interface Performer {
  id: string;
  event_id: string;
  name: string;
  instagram_username: string;
  photo_url: string | null;
  affiliation: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  event_id: string;
  label: string;
  performer_a_id: string;
  performer_b_id: string;
  sort_order: number;
  status: MatchStatus;
  results_public: boolean;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface MatchWithPerformers extends Match {
  performer_a: Performer;
  performer_b: Performer;
}

export interface Tally {
  a_votes: number;
  b_votes: number;
  total: number;
  a_pct: number;
  b_pct: number;
}

export interface CurrentMatchResponse {
  match: MatchWithPerformers | null;
  my_choice: "A" | "B" | null;
}
