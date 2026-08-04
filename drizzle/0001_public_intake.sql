ALTER TABLE appointments ADD COLUMN requested_artist_id TEXT REFERENCES staff(id);
