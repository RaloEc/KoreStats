-- Agregar campos necesarios para calcular dúo frecuente sin full_json
-- Estos datos ya están disponibles en el JSON de cada partida

ALTER TABLE match_participants
ADD COLUMN IF NOT EXISTS team_id INTEGER,
ADD COLUMN IF NOT EXISTS riot_id_game_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS riot_id_tagline VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_icon_id INTEGER;

-- Crear índice para búsquedas rápidas de compañeros de equipo
CREATE INDEX IF NOT EXISTS idx_match_participants_match_team 
  ON match_participants(match_id, team_id);

-- Comentarios para documentación
COMMENT ON COLUMN match_participants.team_id IS 'ID del equipo (100 o 200)';
COMMENT ON COLUMN match_participants.riot_id_game_name IS 'Nombre de juego de Riot (ej: Faker)';
COMMENT ON COLUMN match_participants.riot_id_tagline IS 'Tag de Riot (ej: KR1)';
COMMENT ON COLUMN match_participants.profile_icon_id IS 'ID del ícono de perfil del jugador';
