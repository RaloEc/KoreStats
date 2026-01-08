# 🛡️ Sistema de Moderación del Foro - Guía Rápida

## 📦 Instalación

### Opción 1: Script Automático (Recomendado)
```bash
.\instalar_sistema_moderacion.bat
```

### Opción 2: Manual

1. **Aplicar migraciones de base de datos:**
   ```bash
   supabase db push
   ```

2. **Verificar dependencias:**
   ```bash
   npm install @tanstack/react-query
   ```

3. **Reiniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## 🚀 Acceso Rápido

### Panel de Administración
- **URL:** `/admin/foro`
- **Requiere:** Rol de administrador
- **Pestañas disponibles:**
  - Dashboard
  - **Moderación** ← Sistema nuevo
  - Categorías
  - Estadísticas
  - Configuración

### Pestaña de Moderación

#### 📊 Estadísticas
Vista general con métricas clave:
- Reportes totales y pendientes
- Usuarios sancionados
- Tiempo promedio de resolución
- Usuarios en lista de vigilancia

#### 📋 Reportes
Gestión completa de reportes:
- Filtros por estado y tipo
- Selección múltiple para acciones masivas
- Resolver/Desestimar reportes
- Vista previa del contenido

#### 👥 Gestión de Usuarios
Herramientas de moderación de usuarios:
- Búsqueda por ID de usuario
- Historial completo de moderación
- Aplicar sanciones (advertencia, suspensión, baneo)
- Ver sanciones activas

## 🔧 Funcionalidades Principales

### 1. Sistema de Reportes

**Para Usuarios:**
```tsx
import BotonReportar from '@/components/foro/BotonReportar';

<BotonReportar 
  tipo_contenido="hilo"
  contenido_id={hiloId}
  variant="ghost"
  size="sm"
/>
```

**Para Moderadores:**
- Ver todos los reportes
- Filtrar por estado y tipo
- Resolver o desestimar
- Procesamiento masivo

### 2. Sistema de Sanciones

**Tipos de sanciones:**
- ⚠️ **Advertencia** (5 puntos)
- ⏸️ **Suspensión Temporal** (10 puntos, configurable en días)
- 🚫 **Suspensión Permanente** (20 puntos)
- ⛔ **Baneo** (definitivo)

**Sistema de puntos:**
- Los puntos son acumulativos
- Umbrales automáticos:
  - 15 puntos → Suspensión automática
  - 30 puntos → Baneo automático

### 3. Historial de Moderación

Cada usuario tiene un historial completo que incluye:
- Todas las acciones de moderación
- Moderador que aplicó la acción
- Fecha y hora
- Razón detallada
- Puntos acumulados

### 4. Notificaciones

Los usuarios reciben notificaciones cuando:
- Se les aplica una sanción
- Se resuelve un reporte que hicieron
- Se toma acción sobre su contenido

## 📊 API Usage

### Crear un Reporte
```typescript
const response = await fetch('/api/admin/foro/reportes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tipo_contenido: 'hilo',
    contenido_id: 'uuid-del-hilo',
    razon: 'spam',
    descripcion: 'Descripción opcional'
  })
});
```

### Aplicar Sanción
```typescript
const response = await fetch('/api/admin/foro/sanciones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    usuario_id: 'uuid-del-usuario',
    tipo_sancion: 'advertencia',
    razon: 'Violación de normas',
    puntos: 5,
    notificar: true
  })
});
```

### Obtener Estadísticas
```typescript
const response = await fetch('/api/admin/foro/estadisticas-moderacion');
const { estadisticas } = await response.json();
```

## 🔐 Seguridad

### Políticas RLS Implementadas

✅ **Reportes:**
- Usuarios pueden crear y ver sus propios reportes
- Administradores tienen acceso completo

✅ **Sanciones:**
- Usuarios pueden ver sus propias sanciones
- Solo administradores pueden aplicar sanciones

✅ **Acciones de Moderación:**
- Solo administradores pueden ver y crear acciones
- Todas las acciones quedan registradas

✅ **Configuración:**
- Solo administradores pueden modificar configuración

## 📈 Métricas y Estadísticas

### Dashboard de Moderación
- **Reportes Totales:** Últimos 30 días
- **Reportes Pendientes:** Requieren atención inmediata
- **Reportes Resueltos:** Últimos 30 días
- **Usuarios Sancionados:** Últimos 30 días
- **Lista de Vigilancia:** Usuarios problemáticos activos
- **Tiempo Promedio:** Resolución de reportes en horas

### Acciones por Tipo
Desglose de todas las acciones de moderación:
- Eliminación de contenido
- Advertencias
- Suspensiones
- Baneos
- Otras acciones

## 🛠️ Configuración

### Valores por Defecto (Modificables en BD)

```sql
-- Puntos por tipo de sanción
puntos_advertencia: 5
puntos_suspension_temporal: 10
puntos_suspension_permanente: 20

-- Umbrales automáticos
umbral_suspension_automatica: 15
umbral_baneo_automatico: 30

-- Configuración general
dias_suspension_temporal: 7
moderacion_automatica_activa: true
```

### Modificar Configuración
```sql
UPDATE foro_config_moderacion 
SET valor = '10' 
WHERE clave = 'puntos_advertencia';
```

## 🔄 Mantenimiento

### Desactivar Sanciones Expiradas
Ejecutar periódicamente (recomendado: cada hora):
```sql
SELECT desactivar_sanciones_expiradas();
```

### Limpiar Reportes Antiguos
```sql
DELETE FROM foro_reportes 
WHERE estado IN ('resuelto', 'desestimado') 
AND resuelto_en < NOW() - INTERVAL '90 days';
```

## 📝 Flujo de Trabajo Recomendado

### Para Moderadores

1. **Revisión Diaria:**
   - Revisar reportes pendientes
   - Priorizar reportes críticos y de alta prioridad
   - Resolver reportes simples

2. **Gestión de Usuarios:**
   - Revisar usuarios en lista de vigilancia
   - Verificar historial antes de aplicar sanciones
   - Documentar bien las razones de cada acción

3. **Acciones Masivas:**
   - Usar procesamiento masivo para reportes similares
   - Aplicar plantillas de mensajes cuando sea apropiado

### Para Administradores

1. **Monitoreo:**
   - Revisar estadísticas semanalmente
   - Ajustar umbrales según necesidad
   - Analizar tendencias de reportes

2. **Configuración:**
   - Actualizar términos prohibidos
   - Gestionar plantillas de mensajes
   - Ajustar puntos y umbrales

## 🐛 Solución de Problemas

### Los reportes no aparecen
- Verificar que las migraciones se aplicaron correctamente
- Verificar políticas RLS en Supabase
- Comprobar que el usuario tiene rol de admin

### Las sanciones no se aplican
- Verificar que la función `aplicar_sancion_usuario` existe
- Revisar logs de Supabase para errores
- Verificar que el usuario existe en la tabla `perfiles`

### Estadísticas no se actualizan
- Verificar que la función `obtener_estadisticas_moderacion` existe
- Comprobar que hay datos en las tablas
- Revisar el rango de fechas

## 📚 Documentación Adicional

- **Documentación Completa:** `docs/SISTEMA_MODERACION_FORO.md`
- **Esquema de BD:** Ver migraciones en `supabase/migrations/`
- **Componentes UI:** Ver código en `src/components/admin/foro/moderacion/`

## 🤝 Soporte

Si encuentras problemas:
1. Revisa la documentación completa
2. Verifica los logs de Supabase
3. Comprueba que todas las migraciones se aplicaron
4. Revisa las políticas RLS

## ✨ Características Destacadas

- ✅ Sistema completo de reportes
- ✅ Gestión avanzada de sanciones
- ✅ Sistema de puntos acumulativo
- ✅ Historial completo de moderación
- ✅ Estadísticas en tiempo real
- ✅ Procesamiento masivo de reportes
- ✅ Notificaciones a usuarios
- ✅ Políticas RLS robustas
- ✅ Auditoría completa de acciones
- ✅ UI intuitiva y responsive

---

**¡El sistema está listo para usar!** 🎉

Accede a `/admin/foro` y comienza a moderar la comunidad.
