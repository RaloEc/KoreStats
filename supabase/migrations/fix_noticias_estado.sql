-- Corregir estado de noticias existentes basado en es_activa
-- Si es_activa = true, marcar como 'publicada'
-- Si es_activa = false, marcar como 'borrador'

UPDATE noticias
SET estado = CASE
  WHEN es_activa = true THEN 'publicada'
  WHEN es_activa = false THEN 'borrador'
  ELSE 'borrador'
END
WHERE estado IS NULL OR estado = '';

-- Asegurar que todas las noticias tengan un estado válido
UPDATE noticias
SET estado = 'publicada'
WHERE estado IS NULL AND es_activa = true;

UPDATE noticias
SET estado = 'borrador'
WHERE estado IS NULL AND es_activa = false;

-- Establecer estado por defecto a 'borrador' para cualquier noticia sin estado
UPDATE noticias
SET estado = 'borrador'
WHERE estado IS NULL;
