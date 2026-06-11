// Script para aplicar la migración de banners y reportes de clanes en Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local de manera manual sin depender de dotenv
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.error('Error al cargar .env.local manualmente:', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: Variables de entorno de Supabase no configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const migrationFilePath = path.join(__dirname, '../supabase/migrations/20260527000000_add_clan_banners_and_reports.sql');
const sql = fs.readFileSync(migrationFilePath, 'utf8');

async function runMigration() {
  console.log('🚀 Aplicando migración de personalización y reportes de clanes...');
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error('❌ Error al ejecutar la migración por RPC:', error);
    process.exit(1);
  }

  console.log('✅ Migración aplicada exitosamente mediante RPC.');
  
  // Verificar que la columna y la tabla existan
  const { data: columnCheck, error: colError } = await supabase
    .from('clans')
    .select('banner_url')
    .limit(1);

  if (colError) {
    console.error('❌ Error al verificar la columna banner_url en clans:', colError);
  } else {
    console.log('✅ Columna banner_url verificada en la tabla clans.');
  }

  const { data: tableCheck, error: tableError } = await supabase
    .from('clan_reports')
    .select('id')
    .limit(1);

  if (tableError && tableError.code !== 'PGRST116') { // PGRST116 es "no rows returned" para .single(), pero para .select() normal no hay error si está vacía. Si hay error de que no existe, saldrá otra cosa
    console.error('❌ Error al verificar la tabla clan_reports:', tableError);
  } else {
    console.log('✅ Tabla clan_reports verificada.');
  }
}

runMigration().catch(console.error);
