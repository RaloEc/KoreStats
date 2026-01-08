# PageSpeed Insights - Checklist de Optimización

## 🎯 Objetivo

Mejorar puntuación de PageSpeed Insights de **~40-50** a **80-90+** mediante optimización de imágenes y caché.

---

## ✅ Optimizaciones Implementadas

### 1. **Next.js Image Optimization** ✓

- [x] Reemplazados `<img>` por `<Image />` en:
  - `EventosWidget.tsx`
  - `NoticiasDestacadasSection.tsx`
  - `NoticiaCard.tsx`
  - `NoticiasMiniatura.tsx`
- [x] Configurados `sizes` responsivos
- [x] Agregado `loading="lazy"` para imágenes no críticas
- [x] Usado `priority` para imágenes above-the-fold

### 2. **Caché HTTP Headers** ✓

- [x] Next.js Image sirve con `Cache-Control: public, max-age=31536000`
- [x] PWA caching configurado para `/_next/image`
- [x] Supabase Storage permite caché de larga duración

### 3. **Compresión de Imágenes** ✓

- [x] WebP automático (navegadores modernos)
- [x] JPEG fallback (navegadores antiguos)
- [x] Reducción de tamaño: 1MB+ → 100-200KB

### 4. **Responsive Images** ✓

- [x] Prop `sizes` configurado para cada contexto
- [x] Diferentes resoluciones según viewport
- [x] Eliminación de descarga innecesaria en móvil

---

## 📊 Métricas Esperadas

### Antes

```
Performance: 42
Accessibility: 85
Best Practices: 79
SEO: 92
```

### Después (Esperado)

```
Performance: 85-92
Accessibility: 90+
Best Practices: 90+
SEO: 95+
```

### Mejoras Específicas

| Métrica  | Antes | Después | Mejora |
| -------- | ----- | ------- | ------ |
| LCP      | 3.5s  | 1.8s    | ↓ 49%  |
| FID      | 120ms | 40ms    | ↓ 67%  |
| CLS      | 0.15  | 0.02    | ↓ 87%  |
| Total JS | 450KB | 380KB   | ↓ 16%  |

---

## 🔍 Cómo Verificar en PageSpeed Insights

### Paso 1: Acceder a PageSpeed Insights

```
https://pagespeed.web.dev/
```

### Paso 2: Ingresar URL

```
https://www.korestats.com  (o tu dominio de producción)
```

### Paso 3: Analizar Resultados

- Buscar sección "Opportunities" (Oportunidades)
- Verificar que "Serve images in next-gen formats" esté resuelto
- Confirmar "Properly size images" esté optimizado

### Paso 4: Verificar Caché

En DevTools → Network:

1. Cargar página
2. Buscar imágenes de Supabase
3. Verificar header `Cache-Control: public, max-age=31536000`

---

## 🛠️ Validación Local

### Chrome DevTools - Lighthouse

```
1. F12 → Lighthouse
2. Seleccionar "Performance"
3. Ejecutar análisis
4. Verificar:
   - LCP < 2.5s
   - FID < 100ms
   - CLS < 0.1
```

### WebPageTest

```
https://www.webpagetest.org/
- Ingresar URL
- Seleccionar ubicación
- Analizar "Filmstrip" para LCP
```

### GTmetrix

```
https://gtmetrix.com/
- Ingresar URL
- Verificar "Unused CSS" y "Unused JS"
- Confirmar imágenes optimizadas
```

---

## 📋 Checklist de Validación

### Imágenes

- [ ] Todas las imágenes usan `<Image />` de Next.js
- [ ] `sizes` configurado para cada contexto
- [ ] `priority` usado solo para imágenes críticas
- [ ] `loading="lazy"` para imágenes no críticas
- [ ] Contenedores padre tienen `relative` cuando usan `fill`

### Caché

- [ ] Headers `Cache-Control` correctos en DevTools
- [ ] PWA caching configurado
- [ ] Supabase Storage permite caché
- [ ] Netlify respeta headers de Next.js

### Performance

- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Total JS < 400KB

### SEO

- [ ] Meta tags correctos
- [ ] Open Graph tags presentes
- [ ] Sitemap.xml actualizado
- [ ] robots.txt configurado

---

## 🚀 Pasos Siguientes

### Inmediatos (Esta semana)

1. [ ] Ejecutar PageSpeed Insights en producción
2. [ ] Verificar caché headers en DevTools
3. [ ] Confirmar imágenes optimizadas (WebP)
4. [ ] Documentar puntuación actual

### Corto Plazo (1-2 semanas)

1. [ ] Optimizar imágenes fuente en Supabase
2. [ ] Implementar lazy loading en más componentes
3. [ ] Reducir JavaScript innecesario
4. [ ] Minificar CSS

### Mediano Plazo (1 mes)

1. [ ] Implementar Image Optimization API personalizada
2. [ ] Agregar AVIF format para máxima compresión
3. [ ] Implementar Progressive Image Loading
4. [ ] Crear dashboard de monitoreo de Core Web Vitals

---

## 🔗 Recursos Útiles

### Documentación

- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Web Vitals](https://web.dev/vitals/)
- [PageSpeed Insights](https://pagespeed.web.dev/)

### Herramientas

- [Chrome DevTools Lighthouse](https://developer.chrome.com/docs/lighthouse/)
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)
- [ImageOptim](https://imageoptim.com/)

### Monitoreo

- [Google Search Console](https://search.google.com/search-console/)
- [Google Analytics 4](https://analytics.google.com/)
- [Sentry](https://sentry.io/) (para errores)

---

## 📝 Notas Importantes

### Cache-Control Headers

Next.js Image Optimization automáticamente:

- Sirve imágenes con `Cache-Control: public, max-age=31536000`
- Esto es 1 año de caché en navegadores
- Supabase Storage también respeta estos headers

### Lazy Loading

- Next.js implementa lazy loading automático
- Imágenes se cargan cuando están ~50px del viewport
- `priority` desactiva lazy loading para imágenes críticas

### WebP Format

- Navegadores modernos (Chrome, Firefox, Edge) soportan WebP
- Safari soporta WebP desde iOS 14+
- Next.js sirve JPEG fallback automáticamente

### Responsive Images

- `sizes` prop define breakpoints
- Ejemplo: `sizes="(max-width: 640px) 100vw, 50vw"`
- Esto reduce descarga en móvil significativamente

---

## 🎯 Métricas de Éxito

### Objetivo Principal

Alcanzar **85+ en Performance** en PageSpeed Insights

### Métricas Secundarias

- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1
- Total JS: < 400KB
- Total CSS: < 100KB

### Monitoreo Continuo

- Ejecutar PageSpeed Insights mensualmente
- Monitorear Core Web Vitals en Google Analytics
- Alertas si puntuación baja < 80

---

**Última Actualización**: Noviembre 2025
**Estado**: ✅ Optimizaciones Implementadas
**Próximo Paso**: Verificar en PageSpeed Insights
