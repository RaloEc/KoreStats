-- Migración: Crear función RPC para soft delete de noticias
-- Descripción: Función SECURITY DEFINER para asegurar que el update se ejecute correctamente
-- Fecha: 2025-02-10

CREATE OR REPLACE FUNCTION soft_delete_noticia(p_noticia_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.noticias
  SET deleted_at = NOW()
  WHERE id = p_noticia_id;
  
  -- Log para depuración
  RAISE NOTICE '[soft_delete_noticia] Noticia eliminada: %, deleted_at actualizado', p_noticia_id;
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION soft_delete_noticia(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_noticia(UUID) TO anon;
