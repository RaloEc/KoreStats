const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_APP = path.join(PROJECT_ROOT, 'src', 'app');
const API_DIR = path.join(SRC_APP, 'api');
const TEMP_API_DIR = path.join(SRC_APP, '_api_hidden_for_mobile_build');
const ADMIN_DIR = path.join(SRC_APP, 'admin');
const TEMP_ADMIN_DIR = path.join(SRC_APP, '_admin_hidden_for_mobile_build');
const MATCH_DIR = path.join(SRC_APP, 'match');
const TEMP_MATCH_DIR = path.join(SRC_APP, '_match_hidden_for_mobile_build');
const INTERCEPTED_MATCH_DIR = path.join(SRC_APP, 'perfil', '@modal', '(.)match');
const TEMP_INTERCEPTED_MATCH_DIR = path.join(SRC_APP, 'perfil', '@modal', '_match_hidden_for_mobile_build');

function buildMobile() {
  console.log('📱 Iniciando compilación para móvil (Capacitor)...');
  
  let apiHidden = false;
  let adminHidden = false;
  let matchHidden = false;
  let interceptedMatchHidden = false;

  // 1. Ocultar carpeta API
  if (fs.existsSync(API_DIR)) {
    console.log('🙈 Ocultando carpeta API temporalmente...');
    try {
      fs.renameSync(API_DIR, TEMP_API_DIR);
      apiHidden = true;
    } catch (err) {
      console.error('❌ Error al ocultar carpeta API:', err);
      process.exit(1);
    }
  }

  // 2. Ocultar carpeta Admin
  if (fs.existsSync(ADMIN_DIR)) {
    console.log('🙈 Ocultando carpeta Admin temporalmente...');
    try {
      fs.renameSync(ADMIN_DIR, TEMP_ADMIN_DIR);
      adminHidden = true;
    } catch (err) {
      console.error('❌ Error al ocultar carpeta Admin:', err);
      if (apiHidden) fs.renameSync(TEMP_API_DIR, API_DIR);
      process.exit(1);
    }
  }

  // 3. Ocultar carpeta Match
  if (fs.existsSync(MATCH_DIR)) {
    console.log('🙈 Ocultando carpeta Match temporalmente...');
    try {
      fs.renameSync(MATCH_DIR, TEMP_MATCH_DIR);
      matchHidden = true;
    } catch (err) {
      console.error('❌ Error al ocultar carpeta Match:', err);
      if (apiHidden) fs.renameSync(TEMP_API_DIR, API_DIR);
      if (adminHidden) fs.renameSync(TEMP_ADMIN_DIR, ADMIN_DIR);
      process.exit(1);
    }
  }

  // 4. Ocultar carpeta Match Interceptada
  if (fs.existsSync(INTERCEPTED_MATCH_DIR)) {
    console.log('🙈 Ocultando carpeta Match Interceptada temporalmente...');
    try {
      fs.renameSync(INTERCEPTED_MATCH_DIR, TEMP_INTERCEPTED_MATCH_DIR);
      interceptedMatchHidden = true;
    } catch (err) {
      console.warn('⚠️ No se pudo ocultar carpeta Match Interceptada (puede que no exista o error de permisos):', err.message);
      // No salimos con error fatal aquí, intentamos continuar
    }
  }

  try {
    // 5. Ejecutar build de Next.js
    console.log('🚀 Ejecutando Next.js Build...');
    execSync('npx cross-env IS_MOBILE=true next build', { 
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      env: { ...process.env, IS_MOBILE: 'true' }
    });
    console.log('✅ Build completado exitosamente.');
  } catch (err) {
    console.error('❌ Error durante el build:', err.message);
    process.exit(1);
  } finally {
    // 6. Restaurar carpetas
    if (apiHidden) {
      console.log('👀 Restaurando carpeta API...');
      try {
        if (fs.existsSync(TEMP_API_DIR)) fs.renameSync(TEMP_API_DIR, API_DIR);
      } catch (err) {
        console.error('❌ Error CRÍTICO al restaurar API.');
      }
    }

    if (adminHidden) {
      console.log('👀 Restaurando carpeta Admin...');
      try {
        if (fs.existsSync(TEMP_ADMIN_DIR)) fs.renameSync(TEMP_ADMIN_DIR, ADMIN_DIR);
      } catch (err) {
        console.error('❌ Error CRÍTICO al restaurar Admin.');
      }
    }

    if (matchHidden) {
      console.log('👀 Restaurando carpeta Match...');
      try {
        if (fs.existsSync(TEMP_MATCH_DIR)) fs.renameSync(TEMP_MATCH_DIR, MATCH_DIR);
      } catch (err) {
        console.error('❌ Error CRÍTICO al restaurar Match.');
      }
    }

    if (interceptedMatchHidden) {
      console.log('👀 Restaurando carpeta Match Interceptada...');
      try {
        if (fs.existsSync(TEMP_INTERCEPTED_MATCH_DIR)) fs.renameSync(TEMP_INTERCEPTED_MATCH_DIR, INTERCEPTED_MATCH_DIR);
      } catch (err) {
        console.error('❌ Error CRÍTICO al restaurar Match Interceptada.');
      }
    }
  }
}

buildMobile();
