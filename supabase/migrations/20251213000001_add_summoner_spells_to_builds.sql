-- Añadir hechizos de invocador a builds guardadas
ALTER TABLE lol_saved_builds
ADD COLUMN IF NOT EXISTS summoner1_id INTEGER,
ADD COLUMN IF NOT EXISTS summoner2_id INTEGER;
