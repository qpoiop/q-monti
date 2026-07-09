-- Momonti — durable, cross-DO tables.
-- The Durable Object owns live match state; D1 stores audit trails and
-- long-lived aggregates (match history, leaderboards).

CREATE TABLE IF NOT EXISTS matches (
  match_id      TEXT PRIMARY KEY,
  code          TEXT NOT NULL,
  game_id       TEXT NOT NULL,
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER,
  winner_user   TEXT,
  seat_count    INTEGER NOT NULL,
  seed          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_matches_ended ON matches(ended_at);
CREATE INDEX IF NOT EXISTS idx_matches_game ON matches(game_id);

CREATE TABLE IF NOT EXISTS match_seats (
  match_id     TEXT NOT NULL,
  seat_id      TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  display_name TEXT NOT NULL,
  final_rank   TEXT,
  score_delta  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, seat_id)
);
CREATE INDEX IF NOT EXISTS idx_match_seats_user ON match_seats(user_id);

CREATE TABLE IF NOT EXISTS user_totals (
  user_id       TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  matches       INTEGER NOT NULL DEFAULT 0,
  wins          INTEGER NOT NULL DEFAULT 0,
  score         INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL
);
