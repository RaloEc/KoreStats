# 🎯 Análisis de Estadísticas de Armas con IA

## Descripción

Sistema completo que permite a los usuarios subir capturas de pantalla de estadísticas de armas de videojuegos y extraer automáticamente los datos usando Google Gemini 1.5 Flash AI.

## ✨ Características

- **Análisis automático** de imágenes usando IA
- **Extracción de 11 estadísticas** diferentes de armas
- **Integración perfecta** con el formulario de creación de hilos
- **Edición manual** de los datos extraídos
- **Interfaz responsive** que respeta el tema del usuario
- **Soporte para modo claro y oscuro**
- **Validación de archivos** (tipos y tamaños)
- **Almacenamiento temporal seguro** en Supabase

## 🎮 Estadísticas Extraídas

1. **Daño** - Poder de ataque del arma
2. **Alcance** - Distancia efectiva (metros)
3. **Control** - Facilidad de manejo del retroceso
4. **Manejo** - Velocidad de apuntado y movimiento
5. **Estabilidad** - Consistencia del disparo
6. **Precisión** - Exactitud del disparo
7. **Perforación de blindaje** - Capacidad anti-blindaje
8. **Cadencia de disparo** - Disparos por minuto
9. **Capacidad** - Munición del cargador
10. **Velocidad de boca** - Velocidad del proyectil (m/s)
11. **Sonido de disparo** - Alcance del ruido (metros)

## 🚀 Cómo Usar

### Para Usuarios

1. Ve a **Crear Hilo** en el foro
2. Haz clic en **"Analizar Estadísticas de Arma"**
3. Arrastra o selecciona una imagen de estadísticas
4. Espera el análisis automático (5-10 segundos)
5. Revisa y edita los datos si es necesario
6. Haz clic en **"Usar Estadísticas"**
7. Los datos se insertan automáticamente en tu hilo

### Formatos Soportados

- **JPEG/JPG** - Recomendado para capturas
- **PNG** - Ideal para imágenes nítidas
- **WebP** - Formato moderno optimizado
- **Tamaño máximo:** 5MB

## 🛠️ Arquitectura Técnica

### Frontend
- **React Components** con TypeScript
- **TailwindCSS** para estilos responsivos
- **Radix UI** para componentes accesibles
- **React Hook Form** para validación
- **Sonner** para notificaciones

### Backend
- **Next.js API Routes** para manejo de archivos
- **Supabase Storage** para almacenamiento temporal
- **Supabase Edge Functions** para procesamiento IA
- **Google Gemini 1.5 Flash** para análisis de imágenes

### Seguridad
- **Autenticación requerida** para usar la función
- **Validación de archivos** en frontend y backend
- **Rate limiting** para prevenir abuso
- **Almacenamiento temporal** (1 hora de expiración)
- **Políticas RLS** en Supabase

## 📁 Archivos Creados

### Componentes Frontend
```
src/components/
├── ui/ImageDropzone.tsx          # Componente de carga de imágenes
├── weapon/
│   ├── WeaponStatsCard.tsx       # Tarjeta de estadísticas
│   └── WeaponStatsUploader.tsx   # Componente principal
```

### Backend
```
src/
├── app/api/analyze-weapon/route.ts  # API Route principal
├── hooks/useWeaponAnalyzer.ts       # Hook para análisis
```

### Supabase
```
supabase/
├── functions/analyze-weapon-stats/  # Edge Function
└── migrations/                      # Configuración de Storage
```

## 🔧 Configuración

### Variables de Entorno Requeridas

```bash
# Google Gemini AI
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_PROJECT_ID=tu_project_id_aqui
```

### Configuración en Supabase

1. **Storage Bucket:** `weapon-analysis-temp`
2. **Edge Function:** `analyze-weapon-stats`
3. **Políticas RLS:** Configuradas para usuarios autenticados

## 🎨 Personalización

El sistema respeta completamente el tema personalizado del usuario:

- **Colores de acento** usando `var(--user-color)`
- **Modo claro/oscuro** automático
- **Estilos consistentes** con el resto de la aplicación
- **Iconos temáticos** para cada estadística

## 🔄 Flujo de Datos

1. **Usuario sube imagen** → Frontend valida archivo
2. **Archivo se envía** → API Route de Next.js
3. **Imagen se almacena** → Supabase Storage temporal
4. **Se llama Edge Function** → Análisis con Gemini AI
5. **Datos se extraen** → JSON estructurado
6. **Imagen se elimina** → Limpieza automática
7. **Datos se muestran** → Interfaz de usuario
8. **Usuario confirma** → Inserción en editor

## 🚨 Manejo de Errores

- **Archivos inválidos** - Validación con mensajes claros
- **Errores de IA** - Retry automático y manual
- **Fallos de red** - Mensajes informativos
- **Timeouts** - Indicadores de progreso
- **Datos incorrectos** - Edición manual disponible

## 📊 Monitoreo

- **Logs en Edge Function** para debugging
- **Métricas de uso** en Supabase Dashboard
- **Errores capturados** con contexto completo
- **Performance tracking** de análisis

## 🔮 Futuras Mejoras

- **Soporte para múltiples armas** en una imagen
- **Reconocimiento de nombres** de armas mejorado
- **Comparación de estadísticas** entre armas
- **Plantillas predefinidas** por juego
- **Análisis por lotes** de múltiples imágenes

---

**¡La funcionalidad está lista para usar!** 🎉

Recuerda configurar las variables de entorno antes de probar la función.
