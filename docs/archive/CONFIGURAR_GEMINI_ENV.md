# Configuración de Variables de Entorno para Gemini AI

## Pasos para configurar las variables de entorno en Supabase

### 1. Agregar variables al archivo .env.local

Agrega estas líneas a tu archivo `.env.local`:

```bash
# Google Gemini AI
GEMINI_API_KEY="TU_CLAVE_GEMINI"
GEMINI_PROJECT_ID="TU_PROJECT_ID"
```

### 2. Configurar variables en Supabase Dashboard

1. Ve al Dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** > **Edge Functions**
4. En la sección **Environment Variables**, agrega:

   - **Variable Name:** `GEMINI_API_KEY`
   - **Value:** *(pega aquí la clave rotada que obtuviste en Google Cloud)*

   - **Variable Name:** `GEMINI_PROJECT_ID`  
   - **Value:** *(usa el ID del proyecto configurado en Google Cloud)*

### 3. Verificar que la función de borde esté desplegada

La función `analyze-weapon-stats` ya está desplegada. Para verificar:

1. Ve a **Edge Functions** en el dashboard de Supabase
2. Busca la función `analyze-weapon-stats`
3. Verifica que esté en estado **ACTIVE**

### 4. Probar la funcionalidad

Una vez configuradas las variables:

1. Inicia el servidor de desarrollo: `npm run dev`
2. Ve a `/foro/crear-hilo`
3. Haz clic en "Analizar Estadísticas de Arma"
4. Sube una imagen de estadísticas de arma
5. Verifica que el análisis funcione correctamente

## Notas importantes

- Las variables de entorno deben estar configuradas tanto localmente como en Supabase
- La función de borde necesita las variables para comunicarse con la API de Gemini
- Si hay errores, revisa los logs de la función en el dashboard de Supabase
