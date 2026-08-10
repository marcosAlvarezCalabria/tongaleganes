ALTER TABLE calendar_projection ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE calendar_projection ADD COLUMN retry_at TEXT;
ALTER TABLE calendar_projection ADD COLUMN drift_at TEXT;
