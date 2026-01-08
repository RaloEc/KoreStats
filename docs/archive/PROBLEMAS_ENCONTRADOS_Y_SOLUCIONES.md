# Problemas Encontrados y Soluciones

## Problema 1: hasKey = false

### Síntoma
```
[analyze-weapon] Preparando invocación de Edge Function {
  ...
  hasKey: false
}
```

### Causa
La variable de entorno `SUPABASE_SERVICE_ROLE_KEY` no está configurada en `.env.local`

### Solución
Agrega a tu `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

Obtén la clave en: **Supabase Dashboard → Settings → API → Service Role Key**

---

## Problema 2: Gemini API Endpoint Incorrecto

### Síntoma
```
[analyze-weapon] Edge Function error response {
  status: 500,
  body: '{"error":"Gemini API error: {\\"error\\":{\\"code\\":404,\\"message\\":\\"models/gemini-1.5-flash is not found for API version v1beta...\\"}}"}'
}
```

### Causa
El endpoint de Gemini API era incorrecto:
- **Incorrecto:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Correcto:** `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent`

La versión `v1beta` no tiene el modelo `gemini-1.5-flash`. Necesita ser `v1`.

### Solución (COMPLETADA)
✅ Actualizado el endpoint en `supabase/functions/analyze-weapon-async/index.ts` línea 100

Cambio realizado:
```typescript
// Antes
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {

// Después
const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent', {
```

Edge Function redesplegada: **Version 4**

---

## Próximos Pasos

1. **Configura `.env.local` con `SUPABASE_SERVICE_ROLE_KEY`**
   ```bash
   # Obtén la clave de: Supabase Dashboard → Settings → API → Service Role Key
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

2. **Reinicia el servidor de desarrollo**
   ```bash
   npm run dev
   ```

3. **Reintenta un análisis de imagen**
   - Deberías ver `hasKey: true` ahora
   - La Edge Function debería procesar correctamente

4. **Verifica los logs de la Edge Function**
   ```bash
   npx supabase functions logs analyze-weapon-async --project-ref=qeeaptyhcqfaqdecsuqc
   ```

---

## Resumen de Cambios

| Problema | Archivo | Solución |
|----------|---------|----------|
| hasKey = false | `.env.local` | Agregar `SUPABASE_SERVICE_ROLE_KEY` |
| Endpoint Gemini incorrecto | `supabase/functions/analyze-weapon-async/index.ts` | Cambiar `v1beta` a `v1` |

**Edge Function desplegada:** Version 4 ✅
