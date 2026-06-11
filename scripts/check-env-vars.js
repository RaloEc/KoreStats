console.log('--- Variables de entorno de SUPABASE ---');
for (const key in process.env) {
  if (key.includes('SUPABASE') || key.includes('DB') || key.includes('PASS')) {
    console.log(`${key}: ${process.env[key] ? (process.env[key].substring(0, 15) + '...') : 'empty'}`);
  }
}
