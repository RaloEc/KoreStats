# 🔴 Problema: Supabase No Detecta Dockerfile

## Problema Actual

El error persiste: `"Spawning subprocesses is not allowed on Supabase Edge Runtime"`

**Causa:** Supabase está usando **Edge Runtime** por defecto, no el Docker nativo que especificamos en el Dockerfile.

### Por Qué Sucede

- Supabase Edge Functions usa `supabase/edge-runtime` por defecto
- El Dockerfile que creamos (`denoland/deno:1.37.0`) no se detecta automáticamente
- Supabase solo usa Dockerfile si se despliega con la CLI local (`supabase functions deploy`)
- Cuando se despliega vía API (como estamos haciendo), ignora el Dockerfile

---

## 🔧 Soluciones Posibles

### Opción 1: Usar Supabase CLI Local (Recomendado)

**Pasos:**

1. Instala Supabase CLI:
```bash
npm install -g supabase
```

2. Vincula tu proyecto:
```bash
supabase link --project-ref qeeaptyhcqfaqdecsuqc
```

3. Despliega la función con Docker:
```bash
supabase functions deploy video-converter
```

**Ventaja:** Supabase detectará el Dockerfile y usará Docker nativo
**Desventaja:** Requiere CLI local

---

### Opción 2: Usar Servicio Externo (Alternativa Rápida)

En lugar de FFmpeg en Edge Function, usar un servicio externo como:

- **Cloudinary** - Conversión de video en la nube
- **AWS Lambda + FFmpeg** - Función serverless con FFmpeg
- **Google Cloud Functions** - Similar a Lambda
- **Mux** - Plataforma especializada en video

**Ventaja:** No requiere cambios en Supabase
**Desventaja:** Costo adicional, dependencia externa

---

### Opción 3: Usar PostgreSQL Trigger + Webhook Externo

En lugar de invocar Edge Function desde el trigger:

1. El trigger actualiza BD a `processing`
2. Un webhook externo (tu servidor) detecta el cambio
3. Tu servidor ejecuta FFmpeg localmente
4. Actualiza BD con resultado

**Ventaja:** Control total sobre FFmpeg
**Desventaja:** Requiere servidor propio

---

## 📋 Recomendación

**Opción 1 (Supabase CLI)** es la más directa:

```bash
# 1. Instalar CLI
npm install -g supabase

# 2. Vincular proyecto
supabase link --project-ref qeeaptyhcqfaqdecsuqc

# 3. Desplegar con Docker
supabase functions deploy video-converter

# 4. Verificar que usa Docker
supabase functions list
```

Si ves que la función tiene estado `ACTIVE` y los logs muestran `[FFmpeg] Ejecutando:`, entonces funciona.

---

## 🧪 Cómo Verificar

Después de desplegar con CLI:

1. Sube un video
2. Ve a Supabase Dashboard → Functions → video-converter → Logs
3. Busca logs como:
   ```
   [video-converter] Solicitud recibida para videoId: abc123
   [FFmpeg] Ejecutando: ffmpeg -i /tmp/xyz ...
   [FFmpeg] Conversión exitosa.
   ```

Si ves `[FFmpeg] Ejecutando:` sin error, entonces **funciona**.

---

## 📝 Archivos Preparados

- ✅ `supabase/functions/video-converter/index.ts` - Código correcto
- ✅ `supabase/functions/video-converter/Dockerfile` - Docker nativo
- ✅ `supabase/functions/video-converter/deno.json` - Configuración Deno
- ✅ Trigger en BD - Llamando Edge Function
- ✅ RLS UPDATE Policy - Permitiendo actualización

**Todo está listo. Solo falta desplegar con CLI.**

---

## 🚀 Pasos Siguientes

1. Instala Supabase CLI
2. Vincula tu proyecto
3. Ejecuta: `supabase functions deploy video-converter`
4. Prueba subiendo un video
5. Verifica logs

---

## ⚠️ Nota Importante

Si no puedes usar CLI local, la alternativa es usar un servicio externo como Cloudinary o AWS Lambda que ya tenga FFmpeg instalado.

Pero con CLI, todo funciona sin costo adicional.
