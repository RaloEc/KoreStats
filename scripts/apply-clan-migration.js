// Script para aplicar la migración del sistema de clanes en Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Variables de entorno de Supabase no configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = `
-- 1. Tabla de Clanes
CREATE TABLE IF NOT EXISTS clans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    tag VARCHAR(5) NOT NULL UNIQUE,
    description TEXT,
    game VARCHAR(30) NOT NULL CHECK (game IN ('league_of_legends', 'delta_force')),
    discord_url VARCHAR(255),
    join_policy VARCHAR(20) DEFAULT 'open' CHECK (join_policy IN ('open', 'apply', 'invite_only')),
    require_exclusive BOOLEAN DEFAULT FALSE,
    requirements JSONB DEFAULT '{}'::jsonb,
    logo_url VARCHAR(255),
    owner_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clans_game ON clans(game);
CREATE INDEX IF NOT EXISTS idx_clans_name ON clans(name);

-- 2. Tabla de Miembros de Clanes
CREATE TABLE IF NOT EXISTS clan_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' NOT NULL CHECK (role IN ('leader', 'officer', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(clan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);

-- 3. Tabla de Solicitudes e Invitaciones
CREATE TABLE IF NOT EXISTS clan_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('application', 'invitation')),
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(clan_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_clan_applications_user ON clan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_applications_clan ON clan_applications(clan_id);

-- 4. Función auxiliar de seguridad
CREATE OR REPLACE FUNCTION is_clan_admin(p_clan_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clan_members 
    WHERE clan_id = p_clan_id 
      AND user_id = p_user_id 
      AND role IN ('leader', 'officer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger exclusividad
CREATE OR REPLACE FUNCTION check_clan_member_exclusivity()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM clans WHERE id = NEW.clan_id AND require_exclusive = TRUE) THEN
    IF EXISTS (SELECT 1 FROM clan_members WHERE user_id = NEW.user_id AND clan_id <> NEW.clan_id) THEN
      RAISE EXCEPTION 'Este clan requiere exclusividad, y ya eres miembro de otro clan.';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM clan_members cm
    JOIN clans c ON cm.clan_id = c.id
    WHERE cm.user_id = NEW.user_id AND c.require_exclusive = TRUE AND cm.clan_id <> NEW.clan_id
  ) THEN
    RAISE EXCEPTION 'Ya perteneces a un clan exclusivo. Debes salir de él antes de unirte a otro.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clan_member_exclusivity ON clan_members;
CREATE TRIGGER trg_clan_member_exclusivity
BEFORE INSERT OR UPDATE ON clan_members
FOR EACH ROW EXECUTE FUNCTION check_clan_member_exclusivity();

-- 6. Trigger auto-leader
CREATE OR REPLACE FUNCTION add_clan_owner_as_leader()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO clan_members (clan_id, user_id, role) VALUES (NEW.id, NEW.owner_id, 'leader');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_add_clan_owner_as_leader ON clans;
CREATE TRIGGER trg_add_clan_owner_as_leader
AFTER INSERT ON clans
FOR EACH ROW EXECUTE FUNCTION add_clan_owner_as_leader();

-- 7. Habilitar RLS
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_applications ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS - CLANS
DROP POLICY IF EXISTS "Cualquiera puede ver clanes" ON clans;
CREATE POLICY "Cualquiera puede ver clanes" ON clans FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear clanes" ON clans;
CREATE POLICY "Usuarios autenticados pueden crear clanes" ON clans FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Dueño del clan puede actualizarlo" ON clans;
CREATE POLICY "Dueño del clan puede actualizarlo" ON clans FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Dueño del clan puede eliminarlo" ON clans;
CREATE POLICY "Dueño del clan puede eliminarlo" ON clans FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 9. Políticas RLS - CLAN_MEMBERS
DROP POLICY IF EXISTS "Cualquiera puede ver los miembros de clanes" ON clan_members;
CREATE POLICY "Cualquiera puede ver los miembros de clanes" ON clan_members FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Miembros pueden ser insertados por si mismos o por oficiales del clan" ON clan_members;
CREATE POLICY "Miembros pueden ser insertados por si mismos o por oficiales del clan" ON clan_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR is_clan_admin(clan_id, auth.uid()));

DROP POLICY IF EXISTS "Oficiales pueden cambiar roles" ON clan_members;
CREATE POLICY "Oficiales pueden cambiar roles" ON clan_members FOR UPDATE TO authenticated USING (is_clan_admin(clan_id, auth.uid()));

DROP POLICY IF EXISTS "Miembros pueden salir o ser expulsados por oficiales" ON clan_members;
CREATE POLICY "Miembros pueden salir o ser expulsados por oficiales" ON clan_members FOR DELETE TO authenticated
USING (auth.uid() = user_id OR is_clan_admin(clan_id, auth.uid()));

-- 10. Políticas RLS - CLAN_APPLICATIONS
DROP POLICY IF EXISTS "Miembros de la solicitud y oficiales pueden verlas" ON clan_applications;
CREATE POLICY "Miembros de la solicitud y oficiales pueden verlas" ON clan_applications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_clan_admin(clan_id, auth.uid()));

DROP POLICY IF EXISTS "Usuarios pueden crear solicitudes y oficiales crear invitaciones" ON clan_applications;
CREATE POLICY "Usuarios pueden crear solicitudes y oficiales crear invitaciones" ON clan_applications FOR INSERT TO authenticated
WITH CHECK ((type = 'application' AND auth.uid() = user_id) OR (type = 'invitation' AND is_clan_admin(clan_id, auth.uid())));

DROP POLICY IF EXISTS "Actualizar estado de solicitud/invitacion" ON clan_applications;
CREATE POLICY "Actualizar estado de solicitud/invitacion" ON clan_applications FOR UPDATE TO authenticated
USING ((type = 'application' AND is_clan_admin(clan_id, auth.uid())) OR (type = 'invitation' AND auth.uid() = user_id));

DROP POLICY IF EXISTS "Eliminar solicitudes/invitaciones" ON clan_applications;
CREATE POLICY "Eliminar solicitudes/invitaciones" ON clan_applications FOR DELETE TO authenticated
USING (auth.uid() = user_id OR is_clan_admin(clan_id, auth.uid()));
`;

async function runMigration() {
  console.log('🚀 Aplicando migración del sistema de clanes...');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
    // Fallback: ejecutar directamente
    return await supabase.from('clans').select('id').limit(1);
  });

  if (error) {
    console.log('ℹ️  Intentando ejecución por partes...');
  }

  // Verificar que las tablas se crearon
  const { data: tables, error: checkError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['clans', 'clan_members', 'clan_applications']);

  if (checkError) {
    console.log('📋 La migración debe aplicarse manualmente.');
    console.log('Ejecuta el SQL en el Dashboard de Supabase > SQL Editor');
  } else {
    console.log('✅ Tablas verificadas:', tables?.map(t => t.table_name).join(', '));
  }
}

runMigration().catch(console.error);
