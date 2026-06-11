-- Migración SQL para agregar banners a clanes y crear sistema de reportes
-- Archivo: 20260527000000_add_clan_banners_and_reports.sql

-- 1. Agregar columna banner_url a la tabla clans si no existe
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS banner_url VARCHAR(255);

-- 2. Crear tabla clan_reports
CREATE TABLE IF NOT EXISTS public.clan_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_item VARCHAR(20) NOT NULL CHECK (reported_item IN ('logo', 'banner', 'general')),
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ
);

-- Indexar por clan_id, reporter_id y status
CREATE INDEX IF NOT EXISTS idx_clan_reports_clan_id ON public.clan_reports(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_reports_reporter_id ON public.clan_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_clan_reports_status ON public.clan_reports(status);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.clan_reports ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
DROP POLICY IF EXISTS "Cualquiera puede reportar clanes" ON public.clan_reports;
CREATE POLICY "Cualquiera puede reportar clanes" ON public.clan_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Usuarios pueden ver sus propios reportes de clan" ON public.clan_reports;
CREATE POLICY "Usuarios pueden ver sus propios reportes de clan" ON public.clan_reports
    FOR SELECT TO authenticated
    USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins y moderadores pueden ver todos los reportes de clan" ON public.clan_reports;
CREATE POLICY "Admins y moderadores pueden ver todos los reportes de clan" ON public.clan_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "Admins y moderadores pueden actualizar reportes de clan" ON public.clan_reports;
CREATE POLICY "Admins y moderadores pueden actualizar reportes de clan" ON public.clan_reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- 5. Trigger para limitar la creación de clanes a 1 por usuario
CREATE OR REPLACE FUNCTION public.check_clan_creation_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.clans WHERE owner_id = NEW.owner_id) >= 1 THEN
    RAISE EXCEPTION 'Solo se permite crear un clan por usuario.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_clan_creation_limit ON public.clans;
CREATE TRIGGER trg_check_clan_creation_limit
BEFORE INSERT ON public.clans
FOR EACH ROW
EXECUTE FUNCTION public.check_clan_creation_limit();
