CREATE TABLE IF NOT EXISTS auth_user (
  user_id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (username = LOWER(username))
);

CREATE TABLE IF NOT EXISTS auth_session (
  session_token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES auth_user(user_id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_session_expiration
  ON auth_session(expires_at);
