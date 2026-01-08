# 🔧 Configuración de Supabase para Gemini AI

## Paso 1: Configurar Variables de Entorno en Supabase

### En el Dashboard de Supabase:

1. **Ve a tu proyecto** en https://supabase.com/dashboard
2. **Haz clic en Settings** (engranaje en la esquina inferior izquierda)
3. **Selecciona "Edge Functions"** en el menú lateral
4. **Busca la sección "Environment Variables"**
5. **Agrega estas dos variables:**

   ```
   Variable Name: GEMINI_API_KEY
   Value: <TU_CLAVE_GEMINI_ROTADA>
   ```

   ```
   Variable Name: GEMINI_PROJECT_ID
   Value: <TU_PROJECT_ID>
   ```

6. **Haz clic en "Save"** para cada variable

### Verificar que se guardaron:
- Las variables deben aparecer en la lista con un ícono de candado
- Si ves un error, intenta de nuevo

---

## Paso 2: Verificar la Edge Function

1. **Ve a "Edge Functions"** en el menú lateral
2. **Busca la función `analyze-weapon-stats`**
3. **Verifica que esté en estado ACTIVE** (debe mostrar un punto verde)
4. **Si no está, haz clic en ella y revisa los logs**

---

## Paso 3: Verificar el Storage Bucket

1. **Ve a "Storage"** en el menú lateral
2. **Busca el bucket `weapon-analysis-temp`**
3. **Si no existe, créalo:**
   - Haz clic en "New bucket"
   - Nombre: `weapon-analysis-temp`
   - Privado (no público)
   - Haz clic en "Create bucket"

---

## Paso 4: Configurar Variables Locales

En tu archivo `.env.local` (en la raíz del proyecto):

```bash
# Google Gemini AI
GEMINI_API_KEY="TU_CLAVE_GEMINI"
GEMINI_PROJECT_ID="TU_PROJECT_ID"
```

**Importante:** Este archivo está en `.gitignore`, así que no se subirá a Git.

---

## Paso 5: Probar la Funcionalidad

1. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. **Ve a http://localhost:3000/foro/crear-hilo**

3. **Inicia sesión si es necesario**

4. **Haz clic en "Analizar Estadísticas de Arma"**

5. **Sube la imagen de estadísticas**

6. **Espera a que se analice** (5-10 segundos)

---

## 🐛 Solución de Problemas

### Error: "No autorizado"
- Asegúrate de estar autenticado
- Verifica que tu sesión sea válida

### Error: "Error al subir la imagen"
- Verifica que el bucket `weapon-analysis-temp` exista
- Comprueba que el archivo sea menor a 5MB
- Asegúrate de que sea JPEG, PNG o WebP

### Error: "Error analizando la imagen"
- Revisa los logs de la Edge Function en Supabase
- Verifica que GEMINI_API_KEY esté configurada correctamente
- Comprueba que la API de Gemini esté disponible

### La Edge Function no responde
1. Ve a Supabase Dashboard > Edge Functions
2. Haz clic en `analyze-weapon-stats`
3. Revisa la pestaña "Logs"
4. Busca mensajes de error

### Error: "No se pudieron extraer las estadísticas"
- La IA no reconoció la imagen
- Intenta con una imagen más clara
- Asegúrate de que sea una captura de estadísticas de arma

---

## 📋 Checklist de Configuración

- [ ] Variables de entorno en Supabase configuradas
- [ ] Variables de entorno locales en `.env.local`
- [ ] Edge Function `analyze-weapon-stats` en estado ACTIVE
- [ ] Storage bucket `weapon-analysis-temp` existe
- [ ] Servidor de desarrollo iniciado
- [ ] Puedes acceder a `/foro/crear-hilo`
- [ ] El botón "Analizar Estadísticas de Arma" es visible
- [ ] Puedes subir una imagen sin errores

---

## 🔍 Verificar Logs

Para ver qué está pasando:

1. **Abre la consola del navegador** (F12)
2. **Ve a la pestaña "Console"**
3. **Intenta analizar una imagen**
4. **Busca mensajes de error o logs**

También puedes revisar los logs del servidor:
- Abre la terminal donde ejecutas `npm run dev`
- Busca mensajes que comiencen con "Invocando Edge Function"

---

## ✅ Cuando Todo Funciona

Deberías ver:
1. Un modal con la opción de cargar imagen
2. Drag & drop o selector de archivo
3. Vista previa de la imagen
4. Botón "Analizar Estadísticas"
5. Indicador de carga mientras se analiza
6. Tarjeta con las estadísticas extraídas
7. Opción de editar valores
8. Botón "Usar Estadísticas" para insertar en el hilo

---

**¿Necesitas ayuda?** Revisa los logs en Supabase o la consola del navegador para más detalles.
