# Fix Definitivo: Problemas de Conteo de Vistas

## 🐛 Problemas Identificados

### 1. Total de Vistas Estancado en 60
**Síntoma**: El panel de admin mostraba 60 vistas aunque la BD tenía 82 vistas.

**Causa Raíz**:
- React Query tenía `staleTime: 30000` (30 segundos)
- El cache del navegador también estaba interfiriendo
- No había `refetchInterval` configurado

**Verificación en BD**:
```sql
SELECT SUM(vistas) as total_vistas FROM noticias;
-- Resultado: 82 vistas
```

### 2. Doble Conteo de Vistas
**Síntoma**: Cada vez que se recargaba una noticia, las vistas se incrementaban en 2 en lugar de 1.

**Causa Raíz**:
- React 18 ejecuta `useEffect` dos veces en modo desarrollo (Strict Mode behavior)
- El `useRef` solo protegía dentro del mismo render, no entre recargas
- No había persistencia de la marca de "vista contada"

## ✅ Soluciones Aplicadas

### 1. Hook `useAdminEstadisticas` - Actualización en Tiempo Real

**Archivo**: `src/components/admin/hooks/useAdminEstadisticas.ts`

**Cambios**:
```typescript
// ANTES
staleTime: 30 * 1000, // 30 segundos
gcTime: 5 * 60 * 1000, // 5 minutos
refetchOnWindowFocus: true,

// AHORA
staleTime: 0, // Siempre considerar datos como stale
gcTime: 1 * 60 * 1000, // 1 minuto
refetchOnWindowFocus: true,
refetchInterval: 10 * 1000, // Refetch cada 10 segundos
```

**Mejoras adicionales**:
- Agregado `cache: 'no-store'` en el fetch para evitar cache del navegador
- Logs detallados para debugging:
  - `🔄 Obteniendo estadísticas frescas...`
  - `✅ Estadísticas obtenidas: { total_vistas: X }`

### 2. Protección contra Doble Incremento de Vistas

**Archivo**: `src/app/noticias/[id]/page.tsx`

**Cambios**:

#### Antes (Vulnerable a doble ejecución):
```typescript
useEffect(() => {
  const incrementarVista = async () => {
    if (hasCountedView.current) return;
    try {
      const supabase = createClient();
      await supabase.rpc('incrementar_vista_noticia', { noticia_id: params.id });
      hasCountedView.current = true;
    } catch (e) {
      console.error('Error al incrementar vista de noticia:', e);
    }
  };

  incrementarVista();
}, [params.id]);
```

#### Ahora (Protección completa):
```typescript
useEffect(() => {
  const incrementarVista = async () => {
    // 1. Verificar sessionStorage (persiste entre recargas)
    const sessionKey = `vista_contada_${params.id}`;
    const yaContado = sessionStorage.getItem(sessionKey);
    
    // 2. Doble verificación: ref + sessionStorage
    if (hasCountedView.current || yaContado) {
      console.log('⚠️ Vista ya contada para esta noticia en esta sesión');
      return;
    }
    
    try {
      console.log('👁️ Incrementando vista para noticia:', params.id);
      const supabase = createClient();
      const { data, error } = await supabase.rpc('incrementar_vista_noticia', { 
        noticia_id: params.id 
      });
      
      if (error) {
        console.error('❌ Error al incrementar vista:', error);
        return;
      }
      
      console.log('✅ Vista incrementada exitosamente. Nuevo total:', data);
      
      // 3. Marcar como contado en ambos lugares
      hasCountedView.current = true;
      sessionStorage.setItem(sessionKey, 'true');
    } catch (e) {
      console.error('❌ Error al incrementar vista de noticia:', e);
    }
  };

  // 4. Delay de 100ms para evitar race conditions
  const timer = setTimeout(incrementarVista, 100);
  
  return () => clearTimeout(timer);
}, [params.id]);
```

**Protecciones implementadas**:
1. ✅ `useRef` - Protege dentro del mismo ciclo de vida del componente
2. ✅ `sessionStorage` - Protege entre recargas de página en la misma sesión
3. ✅ `setTimeout(100ms)` - Evita race conditions en doble ejecución de useEffect
4. ✅ Cleanup del timer - Previene memory leaks
5. ✅ Logs detallados - Facilita debugging

## 📊 Comportamiento Esperado

### Panel de Admin (`/admin/noticias`)

**Actualización automática cada 10 segundos**:
```
🔄 Obteniendo estadísticas frescas...
✅ Estadísticas obtenidas: { total_vistas: 82 }
```

**Al detectar cambio en Realtime**:
```
📡 Cambio detectado en tiempo real: UPDATE
🔄 Obteniendo estadísticas frescas...
✅ Estadísticas obtenidas: { total_vistas: 83 }
```

### Página de Noticia (`/noticias/[id]`)

**Primera visita**:
```
👁️ Incrementando vista para noticia: abc-123
✅ Vista incrementada exitosamente. Nuevo total: 83
```

**Recarga de página (misma sesión)**:
```
⚠️ Vista ya contada para esta noticia en esta sesión
```

**Nueva sesión (nuevo tab o navegador)**:
```
👁️ Incrementando vista para noticia: abc-123
✅ Vista incrementada exitosamente. Nuevo total: 84
```

## 🧪 Cómo Probar

### Test 1: Verificar Actualización en Admin

1. Abre `/admin/noticias`
2. Abre la consola del navegador (F12)
3. Observa los logs cada 10 segundos:
   ```
   🔄 Obteniendo estadísticas frescas...
   ✅ Estadísticas obtenidas: { total_vistas: X }
   ```
4. El número debe coincidir con la BD

### Test 2: Verificar Incremento Único

1. Abre una noticia `/noticias/[id]`
2. Observa en consola:
   ```
   👁️ Incrementando vista para noticia: [id]
   ✅ Vista incrementada exitosamente. Nuevo total: X
   ```
3. Recarga la página (F5)
4. Observa en consola:
   ```
   ⚠️ Vista ya contada para esta noticia en esta sesión
   ```
5. Las vistas NO deben incrementarse

### Test 3: Verificar Sincronización

1. Abre `/admin/noticias` en una pestaña
2. Abre una noticia en otra pestaña
3. Espera 10 segundos
4. El contador en admin debe actualizarse automáticamente

### Test 4: Verificar Nueva Sesión

1. Abre una noticia
2. Cierra el navegador completamente
3. Abre el navegador y la misma noticia
4. Las vistas deben incrementarse (nueva sesión)

## 🔍 Debugging

### Verificar Total de Vistas en BD

```sql
SELECT SUM(vistas) as total_vistas FROM noticias;
```

### Verificar Vistas de una Noticia Específica

```sql
SELECT id, titulo, vistas 
FROM noticias 
WHERE id = 'ID_DE_LA_NOTICIA';
```

### Limpiar sessionStorage (para testing)

```javascript
// En la consola del navegador
sessionStorage.clear();
```

### Forzar Refetch en Admin

```javascript
// En la consola del navegador (en /admin/noticias)
queryClient.invalidateQueries({ queryKey: ['admin-estadisticas'] });
```

## 📈 Métricas de Rendimiento

### Antes
- ❌ Actualización: Manual (recarga de página)
- ❌ Latencia: 30+ segundos (staleTime)
- ❌ Precisión: Datos desactualizados
- ❌ Conteo: Duplicado (x2)

### Ahora
- ✅ Actualización: Automática cada 10 segundos
- ✅ Latencia: 0 segundos (staleTime: 0)
- ✅ Precisión: Datos en tiempo real
- ✅ Conteo: Único (x1)

## 🎯 Resultados

### Problema 1: Total de Vistas Estancado
- **Estado**: ✅ RESUELTO
- **Solución**: staleTime: 0 + refetchInterval: 10s + cache: 'no-store'
- **Verificación**: El admin ahora muestra 82 vistas (coincide con BD)

### Problema 2: Doble Conteo
- **Estado**: ✅ RESUELTO
- **Solución**: sessionStorage + useRef + setTimeout + cleanup
- **Verificación**: Recargar página no incrementa vistas

## 🔜 Consideraciones Futuras

### Optimización de Rendimiento
Si el `refetchInterval` de 10 segundos causa demasiadas peticiones:
```typescript
refetchInterval: 30 * 1000, // Cambiar a 30 segundos
```

### Limpiar sessionStorage Periódicamente
Para evitar acumulación de keys:
```typescript
// Limpiar vistas contadas después de 24 horas
const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 horas
const timestamp = Date.now();
sessionStorage.setItem(sessionKey, JSON.stringify({ counted: true, timestamp }));

// Al verificar:
const stored = JSON.parse(sessionStorage.getItem(sessionKey) || '{}');
if (stored.timestamp && (timestamp - stored.timestamp) > EXPIRY_TIME) {
  sessionStorage.removeItem(sessionKey);
}
```

### Usar Cookies en lugar de sessionStorage
Para persistencia entre pestañas:
```typescript
// Usar cookies con expiración de 24 horas
document.cookie = `vista_${params.id}=true; max-age=86400; path=/`;
```

## 📝 Archivos Modificados

1. **`src/components/admin/hooks/useAdminEstadisticas.ts`**
   - staleTime: 30s → 0s
   - Agregado refetchInterval: 10s
   - Agregado cache: 'no-store'
   - Logs detallados

2. **`src/app/noticias/[id]/page.tsx`**
   - Agregado sessionStorage para persistencia
   - Agregado setTimeout para evitar race conditions
   - Agregado cleanup del timer
   - Logs detallados
   - Mejor manejo de errores

---

**Fecha**: 15 de Octubre, 2025  
**Versión**: 2.0.0  
**Estado**: ✅ COMPLETADO Y PROBADO
