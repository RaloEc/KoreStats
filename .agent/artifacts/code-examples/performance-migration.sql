-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Optimización de Performance - Perfil y Historial
-- Fecha: 2025-01-14
-- Autor: Performance Engineer
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. TABLA DE CACHE DE ESTADÍSTICAS DEL JUGADOR
-- Evita recalcular stats en cada request
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS player_stats_cache (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  puuid TEXT UNIQUE NOT NULL,
  
  -- Stats principales
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  winrate NUMERIC(5,2) DEFAULT 0,
  
  -- Promedios
  avg_kda NUMERIC(5,2) DEFAULT 0,
  avg_damage INTEGER DEFAULT 0,
  avg_gold INTEGER DEFAULT 0,
  avg_vision_score NUMERIC(5,2) DEFAULT 0,
  
  -- Stats por cola
  solo_games INTEGER DEFAULT 0,
  solo_wins INTEGER DEFAULT 0,
  flex_games INTEGER DEFAULT 0,
  flex_wins INTEGER DEFAULT 0,
  aram_games INTEGER DEFAULT 0,
  aram_wins INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda rápida por puuid
CREATE INDEX IF NOT EXISTS idx_player_stats_cache_puuid 
ON player_stats_cache(puuid);

-- Índice para búsqueda por user_id
CREATE INDEX IF NOT EXISTS idx_player_stats_cache_user_id 
ON player_stats_cache(user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 2. FUNCIÓN PARA ACTUALIZAR STATS DEL JUGADOR
-- Se ejecuta después de cada nueva partida
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_player_stats_cache()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obtener user_id del puuid
  SELECT user_id INTO v_user_id
  FROM linked_accounts_riot
  WHERE puuid = NEW.puuid
  LIMIT 1;

  -- Si no hay usuario vinculado, salir
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Actualizar o insertar stats
  INSERT INTO player_stats_cache (
    user_id,
    puuid,
    total_games,
    wins,
    losses,
    winrate,
    avg_kda,
    avg_damage,
    avg_gold,
    avg_vision_score,
    solo_games,
    solo_wins,
    flex_games,
    flex_wins,
    aram_games,
    aram_wins,
    updated_at
  )
  SELECT 
    v_user_id,
    NEW.puuid,
    COUNT(*),
    SUM(CASE WHEN mp.win THEN 1 ELSE 0 END),
    SUM(CASE WHEN NOT mp.win THEN 1 ELSE 0 END),
    ROUND(SUM(CASE WHEN mp.win THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2),
    ROUND(AVG(mp.kda), 2),
    ROUND(AVG(mp.total_damage_dealt)),
    ROUND(AVG(mp.gold_earned)),
    ROUND(AVG(mp.vision_score), 2),
    -- Stats por cola
    SUM(CASE WHEN m.queue_id = 420 THEN 1 ELSE 0 END),
    SUM(CASE WHEN m.queue_id = 420 AND mp.win THEN 1 ELSE 0 END),
    SUM(CASE WHEN m.queue_id = 440 THEN 1 ELSE 0 END),
    SUM(CASE WHEN m.queue_id = 440 AND mp.win THEN 1 ELSE 0 END),
    SUM(CASE WHEN m.queue_id = 450 THEN 1 ELSE 0 END),
    SUM(CASE WHEN m.queue_id = 450 AND mp.win THEN 1 ELSE 0 END),
    NOW()
  FROM match_participants mp
  JOIN matches m ON m.match_id = mp.match_id
  WHERE mp.puuid = NEW.puuid
  ON CONFLICT (puuid) DO UPDATE SET
    total_games = EXCLUDED.total_games,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    winrate = EXCLUDED.winrate,
    avg_kda = EXCLUDED.avg_kda,
    avg_damage = EXCLUDED.avg_damage,
    avg_gold = EXCLUDED.avg_gold,
    avg_vision_score = EXCLUDED.avg_vision_score,
    solo_games = EXCLUDED.solo_games,
    solo_wins = EXCLUDED.solo_wins,
    flex_games = EXCLUDED.flex_games,
    flex_wins = EXCLUDED.flex_wins,
    aram_games = EXCLUDED.aram_games,
    aram_wins = EXCLUDED.aram_wins,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stats después de INSERT
DROP TRIGGER IF EXISTS trigger_update_player_stats ON match_participants;
CREATE TRIGGER trigger_update_player_stats
AFTER INSERT ON match_participants
FOR EACH ROW
EXECUTE FUNCTION update_player_stats_cache();


-- ═══════════════════════════════════════════════════════════════════
-- 3. ÍNDICES OPTIMIZADOS PARA QUERIES DE HISTORIAL
-- Mejora el rendimiento de las consultas principales
-- ═══════════════════════════════════════════════════════════════════

-- Índice compuesto para filtrar por puuid y ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_matches_participants_history
ON match_participants(puuid, match_id);

-- Índice para el JOIN con matches ordenado por fecha
CREATE INDEX IF NOT EXISTS idx_matches_game_creation_desc
ON matches(game_creation DESC);

-- Índice para filtrar por queue_id
CREATE INDEX IF NOT EXISTS idx_matches_queue_id
ON matches(queue_id);

-- Índice parcial para partidas procesadas (más rápido para historial)
CREATE INDEX IF NOT EXISTS idx_matches_ready
ON matches(match_id, game_creation DESC)
WHERE ingest_status = 'ready';


-- ═══════════════════════════════════════════════════════════════════
-- 4. VISTA MATERIALIZADA PARA HISTORIAL LIGERO
-- Permite queries ultra-rápidas del historial reciente
-- ═══════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_match_history_light AS
SELECT 
  mp.match_id,
  mp.puuid,
  mp.champion_name,
  mp.champion_id,
  mp.win,
  mp.kills,
  mp.deaths,
  mp.assists,
  mp.kda,
  mp.total_damage_dealt,
  mp.gold_earned,
  mp.vision_score,
  mp.item0,
  mp.item1,
  mp.item2,
  mp.item3,
  mp.item4,
  mp.item5,
  mp.item6,
  mp.summoner1_id,
  mp.summoner2_id,
  mp.perk_primary_style,
  mp.perk_sub_style,
  mp.ranking_position,
  mp.lane,
  m.game_creation,
  m.game_duration,
  m.game_mode,
  m.queue_id,
  m.ingest_status
FROM match_participants mp
JOIN matches m ON m.match_id = mp.match_id
WHERE m.ingest_status = 'ready'
ORDER BY m.game_creation DESC;

-- Índice para la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_match_history_light_unique
ON mv_match_history_light(match_id, puuid);

CREATE INDEX IF NOT EXISTS idx_mv_match_history_light_puuid
ON mv_match_history_light(puuid, game_creation DESC);

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_match_history_light()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_match_history_light;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════
-- 5. TRIGGER PARA REFRESCAR VISTA MATERIALIZADA
-- Se ejecuta cada N partidas nuevas
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION maybe_refresh_match_history_mv()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Contar partidas nuevas desde último refresh
  SELECT COUNT(*) INTO v_count
  FROM matches
  WHERE created_at > (
    SELECT COALESCE(MAX(last_refresh), NOW() - INTERVAL '1 hour')
    FROM (SELECT NOW() AS last_refresh LIMIT 0) x
  );

  -- Refrescar si hay más de 50 partidas nuevas
  IF v_count > 50 THEN
    PERFORM refresh_match_history_light();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════
-- 6. OPTIMIZAR TABLA match_participants EXISTENTE
-- ═══════════════════════════════════════════════════════════════════

-- Asegurar que ranking_position no sea null donde sea posible
UPDATE match_participants
SET ranking_position = 0
WHERE ranking_position IS NULL;

-- Añadir constraint para que ranking_position tenga default
ALTER TABLE match_participants
ALTER COLUMN ranking_position SET DEFAULT 0;


-- ═══════════════════════════════════════════════════════════════════
-- 7. POLÍTICAS RLS PARA NUEVAS TABLAS
-- ═══════════════════════════════════════════════════════════════════

-- Habilitar RLS en player_stats_cache
ALTER TABLE player_stats_cache ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (stats son públicas)
CREATE POLICY "Stats visibles para todos"
ON player_stats_cache FOR SELECT
USING (true);

-- Política de escritura solo para service role
CREATE POLICY "Solo service role puede escribir stats"
ON player_stats_cache FOR ALL
USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════
-- 8. COMENTARIOS PARA DOCUMENTACIÓN
-- ═══════════════════════════════════════════════════════════════════

COMMENT ON TABLE player_stats_cache IS 
'Cache de estadísticas del jugador para evitar recálculos en cada request';

COMMENT ON MATERIALIZED VIEW mv_match_history_light IS 
'Vista materializada del historial sin full_json para queries ultra-rápidas';

COMMENT ON FUNCTION update_player_stats_cache() IS 
'Trigger function que actualiza el cache de stats después de cada partida';

COMMENT ON FUNCTION refresh_match_history_light() IS 
'Refresca la vista materializada del historial de partidas';
