-- =====================================================
-- MIGRACIÓN: Seguidores de Perfiles Pro
-- =====================================================
-- Permite a los usuarios seguir perfiles públicos (pro players, streamers)

CREATE TABLE IF NOT EXISTS public.user_follows_pro (
    user_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
    pro_profile_id UUID NOT NULL REFERENCES public.public_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (user_id, pro_profile_id)
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_follows_pro_user_id ON public.user_follows_pro(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_pro_pro_profile_id ON public.user_follows_pro(pro_profile_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.user_follows_pro ENABLE ROW LEVEL SECURITY;

-- Política 1: Lectura (Usuarios pueden ver a quién siguen y cuántos seguidores tiene un pro)
CREATE POLICY "Users can view follows" 
    ON public.user_follows_pro 
    FOR SELECT 
    USING (true);

-- Política 2: Inserción (Usuarios solo pueden seguir por sí mismos)
CREATE POLICY "Users can follow pros" 
    ON public.user_follows_pro 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Política 3: Eliminación (Usuarios solo pueden dejar de seguir por sí mismos)
CREATE POLICY "Users can unfollow pros" 
    ON public.user_follows_pro 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE public.user_follows_pro IS 'Registro de usuarios que siguen a perfiles públicos';
COMMENT ON COLUMN public.user_follows_pro.user_id IS 'ID del usuario que sigue (referencia a perfiles)';
COMMENT ON COLUMN public.user_follows_pro.pro_profile_id IS 'ID del perfil público seguido';
