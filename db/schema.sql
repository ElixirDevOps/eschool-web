CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY,
  said text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Accounts. `password_hash` holds a scrypt value produced by lib/security/passwords.ts —
-- never a password as written. `failed_sign_ins` and `locked_until` carry the lockout:
-- five consecutive failures set locked_until to fifteen minutes ahead.
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY,
  email citext NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL CHECK (password_hash LIKE 'scrypt$%'),
  failed_sign_ins integer NOT NULL DEFAULT 0 CHECK (failed_sign_ins >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions. `last_used_at` slides forward on every use; a session thirty days past its last
-- use is over, and is deleted rather than merely refused.
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_last_used_at ON sessions (last_used_at);

-- Anything untouched for thirty days is gone, whether or not anyone asks for it.
DELETE FROM sessions WHERE last_used_at < now() - interval '30 days';
