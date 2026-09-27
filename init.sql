CREATE TABLE IF NOT EXISTS request_logs (
  id SERIAL PRIMARY KEY,
  service_name TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  forwarded_for TEXT,
  forwarded_host TEXT,
  forwarded_proto TEXT,
  status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);