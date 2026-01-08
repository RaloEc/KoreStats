# 🚀 Guía Rápida - Optimizaciones de Core Web Vitals

## Paso 1: Instalar Dependencias

```bash
npm install
```

Esto instalará `web-vitals` necesario para el monitoreo de performance.

---

## Paso 2: Validar Build

```bash
npm run build
```

Verifica que no haya errores de compilación.

---

## Paso 3: Probar en Desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000` y verifica en la consola del navegador:

```
📊 CLS (Cumulative Layout Shift): { value: 0.0012, rating: 'good' }
🎨 FCP (First Contentful Paint): { value: '1234.56ms', rating: 'good' }
📏 LCP (Largest Contentful Paint): { value: '2345.67ms', rating: 'good' }
```

---

## Paso 4: Ejecutar Lighthouse

### Opción A: Chrome DevTools (Más fácil)

1. Abre Chrome DevTools (F12)
2. Ve a la pestaña "Lighthouse"
3. Haz clic en "Analyze page load"
4. Espera a que termine el análisis

### Opción B: Lighthouse CLI

```bash
npm install -g @lhci/cli@latest
lhci autorun
```

---

## Paso 5: Verificar en PageSpeed Insights

```
https://pagespeed.web.dev/?url=https://korestats.com
```

Espera a que se despliegue a producción y luego verifica las métricas.

---

## 📊 Métricas Esperadas

Después de las optimizaciones, deberías ver:

| Métrica                    | Esperado | Antes |
| -------------------------- | -------- | ----- |
| **FCP**                    | 1-2s     | 3-4s  |
| **LCP**                    | 2-3s     | 4-5s  |
| **CLS**                    | < 0.1    | < 0.1 |
| **Lighthouse Performance** | 75-85    | 45-55 |

---

## 🔍 Qué Cambió

### 1. Fuentes Optimizadas

- ✅ `next/font/google` con `font-display: swap`
- ✅ Preload habilitado
- ✅ Solo weights necesarios

### 2. FontAwesome Optimizado

- ✅ Tree-shaking automático
- ✅ Wrapper en `src/components/icons/FontAwesomeIcon.tsx`
- ✅ Componentes PWA actualizados

### 3. CSS Crítico

- ✅ Nuevo archivo `src/styles/critical.css`
- ✅ Inyectado inline en `<head>`
- ✅ Prevención de FOUC

### 4. Build Optimizado

- ✅ SWC minify habilitado
- ✅ Compression habilitada
- ✅ optimizePackageImports configurado

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'web-vitals'"

```bash
npm install
npm run build
```

### Las métricas no aparecen en consola

- Asegúrate de estar en modo desarrollo: `npm run dev`
- Abre DevTools > Console
- Recarga la página (F5)

### Lighthouse muestra puntuación baja

- Ejecuta `npm run build` primero
- Prueba con `npm run start` (producción)
- Desactiva extensiones de Chrome
- Usa modo incógnito

---

## 📚 Documentación Completa

Para más detalles, ver:

- `PERFORMANCE_OPTIMIZATION.md` - Guía técnica completa
- `CORE_WEB_VITALS_SUMMARY.md` - Resumen ejecutivo

---

## ✅ Checklist

- [ ] Ejecuté `npm install`
- [ ] Ejecuté `npm run build` sin errores
- [ ] Probé en desarrollo con `npm run dev`
- [ ] Verifiqué métricas en consola
- [ ] Ejecuté Lighthouse localmente
- [ ] Desplegué a producción
- [ ] Verifiqué en PageSpeed Insights

---

## 🎯 Resultado Final

Después de seguir estos pasos, deberías ver:

✅ **FCP 50-60% más rápido**
✅ **LCP 50-60% más rápido**
✅ **Bundle 20-25% más pequeño**
✅ **Lighthouse +30-40 puntos**

¡Listo para optimizar! 🚀
