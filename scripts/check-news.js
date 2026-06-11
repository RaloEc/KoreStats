const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente para no requerir dotenv
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    envVars[key] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in envVars:", Object.keys(envVars));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNews() {
  const id = "903eab7f-a131-4c99-91d2-d68afe056bac";
  const { data: noticia, error } = await supabase
    .from('noticias')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching news:", error);
    return;
  }

  console.log("NOTICIA ENCONTRADA:");
  console.log("ID:", noticia.id);
  console.log("Titulo:", noticia.titulo);
  console.log("Categoria ID:", noticia.categoria_id);
  console.log("Tipo/Type:", noticia.type);

  // Categorías asociadas
  const { data: relaciones } = await supabase
    .from("noticias_categorias")
    .select("categoria_id")
    .eq("noticia_id", id);

  console.log("Relaciones de categorias:", relaciones);

  if (relaciones && relaciones.length > 0) {
    const { data: cats } = await supabase
      .from("categorias")
      .select("*")
      .in("id", relaciones.map((r) => r.categoria_id));
    
    console.log("Categorias de la noticia:", cats);

    for (const cat of cats) {
      if (cat.parent_id) {
        const { data: parent } = await supabase
          .from("categorias")
          .select("*")
          .eq("id", cat.parent_id)
          .single();
        console.log(`Padre de ${cat.nombre}:`, parent);
      }
    }
  }
}

checkNews();
