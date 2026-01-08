# 🚀 Desplegar Edge Function Actualizada

## Problema Solucionado

✅ **Políticas RLS agregadas** al bucket `weapon-analysis-temp`
✅ **Mejor manejo de errores** en la API Route
✅ **Edge Function actualizada** para recibir datos binarios

## Pasos para Desplegar

### 1. Restaurar el archivo de la Edge Function

```bash
cd r:\Proyectos\BitArena\Mc-Community
move supabase\functions\analyze-weapon-stats\index.ts.bak supabase\functions\analyze-weapon-stats\index.ts
```

### 2. Desplegar la Edge Function a Supabase

```bash
npx supabase functions deploy analyze-weapon-stats --project-ref=qeeaptyhcqfaqdecsuqc
```

**Nota:** Reemplaza `qeeaptyhcqfaqdecsuqc` con tu project-ref de Supabase.

### 3. Verificar que se desplegó correctamente

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Edge Functions**
4. Busca `analyze-weapon-stats`
5. Verifica que esté en estado **ACTIVE**
6. Revisa los logs para asegurarte de que no hay errores

### 4. Probar la funcionalidad

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Ve a http://localhost:3000/foro/crear-hilo

3. Haz clic en "Analizar Estadísticas de Arma"

4. Sube una imagen de estadísticas

5. Espera a que se analice (5-10 segundos)

## Cambios Realizados

### 1. Políticas RLS en Storage

Se agregaron 3 políticas para el bucket `weapon-analysis-temp`:

- **INSERT:** Usuarios autenticados pueden subir archivos
- **SELECT:** Usuarios pueden leer sus propios archivos
- **DELETE:** Usuarios pueden eliminar sus propios archivos

### 2. Mejoras en la API Route

- Mejor logging de errores de subida
- Información detallada sobre por qué falla la subida
- Manejo correcto del cliente Supabase

### 3. Edge Function Actualizada

- Ahora recibe datos binarios en lugar de URLs
- Mejor manejo de errores
- Soporte completo para Gemini 1.5 Flash

## Solución de Problemas

### Las imágenes aún no se suben

1. Verifica que estés autenticado
2. Revisa la consola del navegador (F12) para ver errores
3. Revisa los logs del servidor (`npm run dev`)
4. Asegúrate de que el archivo sea menor a 5MB

### Error: "Forbidden"

- Las políticas RLS no se aplicaron correctamente
- Ejecuta nuevamente la migración SQL
- Verifica que el usuario esté autenticado

### La Edge Function no responde

1. Ve a Supabase Dashboard > Edge Functions
2. Haz clic en `analyze-weapon-stats`
3. Revisa la pestaña "Logs"
4. Verifica que `GEMINI_API_KEY` esté configurada

## Verificar que Todo Funciona

```bash
# 1. Construir la aplicación
npm run build

# 2. Iniciar el servidor
npm run dev

# 3. Abrir en el navegador
# http://localhost:3000/foro/crear-hilo
```

Si ves el botón "Analizar Estadísticas de Arma" y puedes subir una imagen sin errores, ¡todo está funcionando correctamente!
