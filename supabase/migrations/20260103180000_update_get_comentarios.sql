-- Actualizar funcion get_comentarios_recientes_moderacion para incluir categoria

CREATE OR REPLACE FUNCTION get_comentarios_recientes_moderacion(
  limite INT DEFAULT 50,
  offset_val INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  contenido TEXT,
  autor_id UUID,
  autor_username TEXT,
  autor_avatar_url TEXT,
  autor_rol TEXT,
  hilo_id UUID,
  hilo_titulo TEXT,
  hilo_slug TEXT,
  categoria_nombre TEXT,
  categoria_slug TEXT,
  parent_id UUID,
  votos_conteo INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  editado BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id,
    fp.contenido::TEXT,
    fp.autor_id,
    p.username::TEXT as autor_username,
    p.avatar_url::TEXT as autor_avatar_url,
    p.role::TEXT as autor_rol,
    fp.hilo_id,
    h.titulo::TEXT as hilo_titulo,
    h.slug::TEXT as hilo_slug,
    c.nombre::TEXT as categoria_nombre,
    c.slug::TEXT as categoria_slug,
    fp.post_padre_id as parent_id,
    0 as votos_conteo,
    fp.created_at,
    fp.updated_at,
    COALESCE(fp.editado, false) as editado
  FROM foro_posts fp
  LEFT JOIN perfiles p ON fp.autor_id = p.id
  LEFT JOIN foro_hilos h ON fp.hilo_id = h.id
  LEFT JOIN foro_categorias c ON h.categoria_id = c.id
  WHERE fp.deleted_at IS NULL
  ORDER BY fp.created_at DESC
  LIMIT limite OFFSET offset_val;
END;
$$;
