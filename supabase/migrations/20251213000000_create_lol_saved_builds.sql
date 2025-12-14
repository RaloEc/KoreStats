-- Builds guardadas de League of Legends (snapshot de items + runas)
CREATE TABLE IF NOT EXISTS lol_saved_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  match_id TEXT,
  source_puuid TEXT,
  source_summoner_name TEXT,

  champion_id INTEGER NOT NULL,
  champion_name TEXT NOT NULL,
  role TEXT,

  queue_id INTEGER,
  game_version TEXT,
  win BOOLEAN,

  items INTEGER[] NOT NULL,

  perk_primary_style INTEGER,
  perk_sub_style INTEGER,
  keystone_perk_id INTEGER,
  perks JSONB,

  note TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, match_id, source_puuid)
);

CREATE INDEX IF NOT EXISTS idx_lol_saved_builds_user_created_at
  ON lol_saved_builds(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lol_saved_builds_user_champion
  ON lol_saved_builds(user_id, champion_id);

ALTER TABLE lol_saved_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved builds"
  ON lol_saved_builds
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved builds"
  ON lol_saved_builds
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved builds"
  ON lol_saved_builds
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved builds"
  ON lol_saved_builds
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_lol_saved_builds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lol_saved_builds_updated_at ON lol_saved_builds;
CREATE TRIGGER trigger_update_lol_saved_builds_updated_at
BEFORE UPDATE ON lol_saved_builds
FOR EACH ROW
EXECUTE FUNCTION update_lol_saved_builds_updated_at();
