-- Función para contar respuestas por hilo
-- Esta función recibe un array de IDs de hilos y devuelve un conjunto de resultados
-- con el ID del hilo y el conteo de respuestas para cada uno

CREATE OR REPLACE FUNCTION public.contar_respuestas_por_hilo(hilo_ids uuid[])
RETURNS TABLE(hilo_id uuid, conteo bigint) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    hilo_id,
    COUNT(*) as conteo
  FROM 
    public.foro_posts
  WHERE 
    hilo_id = ANY(hilo_ids)
  GROUP BY 
    hilo_id;
$$;

-- Permisos para la función
GRANT EXECUTE ON FUNCTION public.contar_respuestas_por_hilo(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contar_respuestas_por_hilo(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.contar_respuestas_por_hilo(uuid[]) TO service_role;
