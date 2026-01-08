# Instrucciones de Despliegue - Arquitectura Asíncrona de Análisis de Armas

## Checklist de Despliegue

### Paso 1: Aplicar Migración SQL ✓

La migración ya está creada en:
```
supabase/migrations/20250102_create_weapon_analysis_jobs.sql
```

Para aplicarla:
```bash
# Opción 1: Usar Supabase CLI
supabase db push

# Opción 2: Ejecutar manualmente en Supabase Dashboard
# SQL Editor → Copiar contenido del archivo y ejecutar
```

**Verifica que se creó correctamente:**
```sql
SELECT * FROM weapon_analysis_jobs LIMIT 1;
```

---

### Paso 2: Desplegar Edge Function

La Edge Function está en:
```
supabase/functions/analyze-weapon-async/
├── index.ts
└── config.toml
```

Para desplegarla:
```bash
# Asegúrate de estar en la raíz del proyecto
cd r:\Proyectos\BitArena\Mc-Community

# Desplegar la función
npx supabase functions deploy analyze-weapon-async --project-ref=qeeaptyhcqfaqdecsuqc
```

**Verifica que se desplegó correctamente:**
```bash
# Ver logs
npx supabase functions logs analyze-weapon-async --project-ref=qeeaptyhcqfaqdecsuqc
```

---

### Paso 3: Configurar Variables de Entorno

#### En `.env.local` (desarrollo local):
```
NEXT_PUBLIC_SUPABASE_URL=https://qeeaptyhcqfaqdecsuqc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
GEMINI_API_KEY=AIzaSyDgIJ98S98ASKi5NmogR3XD0-qLsmLbY_g
```

#### En Supabase Dashboard (producción):
1. Ve a: **Settings → Edge Functions → Environment Variables**
2. Agrega una nueva variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** `AIzaSyDgIJ98S98ASKi5NmogR3XD0-qLsmLbY_g`
3. Click en **Save**

---

### Paso 4: Configurar Storage (Bucket)

El bucket `weapon-analysis-temp` debe existir. Para crearlo:

1. Ve a: **Storage → Buckets**
2. Click en **New Bucket**
3. Nombre: `weapon-analysis-temp`
4. Privacidad: **Private**
5. Click en **Create Bucket**

#### Configurar RLS Policies:

1. Click en el bucket `weapon-analysis-temp`
2. Click en **Policies**
3. Agregar 3 políticas:

**Política 1: INSERT (Usuarios pueden subir)**
```sql
CREATE POLICY "Users can upload their own files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'weapon-analysis-temp' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Política 2: SELECT (Usuarios pueden leer sus archivos)**
```sql
CREATE POLICY "Users can read their own files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'weapon-analysis-temp' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Política 3: DELETE (Usuarios pueden eliminar sus archivos)**
```sql
CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'weapon-analysis-temp' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

### Paso 5: Verificar Componentes de Código

Verifica que estos archivos existen y están correctos:

```
✓ supabase/migrations/20250102_create_weapon_analysis_jobs.sql
✓ supabase/functions/analyze-weapon-async/index.ts
✓ supabase/functions/analyze-weapon-async/config.toml
✓ src/app/api/analyze-weapon/route.ts
✓ src/app/api/check-analysis-status/route.ts
✓ src/components/weapon/WeaponAnalyzer.tsx
```

---

### Paso 6: Prueba Local

1. Inicia el servidor de desarrollo:
```bash
npm run dev
```

2. Abre el componente en tu navegador:
```
http://localhost:3000/test-weapon-analyzer
```

3. Selecciona una imagen de arma (JPEG, PNG o WebP, < 5MB)

4. Verifica que:
   - ✓ La imagen se sube correctamente
   - ✓ El estado cambia a "Analizando..."
   - ✓ El análisis se completa en 10-30 segundos
   - ✓ Se muestran las estadísticas o un mensaje de error

5. Revisa los logs:
   - **Navegador:** F12 → Console
   - **Terminal:** Verifica que no hay errores
   - **Supabase:** Revisa logs de Edge Function

---

### Paso 7: Desplegar a Producción

1. Commit y push de cambios:
```bash
git add .
git commit -m "feat: Implementar arquitectura asíncrona para análisis de armas"
git push
```

2. Netlify se desplegará automáticamente

3. Verifica que todo funciona en producción

---

## Troubleshooting

### Error: "Failed to upload file"
- Verifica que el bucket `weapon-analysis-temp` existe
- Verifica que las políticas RLS están configuradas
- Revisa los logs de Supabase

### Error: "Edge Function invocation error"
- Verifica que la Edge Function está desplegada
- Revisa los logs: `npx supabase functions logs analyze-weapon-async`
- Verifica que `GEMINI_API_KEY` está configurada

### Error: "Gemini API error"
- Verifica que `GEMINI_API_KEY` es válida
- Verifica que la API de Gemini está disponible
- Revisa el límite de requests de la API

### El análisis nunca completa
- Verifica que el polling está activo (F12 → Network)
- Revisa que la Edge Function está procesando (logs)
- Verifica que la BD se está actualizando

---

## Monitoreo en Producción

### Ver jobs en BD:
```sql
SELECT 
  id, 
  user_id, 
  status, 
  created_at, 
  updated_at,
  error_message
FROM weapon_analysis_jobs 
ORDER BY created_at DESC 
LIMIT 20;
```

### Ver jobs fallidos:
```sql
SELECT * FROM weapon_analysis_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

### Ver tiempo promedio de análisis:
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds,
  MIN(EXTRACT(EPOCH FROM (updated_at - created_at))) as min_seconds,
  MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_seconds
FROM weapon_analysis_jobs 
WHERE status = 'completed';
```

---

## Rollback (Si es necesario)

Si necesitas revertir los cambios:

1. Eliminar Edge Function:
```bash
npx supabase functions delete analyze-weapon-async --project-ref=qeeaptyhcqfaqdecsuqc
```

2. Eliminar tabla (cuidado - esto borra datos):
```sql
DROP TABLE IF EXISTS weapon_analysis_jobs CASCADE;
```

3. Revertir código en Git:
```bash
git revert <commit-hash>
git push
```

---

## Notas Importantes

⚠️ **Retención de archivos:** Los archivos en `weapon-analysis-temp` se guardan indefinidamente. Considera implementar una política de limpieza.

⚠️ **Costo de Gemini:** Cada análisis consume tokens. Monitorea el uso en Google Cloud Console.

⚠️ **Timeout de Edge Function:** Supabase tiene un límite de 60 segundos. Si Gemini tarda más, el job fallará.

✅ **Seguridad:** RLS garantiza que usuarios solo vean sus propios jobs. Los archivos están en un bucket privado.

✅ **Escalabilidad:** La arquitectura soporta múltiples análisis simultáneos sin problemas.
