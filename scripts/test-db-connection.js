const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local de manera manual
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
  console.error('Error al cargar .env.local:', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_KEY (prefix):', serviceKey ? serviceKey.substring(0, 20) + '...' : 'MISSING');

const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  // 1. Probar consulta simple a clans
  const { data: clans, error: clansError } = await supabase.from('clans').select('*').limit(1);
  if (clansError) {
    console.error('Error al consultar clans:', clansError);
  } else {
    console.log('Conexión exitosa, clanes encontrados (todo):', clans);
  }

  // 2. Obtener cabeceras de la respuesta de Supabase
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { 'apikey': serviceKey }
    });
    console.log('--- Cabeceras de respuesta ---');
    for (const [key, val] of res.headers.entries()) {
      console.log(`${key}: ${val}`);
    }
  } catch (err) {
    console.error('Error al obtener cabeceras:', err);
  }
  
  // 3. Probar rpc exec_sql con sql_query
  const { data: rpcData2, error: rpcError2 } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1 as val;' });
  if (rpcError2) {
    console.log('Error rpc exec_sql(sql_query):', rpcError2.message);
  } else {
    console.log('rpc exec_sql(sql_query) funciona! Resultado:', rpcData2);
  }
}

test().catch(console.error);
