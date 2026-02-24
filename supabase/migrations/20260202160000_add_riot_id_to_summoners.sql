-- Migración para añadir soporte de Riot ID (game_name y tag_line) a la tabla de summoners
ALTER TABLE public.summoners 
ADD COLUMN IF NOT EXISTS game_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tag_line VARCHAR(255);

COMMENT ON COLUMN public.summoners.game_name IS 'Nombre del jugador en Riot (GameName)';
COMMENT ON COLUMN public.summoners.tag_line IS 'Tag del jugador en Riot (TagLine)';

-- Migración de datos: tratar de separar el summoner_name si contiene un Riot ID (opcional pero recomendado)
-- Por ahora lo dejamos vacío y que se pueble con las sincronizaciones futuras.
