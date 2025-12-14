-- Corregir funciones RPC para incluir el campo 'estado'

-- 1. Actualizar función obtener_noticias_recientes
CREATE OR REPLACE FUNCTION obtener_noticias_recientes(
  limite INTEGER DEFAULT 5,
  incluir_borradores BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  titulo VARCHAR,
  slug TEXT,
  estado TEXT,
  vistas BIGINT,
  publicada_en TIMESTAMPTZ,
  creada_en TIMESTAMPTZ,
  imagen_portada VARCHAR,
  categoria_id UUID,
  categoria_nombre TEXT,
  categoria_color TEXT,
  autor_id UUID,
  autor_username TEXT,
  autor_avatar TEXT
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.titulo,
    n.slug,
    n.estado,
    COALESCE(n.vistas, 0)::BIGINT as vistas,
    n.fecha_publicacion,
    n.created_at,
    n.imagen_portada,
    c.id as categoria_id,
    c.nombre as categoria_nombre,
    c.color as categoria_color,
    n.autor_id,
    p.username AS autor_username,
    p.avatar_url AS autor_avatar
  FROM noticias n
  LEFT JOIN perfiles p ON n.autor_id = p.id
  LEFT JOIN noticias_categorias nc ON n.id = nc.noticia_id
  LEFT JOIN categorias c ON nc.categoria_id = c.id
  WHERE 
    CASE 
      WHEN incluir_borradores THEN n.estado IN ('publicada', 'borrador', 'programada')
      ELSE n.estado = 'publicada'
    END
  ORDER BY n.created_at DESC
  LIMIT limite;
END;
$$;

-- 2. Actualizar función obtener_noticias_mas_vistas
CREATE OR REPLACE FUNCTION obtener_noticias_mas_vistas(
  limite INTEGER DEFAULT 5,
  dias_atras INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  titulo VARCHAR,
  slug TEXT,
  estado TEXT,
  vistas BIGINT,
  publicada_en TIMESTAMPTZ,
  creada_en TIMESTAMPTZ,
  imagen_portada VARCHAR,
  categoria_id UUID,
  categoria_nombre TEXT,
  categoria_color TEXT,
  autor_id UUID,
  autor_username TEXT,
  autor_avatar TEXT,
  tendencia NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  fecha_limite TIMESTAMPTZ;
BEGIN
  fecha_limite := NOW() - (dias_atras || ' days')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    n.id,
    n.titulo,
    n.slug,
    n.estado,
    COALESCE(n.vistas, 0)::BIGINT as vistas,
    n.fecha_publicacion,
    n.created_at,
    n.imagen_portada,
    c.id as categoria_id,
    c.nombre as categoria_nombre,
    c.color as categoria_color,
    n.autor_id,
    p.username AS autor_username,
    p.avatar_url AS autor_avatar,
    -- Calcular tendencia (vistas / días desde publicación)
    CASE 
      WHEN n.fecha_publicacion IS NOT NULL AND n.fecha_publicacion > fecha_limite THEN
        ROUND(n.vistas::NUMERIC / GREATEST(EXTRACT(DAY FROM (NOW() - n.fecha_publicacion)), 1), 2)
      ELSE 
        ROUND(n.vistas::NUMERIC / GREATEST(EXTRACT(DAY FROM (NOW() - n.created_at)), 1), 2)
    END AS tendencia
  FROM noticias n
  LEFT JOIN perfiles p ON n.autor_id = p.id
  LEFT JOIN noticias_categorias nc ON n.id = nc.noticia_id
  LEFT JOIN categorias c ON nc.categoria_id = c.id
  WHERE 
    n.vistas > 0
    AND n.estado = 'publicada'
    AND (
      (n.fecha_publicacion IS NOT NULL AND n.fecha_publicacion >= fecha_limite)
      OR (n.fecha_publicacion IS NULL AND n.created_at >= fecha_limite)
    )
  ORDER BY n.vistas DESC, tendencia DESC
  LIMIT limite;
END;
$$;

-- 3. Actualizar función obtener_noticias_dashboard
CREATE OR REPLACE FUNCTION obtener_noticias_dashboard(
  limite_recientes INTEGER DEFAULT 5,
  limite_vistas INTEGER DEFAULT 5,
  incluir_borradores BOOLEAN DEFAULT TRUE,
  dias_atras INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  resultado JSON;
  recientes JSON;
  mas_vistas JSON;
BEGIN
  -- Obtener noticias recientes
  SELECT json_agg(row_to_json(t))
  INTO recientes
  FROM (
    SELECT * FROM obtener_noticias_recientes(limite_recientes, incluir_borradores)
  ) t;

  -- Obtener noticias más vistas
  SELECT json_agg(row_to_json(t))
  INTO mas_vistas
  FROM (
    SELECT * FROM obtener_noticias_mas_vistas(limite_vistas, dias_atras)
  ) t;

  -- Construir resultado unificado
  resultado := json_build_object(
    'recientes', COALESCE(recientes, '[]'::json),
    'mas_vistas', COALESCE(mas_vistas, '[]'::json),
    'timestamp', NOW()
  );

  RETURN resultado;
END;
$$;
