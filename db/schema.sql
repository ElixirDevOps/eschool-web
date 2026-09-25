CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY,
  said text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
