-- =====================================================
-- MIGRACIÓN: Perfiles Públicos (Pro Players, Streamers)
-- =====================================================
-- Esta tabla permite destacar perfiles de interés sin crear cuentas de usuario reales.
-- Se enlaza directamente con la tabla 'summoners' mediante el PUUID.

CREATE TABLE IF NOT EXISTS public.public_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Enlace con datos de Riot (Foreign Key a caché de invocadores)
    -- Se usa PUUID como identificador inmutable
    puuid VARCHAR(255) NOT NULL REFERENCES public.summoners(puuid) ON DELETE CASCADE,
    
    -- Identidad Pública del Perfil
    slug VARCHAR(255) NOT NULL UNIQUE,      -- Identificador URL amigable (ej: "faker", "ibai")
    display_name VARCHAR(255) NOT NULL,     -- Nombre visual (ej: "Faker")
    
    -- Clasificación y Metadatos de Juego
    category VARCHAR(50) NOT NULL CHECK (category IN ('pro_player', 'streamer', 'high_elo')),
    main_role VARCHAR(20),                  -- Roles: TOP, JUNGLE, MID, BOTTOM, SUPPORT
    team_name VARCHAR(100),                 -- Equipo profesional (ej: "T1", "G2 Esports")
    
    -- Assets y Redes
    avatar_url TEXT,                        -- URL de imagen personalizada (foto real, no icono de juego)
    social_links JSONB DEFAULT '{}'::jsonb, -- Enlaces sociales: { "twitter": "...", "twitch": "..." }
    
    -- Control de Visibilidad
    is_active BOOLEAN DEFAULT true,         -- Si está visible públicamente
    is_featured BOOLEAN DEFAULT false,      -- Si debe aparecer destacado en la home/landing
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- Admin que creó el perfil
    
    -- Restricción: Un PUUID solo puede tener un perfil público
    UNIQUE(puuid)
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_public_profiles_slug ON public.public_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_public_profiles_category ON public.public_profiles(category);
CREATE INDEX IF NOT EXISTS idx_public_profiles_is_featured ON public.public_profiles(is_featured) WHERE is_featured = true;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura pública (Cualquiera puede ver perfiles activos)
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.public_profiles 
    FOR SELECT 
    USING (is_active = true OR (
        -- Los admins pueden ver incluso los inactivos
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE perfiles.id = auth.uid()
            AND perfiles.role = 'admin'
        )
    ));

-- Política 2: Gestión exclusiva de Administradores (Insert/Update/Delete)
CREATE POLICY "Admins can manage public profiles" 
    ON public.public_profiles 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE perfiles.id = auth.uid()
            AND perfiles.role = 'admin'
        )
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION public.update_public_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_public_profiles_updated_at ON public.public_profiles;
CREATE TRIGGER trigger_public_profiles_updated_at
    BEFORE UPDATE ON public.public_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_public_profiles_updated_at();

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE public.public_profiles IS 'Catálogo de perfiles destacados (Pros, Streamers) enlazados a estadísticas de Riot';
COMMENT ON COLUMN public.public_profiles.puuid IS 'Referencia al invocador en la tabla summoners';
COMMENT ON COLUMN public.public_profiles.slug IS 'Identificador único para URLs (seo-friendly)';
