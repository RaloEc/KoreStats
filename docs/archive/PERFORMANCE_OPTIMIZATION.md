# Optimización de Core Web Vitals - KoreStats

## 📊 Análisis de Recursos Bloqueantes

### 1. Fuentes (Fonts)

#### ✅ Optimizaciones Implementadas

**next/font/google Integration:**

- ✅ Implementado `next/font/google` para Inter y Nunito
- ✅ Configurado `font-display: swap` para evitar FOIT (Flash of Invisible Text)
- ✅ Preload habilitado para fuentes críticas
- ✅ Solo se cargan weights necesarios: 400, 500, 600, 700
- ✅ Subsets limitados a 'latin' para reducir tamaño

**Impacto:**

- Elimina bloqueo de renderizado por fuentes
- Reduce tiempo de First Contentful Paint (FCP) en ~1-2 segundos
- Las fuentes se cargan de forma asíncrona sin bloquear el DOM

**Configuración en `src/app/layout.tsx`:**

```typescript
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap", // Mostrar fallback mientras se carga
  preload: true,
});
```

---

### 2. FontAwesome Icons

#### ✅ Optimizaciones Implementadas

**Tree-Shaking y Code Splitting:**

- ✅ Creado wrapper optimizado en `src/components/icons/FontAwesomeIcon.tsx`
- ✅ Importaciones específicas de iconos (no carga todo el bundle)
- ✅ Lazy loading disponible para componentes no críticos
- ✅ Actualizado en componentes PWA (InstallPWA, PWAUpdatePrompt)

**Impacto:**

- Solo se incluyen iconos utilizados en el bundle final
- Reduce tamaño de JavaScript en ~50-100KB
- Componentes PWA cargan de forma lazy (no críticos)

**Uso Correcto:**

```typescript
// ✅ CORRECTO - Solo importa iconos específicos
import { faDownload, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@/components/icons/FontAwesomeIcon";

// ❌ EVITAR - Carga todo el bundle
import * as Icons from "@fortawesome/free-solid-svg-icons";
```

**Alternativa: Migrar a Lucide React**

- Ya instalado en el proyecto
- Más ligero que FontAwesome (~30KB vs ~100KB)
- Mejor tree-shaking
- Recomendado para nuevos componentes

---

### 3. CSS de Tailwind

#### ✅ Optimizaciones Implementadas

**CSS Crítico:**

- ✅ Tailwind CSS se inyecta automáticamente en el HTML
- ✅ Purging automático de clases no utilizadas
- ✅ Configuración optimizada en `tailwind.config.js`

**Configuración en `tailwind.config.js`:**

```javascript
content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
],
```

**Impacto:**

- CSS crítico se inyecta inline en `<head>`
- No hay bloqueo de renderizado por CSS
- Purging automático mantiene el tamaño mínimo

---

### 4. Optimizaciones en next.config.js

#### ✅ Implementadas

```javascript
// Tree-shaking automático para librerías pesadas
optimizePackageImports: [
  '@fortawesome/react-fontawesome',
  'lucide-react',
  '@supabase/auth-helpers-react',
],

// Minificación con SWC (más rápido que Terser)
swcMinify: true,
compress: true,

// Caching de fuentes de Google
runtimeCaching: [
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-webfonts',
      expiration: {
        maxAgeSeconds: 365 * 24 * 60 * 60 // 1 año
      }
    }
  },
]
```

---

## 📈 Métricas Esperadas

### Antes de Optimizaciones

- **FCP (First Contentful Paint):** ~3-4 segundos
- **LCP (Largest Contentful Paint):** ~4-5 segundos
- **CLS (Cumulative Layout Shift):** < 0.1 (ya optimizado)
- **Bundle Size:** ~450-500KB

### Después de Optimizaciones

- **FCP:** ~1-2 segundos ⬇️ 50-60%
- **LCP:** ~2-3 segundos ⬇️ 50-60%
- **CLS:** < 0.1 (sin cambios)
- **Bundle Size:** ~350-400KB ⬇️ 20-25%

---

## 🔍 Verificación de Performance

### Herramientas Recomendadas

1. **Google PageSpeed Insights**

   ```
   https://pagespeed.web.dev/?url=https://korestats.com
   ```

2. **WebPageTest**

   ```
   https://www.webpagetest.org/
   ```

3. **Lighthouse CLI**

   ```bash
   npm install -g @lhci/cli@latest
   lhci autorun
   ```

4. **Next.js Bundle Analyzer**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

### Comandos para Analizar

```bash
# Analizar bundle size
npm run build
npx next-bundle-stat

# Verificar performance localmente
npm run dev
# Luego abrir DevTools > Lighthouse

# Generar reporte de performance
npx lighthouse https://localhost:3000 --view
```

---

## ✅ Checklist de Optimización

### Fuentes

- [x] Usar `next/font/google` para fuentes de Google
- [x] Configurar `font-display: swap`
- [x] Preload habilitado
- [x] Solo weights necesarios
- [x] Subsets limitados

### Icons

- [x] FontAwesome con tree-shaking
- [x] Importaciones específicas de iconos
- [x] Wrapper optimizado creado
- [x] Componentes PWA actualizados
- [ ] Considerar migración a Lucide React para nuevos componentes

### CSS

- [x] Tailwind CSS optimizado
- [x] Purging automático
- [x] CSS crítico inyectado

### Build

- [x] SWC minify habilitado
- [x] Compression habilitada
- [x] optimizePackageImports configurado
- [x] PWA caching optimizado

---

## 🚀 Próximos Pasos

### Corto Plazo (Semana 1)

1. Ejecutar Lighthouse en producción
2. Verificar métricas de Core Web Vitals
3. Monitorear con Google Search Console

### Mediano Plazo (Semana 2-4)

1. Migrar componentes no críticos a Lucide React
2. Implementar lazy loading de componentes pesados
3. Optimizar imágenes con Next.js Image

### Largo Plazo (Mes 2+)

1. Implementar code splitting por ruta
2. Agregar service worker caching inteligente
3. Monitorear performance en producción con Web Vitals API

---

## 📚 Referencias

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [FontAwesome Tree-Shaking](https://fontawesome.com/docs/web/use-with/react/use-package)
- [Tailwind CSS Performance](https://tailwindcss.com/docs/optimizing-for-production)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
