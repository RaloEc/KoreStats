-- Migración: Sistema de Cola para LP Tracking
-- Fecha: 2025-12-16
-- Descripción: Crea tablas para gestionar cola de peticiones a Riot API
--              y snapshots de LP para tracking de ganancias/pérdidas

-- ============================================
-- Tabla: lp_tracking_queue
-- ============================================
-- Cola de trabajos para peticiones a Riot API
-- Permite procesar peticiones de forma controlada respetando rate limits

CREATE TABLE IF NOT EXISTS lp_tracking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puuid TEXT NOT NULL,
  platform_region TEXT NOT NULL DEFAULT 'la1', -- Región de plataforma (la1, na1, euw1, etc.)
  priority INTEGER NOT NULL DEFAULT 0, -- 0=normal, 1=en partida, 2=partida terminada
  action TEXT NOT NULL, -- 'check_active' | 'snapshot_lp_start' | 'snapshot_lp_end'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  game_id BIGINT, -- ID de la partida asociada (si aplica)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  result JSONB, -- Resultado de la petición (para debugging)
  error_message TEXT, -- Mensaje de error si falla
  retry_count INTEGER NOT NULL DEFAULT 0, -- Número de reintentos
  
  -- Constraints
  CONSTRAINT valid_action CHECK (action IN ('check_active', 'snapshot_lp_start', 'snapshot_lp_end')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 2)
);

-- Índices para optimizar consultas de la cola
CREATE INDEX IF NOT EXISTS idx_lp_queue_priority_status 
  ON lp_tracking_queue (priority DESC, status, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_lp_queue_user_status 
  ON lp_tracking_queue (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lp_queue_game_id 
  ON lp_tracking_queue (game_id)
  WHERE game_id IS NOT NULL;

-- ============================================
-- Tabla: lp_snapshots
-- ============================================
-- Almacena snapshots de LP en momentos específicos
-- Permite calcular ganancias/pérdidas comparando snapshots

CREATE TABLE IF NOT EXISTS lp_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puuid TEXT NOT NULL,
  game_id BIGINT, -- NULL si es snapshot manual o sin partida asociada
  snapshot_type TEXT NOT NULL, -- 'pre_game' | 'post_game' | 'manual'
  
  -- Datos de ranking SoloQ
  tier TEXT, -- IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER
  rank TEXT, -- I, II, III, IV (NULL para Master+)
  league_points INTEGER NOT NULL,
  wins INTEGER,
  losses INTEGER,
  queue_type TEXT NOT NULL DEFAULT 'RANKED_SOLO_5x5', -- 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_snapshot_type CHECK (snapshot_type IN ('pre_game', 'post_game', 'manual')),
  CONSTRAINT valid_queue_type CHECK (queue_type IN ('RANKED_SOLO_5x5', 'RANKED_FLEX_SR')),
  CONSTRAINT valid_lp CHECK (league_points >= 0 AND league_points <= 100)
);

-- Índices para consultas de snapshots
CREATE INDEX IF NOT EXISTS idx_lp_snapshots_user_game 
  ON lp_snapshots (user_id, game_id)
  WHERE game_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lp_snapshots_puuid_time 
  ON lp_snapshots (puuid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lp_snapshots_game_type 
  ON lp_snapshots (game_id, snapshot_type)
  WHERE game_id IS NOT NULL;

-- ============================================
-- Función: Calcular LP Change
-- ============================================
-- Calcula la diferencia de LP entre dos snapshots

CREATE OR REPLACE FUNCTION calculate_lp_change(
  p_game_id BIGINT,
  p_user_id UUID
)
RETURNS TABLE (
  lp_gained INTEGER,
  pre_lp INTEGER,
  post_lp INTEGER,
  pre_tier TEXT,
  post_tier TEXT,
  pre_rank TEXT,
  post_rank TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (post.league_points - pre.league_points) AS lp_gained,
    pre.league_points AS pre_lp,
    post.league_points AS post_lp,
    pre.tier AS pre_tier,
    post.tier AS post_tier,
    pre.rank AS pre_rank,
    post.rank AS post_rank
  FROM 
    lp_snapshots pre
  INNER JOIN 
    lp_snapshots post
    ON pre.game_id = post.game_id
    AND pre.user_id = post.user_id
    AND pre.snapshot_type = 'pre_game'
    AND post.snapshot_type = 'post_game'
  WHERE 
    pre.game_id = p_game_id
    AND pre.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Función: Limpiar cola antigua
-- ============================================
-- Elimina trabajos completados/fallidos antiguos (> 7 días)

CREATE OR REPLACE FUNCTION cleanup_old_queue_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM lp_tracking_queue
  WHERE 
    status IN ('completed', 'failed')
    AND processed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies
-- ============================================

-- Habilitar RLS
ALTER TABLE lp_tracking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE lp_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas para lp_tracking_queue
CREATE POLICY "Users can view their own queue jobs"
  ON lp_tracking_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue jobs"
  ON lp_tracking_queue
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role puede hacer todo (para el worker)
CREATE POLICY "Service role full access to queue"
  ON lp_tracking_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Políticas para lp_snapshots
CREATE POLICY "Users can view their own snapshots"
  ON lp_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role puede hacer todo (para el worker)
CREATE POLICY "Service role full access to snapshots"
  ON lp_snapshots
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Comentarios
-- ============================================

COMMENT ON TABLE lp_tracking_queue IS 'Cola de trabajos para peticiones a Riot API con control de rate limits';
COMMENT ON TABLE lp_snapshots IS 'Snapshots de LP para tracking de ganancias/pérdidas por partida';
COMMENT ON FUNCTION calculate_lp_change IS 'Calcula la diferencia de LP entre snapshots pre/post partida';
COMMENT ON FUNCTION cleanup_old_queue_jobs IS 'Limpia trabajos antiguos de la cola (ejecutar periódicamente)';
