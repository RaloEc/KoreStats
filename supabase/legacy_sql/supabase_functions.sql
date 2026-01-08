-- Función para crear una noticia (saltando las políticas RLS)
CREATE OR REPLACE FUNCTION crear_noticia(
  p_titulo TEXT,
  p_contenido TEXT,
  p_imagen_portada TEXT,
  p_autor TEXT,
  p_destacada BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_noticia_id UUID;
  v_noticia JSONB;
BEGIN
  -- Insertar la noticia
  INSERT INTO noticias (
    titulo,
    contenido,
    imagen_portada,
    autor,
    destacada,
    fecha_publicacion
  ) VALUES (
    p_titulo,
    p_contenido,
    p_imagen_portada,
    p_autor,
    p_destacada,
    NOW()
  ) RETURNING id INTO v_noticia_id;
  
  -- Obtener la noticia completa
  SELECT row_to_json(n)::jsonb INTO v_noticia
  FROM noticias n
  WHERE n.id = v_noticia_id;
  
  RETURN json_build_object(
    'id', v_noticia_id,
    'noticia', v_noticia
  )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para asignar una categoría a una noticia
CREATE OR REPLACE FUNCTION asignar_categoria_noticia(
  p_noticia_id UUID,
  p_categoria_id UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO noticias_categorias (
    noticia_id,
    categoria_id
  ) VALUES (
    p_noticia_id,
    p_categoria_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: La cláusula SECURITY DEFINER hace que estas funciones se ejecuten
-- con los privilegios del usuario que las creó (generalmente el propietario de la base de datos),
-- lo que permite saltarse las políticas RLS.
