-- Script para limpiar datos obsoletos de partidas en vivo
-- Elimina entradas de live_game_states que tienen más de 5 minutos de antigüedad

DELETE FROM live_game_states
WHERE 
  id LIKE 'live-%'
  AND updated_at < NOW() - INTERVAL '5 minutes';

-- Verificar cuántos registros quedan
SELECT COUNT(*) as remaining_live_games FROM live_game_states WHERE id LIKE 'live-%';
