-- Script para crear la tabla de mods en Supabase

-- Primero creamos la tabla de categorías de mods si no existe
CREATE TABLE IF NOT EXISTS categorias_mod (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ahora creamos la tabla principal de mods
CREATE TABLE IF NOT EXISTS mods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    version VARCHAR(50) NOT NULL,
    version_minecraft VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    autor VARCHAR(100) NOT NULL,
    descargas INTEGER DEFAULT 0,
    imagen_url TEXT,
    -- Enlaces a plataformas externas
    enlace_curseforge TEXT,
    enlace_modrinth TEXT,
    enlace_github TEXT,
    enlace_web_autor TEXT,
    -- Metadatos
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    CONSTRAINT mods_nombre_version_key UNIQUE (nombre, version),
    -- Asegurarse de que al menos un enlace esté presente
    CONSTRAINT check_enlaces CHECK (
        enlace_curseforge IS NOT NULL OR 
        enlace_modrinth IS NOT NULL OR
        enlace_github IS NOT NULL
    )
);

-- Actualizar la vista para incluir los nuevos campos
CREATE OR REPLACE VIEW mods_con_autor AS
SELECT 
    m.*,
    p.username as autor_username,
    p.avatar_url as autor_avatar,
    -- Función para obtener el enlace preferido (primero CurseForge, luego Modrinth, luego GitHub)
    COALESCE(
        m.enlace_curseforge, 
        m.enlace_modrinth, 
        m.enlace_github
    ) as enlace_principal,
    -- Función para obtener el tipo de enlace principal
    CASE 
        WHEN m.enlace_curseforge IS NOT NULL THEN 'curseforge'
        WHEN m.enlace_modrinth IS NOT NULL THEN 'modrinth'
        WHEN m.enlace_github IS NOT NULL THEN 'github'
        ELSE NULL
    END as tipo_enlace_principal
FROM 
    mods m
LEFT JOIN 
    perfiles p ON m.user_id = p.id;

-- Tabla de relación muchos a muchos entre mods y categorías
CREATE TABLE IF NOT EXISTS mods_categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mod_id UUID REFERENCES mods(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias_mod(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT mods_categorias_mod_id_categoria_id_key UNIQUE (mod_id, categoria_id)
);

-- Vista para mostrar mods con su autor (similar a noticias_con_autor)
CREATE OR REPLACE VIEW mods_con_autor AS
SELECT 
    m.*,
    p.username as autor_username,
    p.avatar_url as autor_avatar
FROM 
    mods m
LEFT JOIN 
    perfiles p ON m.user_id = p.id;

-- Políticas RLS (Row Level Security)
-- Habilitar RLS en la tabla mods
ALTER TABLE mods ENABLE ROW LEVEL SECURITY;

-- Política para permitir a todos leer mods
CREATE POLICY "Cualquiera puede ver mods" ON mods
    FOR SELECT USING (true);

-- Política para permitir a usuarios autenticados crear mods
CREATE POLICY "Usuarios autenticados pueden crear mods" ON mods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para permitir a usuarios autenticados actualizar sus propios mods
CREATE POLICY "Usuarios pueden actualizar sus propios mods" ON mods
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para permitir a usuarios autenticados eliminar sus propios mods
CREATE POLICY "Usuarios pueden eliminar sus propios mods" ON mods
    FOR DELETE USING (auth.uid() = user_id);

-- Habilitar RLS en la tabla mods_categorias
ALTER TABLE mods_categorias ENABLE ROW LEVEL SECURITY;

-- Política para permitir a todos leer relaciones de mods y categorías
CREATE POLICY "Cualquiera puede ver relaciones de mods y categorías" ON mods_categorias
    FOR SELECT USING (true);

-- Política para permitir a usuarios autenticados crear relaciones para sus propios mods
CREATE POLICY "Usuarios pueden crear relaciones para sus propios mods" ON mods_categorias
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM mods
            WHERE id = mod_id AND user_id = auth.uid()
        )
    );

-- Política para permitir a usuarios autenticados eliminar relaciones para sus propios mods
CREATE POLICY "Usuarios pueden eliminar relaciones para sus propios mods" ON mods_categorias
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM mods
            WHERE id = mod_id AND user_id = auth.uid()
        )
    );

-- Habilitar RLS en la tabla categorias_mod
ALTER TABLE categorias_mod ENABLE ROW LEVEL SECURITY;

-- Política para permitir a todos leer categorías de mods
CREATE POLICY "Cualquiera puede ver categorías de mods" ON categorias_mod
    FOR SELECT USING (true);

-- Política para permitir solo a administradores crear/actualizar/eliminar categorías
-- Nota: Esto asume que tienes una forma de identificar administradores
-- Puedes ajustar esta política según tu sistema de roles
CREATE POLICY "Solo administradores pueden gestionar categorías de mods" ON categorias_mod
    USING (
        EXISTS (
            SELECT 1 FROM perfiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Nota: Asegúrate de que la columna 'role' existe en la tabla 'perfiles'
-- Si no existe, puedes crearla con:
-- ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'usuario';
-- UPDATE perfiles SET role = 'admin' WHERE id = 'ID_DEL_ADMINISTRADOR';

-- Función para incrementar contador de descargas
CREATE OR REPLACE FUNCTION increment_mod_downloads(mod_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE mods
    SET descargas = descargas + 1
    WHERE id = mod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear algunas categorías iniciales para mods
INSERT INTO categorias_mod (nombre, descripcion) VALUES
('Tecnología', 'Mods relacionados con maquinaria, electricidad y tecnología'),
('Magia', 'Mods que añaden sistemas mágicos y hechizos'),
('Aventura', 'Mods que añaden nuevas dimensiones, estructuras y aventuras'),
('Optimización', 'Mods para mejorar el rendimiento del juego'),
('Decoración', 'Mods para añadir nuevos bloques decorativos y muebles'),
('Herramientas', 'Mods que añaden nuevas herramientas y armaduras'),
('Mobs', 'Mods que añaden nuevas criaturas al juego'),
('Biomas', 'Mods que añaden nuevos biomas y generación de mundo'),
('Utilidades', 'Mods con funcionalidades útiles variadas'),
('Interfaz', 'Mods que mejoran o modifican la interfaz de usuario')
ON CONFLICT (id) DO NOTHING;
