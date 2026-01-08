-- Agregar columna historial_ediciones a la tabla comentarios
ALTER TABLE public.comentarios ADD COLUMN IF NOT EXISTS historial_ediciones JSONB NULL;

-- Comentario explicativo
COMMENT ON COLUMN public.comentarios.historial_ediciones IS 'Almacena el historial de ediciones de un comentario en formato JSON con la estructura: {original: string, versiones: [{contenido: string, fecha: string, version: number}]}';
