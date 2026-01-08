# Solución: Error 401 en Edge Function analyze-weapon-async

## Problema Identificado

La Edge Function `analyze-weapon-async` estaba devolviendo **401 Unauthorized** cuando se invocaba desde la API Route.

### Causa Raíz

La Edge Function tenía `verify_jwt: true` por defecto, lo que requiere un JWT válido en el header `Authorization`. Sin embargo, la invocación desde el servidor (fire-and-forget) no incluía un JWT válido, solo el Service Role Key.

### Logs que lo confirmaron

```
POST | 401 | https://qeeaptyhcqfaqdecsuqc.supabase.co/functions/v1/analyze-weapon-async
```

## Soluciones Implementadas

### 1. Mejorar Logging en API Route (COMPLETADO)

Se añadió logging detallado en `src/app/api/analyze-weapon/route.ts` para capturar la respuesta de la Edge Function:

```typescript
fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${invokeKey}`,
  },
  body: JSON.stringify({
    jobId: job.id,
  }),
})
  .then((response) => {
    console.log('[analyze-weapon] Edge Function respondió', {
      jobId: job.id,
      status: response.status,
    });
    if (!response.ok) {
      return response.text().then((text) => {
        console.error('[analyze-weapon] Edge Function error response', {
          jobId: job.id,
          status: response.status,
          body: text,
        });
      });
    }
  })
  .catch((error) => {
    console.error('[analyze-weapon] Edge Function invocation error:', {
      jobId: job.id,
      error: error.message,
    });
  });
```

### 2. Configurar verify_jwt = false (PENDIENTE)

Necesitas actualizar manualmente en Supabase Dashboard:

1. Ve a: **Functions → analyze-weapon-async**
2. Click en **Settings**
3. Busca la opción **JWT Verification** o **verify_jwt**
4. Desactívalo (set to `false`)
5. Guarda los cambios

O alternativamente, ejecuta en Supabase CLI:

```bash
# Edita el archivo config.toml localmente
supabase/functions/analyze-weapon-async/config.toml

# Asegúrate que contenga:
verify_jwt = false

# Luego redeploy:
npx supabase functions deploy analyze-weapon-async --project-ref=qeeaptyhcqfaqdecsuqc
```

## Próximos Pasos

1. **Desactiva JWT Verification** en la Edge Function (ver arriba)
2. **Reintenta un análisis** de imagen
3. **Revisa los logs** de la Edge Function:
   ```bash
   npx supabase functions logs analyze-weapon-async --project-ref=qeeaptyhcqfaqdecsuqc
   ```
4. **Verifica que el job se actualice** a `completed` o `failed` en la BD

## Alternativa: Usar Anon Key con JWT

Si no puedes desactivar JWT, puedes:

1. Generar un JWT válido en la API Route
2. Usarlo en el header `Authorization`

Pero esto es más complejo. La solución recomendada es desactivar JWT verification.

## Archivos Modificados

- `src/app/api/analyze-weapon/route.ts` - Mejorado logging de respuesta de Edge Function
- `supabase/functions/analyze-weapon-async/config.toml` - Agregado `verify_jwt = false`
