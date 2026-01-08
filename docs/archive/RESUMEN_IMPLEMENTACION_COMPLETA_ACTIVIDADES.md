# ✅ Implementación Completa: Sistema de Gestión de Actividades

## Resumen General

Se ha completado la implementación de un sistema integral para que usuarios puedan ocultar/borrar tarjetas de actividad y admins puedan gestionar contenido borrado con auditoría completa.

---

## 1️⃣ Migraciones SQL Creadas

### `20250204000000_add_activity_visibility.sql`

- **Tabla**: `activity_visibility`
- **Propósito**: Registra qué actividades están ocultas por cada usuario
- **Campos**:
  - `id` (UUID PK)
  - `user_id` (FK a auth.users)
  - `activity_type` (TEXT): 'forum_thread', 'forum_post', 'weapon_stats', 'lol_match', 'noticia', 'comentario'
  - `activity_id` (TEXT): ID del recurso
  - `hidden_at` (TIMESTAMP)
  - UNIQUE(user_id, activity_type, activity_id)
- **Índices**: user_id, activity, user_activity
- **RLS**: Usuarios ven/editan solo sus propios registros; admins ven todo

### `20250204000001_add_activity_audit_logs.sql` ✨ NUEVO

- **Tabla**: `activity_audit_logs`
- **Propósito**: Registra todas las acciones de ocultar/borrar para auditoría
- **Campos**:
  - `id` (UUID PK)
  - `user_id` (FK a auth.users) - Quién realizó la acción
  - `action` (TEXT): 'hide', 'unhide', 'admin_delete'
  - `activity_type` (TEXT): Tipo de actividad
  - `activity_id` (TEXT): ID del recurso
  - `target_user_id` (FK a auth.users) - Autor del contenido borrado
  - `reason` (TEXT): Razón opcional
  - `created_at` (TIMESTAMP)
- **Índices**: user_id, action, created_at, activity
- **RLS**: Solo admins pueden ver

### `20250204000002_add_deleted_content_recovery.sql` ✨ NUEVO

- **Tabla**: `deleted_content_snapshots`
- **Propósito**: Almacena snapshots de contenido borrado para recuperación
- **Campos**:
  - `id` (UUID PK)
  - `activity_type` (TEXT)
  - `activity_id` (TEXT)
  - `original_user_id` (FK a auth.users) - Autor original
  - `content_snapshot` (JSONB) - Snapshot completo del contenido
  - `deleted_by_user_id` (FK a auth.users) - Admin que lo borró
  - `deleted_at` (TIMESTAMP)
  - `is_recovered` (BOOLEAN) - Si fue recuperado
  - `recovered_at` (TIMESTAMP)
  - `recovered_by_user_id` (FK a auth.users) - Admin que lo recuperó
- **Índices**: activity, deleted_by, deleted_at, is_recovered
- **RLS**: Solo admins pueden ver

---

## 2️⃣ Backend APIs

### Endpoints de Usuario

#### `POST /api/user-activity/hide`

- **Autenticación**: Requerida
- **Body**: `{ activityType, activityId }`
- **Funcionalidad**:
  - Inserta en `activity_visibility`
  - Registra en `activity_audit_logs` (action: 'hide')
  - Retorna 201 si éxito, 409 si ya oculta

#### `POST /api/user-activity/unhide`

- **Autenticación**: Requerida
- **Body**: `{ activityType, activityId }`
- **Funcionalidad**:
  - Elimina de `activity_visibility`
  - Registra en `activity_audit_logs` (action: 'unhide')
  - Retorna 200 si éxito

#### `POST /api/user-activity/admin-delete`

- **Autenticación**: Admin requerido
- **Body**: `{ activityType, activityId }`
- **Funcionalidad**:
  - Obtiene snapshot del contenido original
  - Soft delete del recurso (deleted_at = NOW())
  - Registra en `activity_audit_logs` (action: 'admin_delete')
  - Guarda snapshot en `deleted_content_snapshots`
  - Retorna 200 si éxito

### Endpoints de Filtrado

#### `GET /api/perfil/[username]`

- **Cambios**: Filtra actividades ocultas por usuario actual
- **Lógica**:
  - Obtiene `activity_visibility` del usuario autenticado
  - Filtra hilos, posts y partidas ocultas
  - Retorna solo actividades visibles

#### `GET /api/perfil/[username]/actividad`

- **Cambios**: Filtra actividades ocultas por usuario actual
- **Lógica**:
  - Obtiene `activity_visibility` del usuario autenticado
  - Filtra hilos, posts y partidas ocultas
  - Retorna solo actividades visibles

### Endpoints de Admin ✨ NUEVOS

#### `GET /api/admin/deleted-content`

- **Autenticación**: Admin requerido
- **Query params**:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `is_recovered` (true/false)
- **Funcionalidad**:
  - Lista snapshots de contenido borrado
  - Incluye info del autor original y admin que lo borró
  - Retorna paginado con total

#### `POST /api/admin/deleted-content/recover`

- **Autenticación**: Admin requerido
- **Body**: `{ snapshotId }`
- **Funcionalidad**:
  - Restaura contenido (deleted_at = NULL)
  - Marca snapshot como recuperado
  - Registra quién lo recuperó
  - Retorna 200 si éxito

#### `GET /api/admin/audit-logs`

- **Autenticación**: Admin requerido
- **Query params**:
  - `page` (default: 1)
  - `limit` (default: 50)
  - `action` (hide/unhide/admin_delete)
- **Funcionalidad**:
  - Lista logs de auditoría
  - Incluye info del usuario y target
  - Retorna estadísticas de acciones
  - Paginado

---

## 3️⃣ Frontend Components

### Existentes (Actualizados)

#### `ActivityCardMenu.tsx`

- Menú de acciones (⋮) en tarjetas de actividad
- Opciones:
  - "Ocultar" (visible si es tu perfil)
  - "Eliminar (Admin)" (visible si eres admin)
- Confirmación con AlertDialog
- Integrado con `useActivityActions`

#### `FeedActividad.tsx`

- Integrado menú en todas las tarjetas:
  - Hilos (forum_thread)
  - Posts (forum_post)
  - Weapon Stats (weapon_stats)
  - Partidas LoL (lol_match)
- Filtrado local de items ocultos
- Prop `isAdmin` para mostrar opciones de admin

#### `SharedMatchCard.tsx`

- Menú integrado en tarjetas de partidas
- Props: `isAdmin`, `onHide`

#### `UserActivityFeed.tsx`

- Menú integrado en feed personal
- Prop `isAdmin` para opciones de admin

#### `UserActivityFeedContainer.tsx`

- Propagación de prop `isAdmin`

### Hooks

#### `use-activity-actions.ts`

- Métodos:
  - `hideActivity(type, id)` → POST /api/user-activity/hide
  - `unhideActivity(type, id)` → POST /api/user-activity/unhide
  - `deleteActivity(type, id)` → POST /api/user-activity/admin-delete
- Maneja loading, errores, toasts automáticos

---

## 4️⃣ Flujos de Funcionamiento

### Flujo: Ocultar Actividad

```
Usuario hace clic en "⋮" → "Ocultar"
  ↓
Frontend: POST /api/user-activity/hide
  ↓
Backend:
  - Inserta en activity_visibility
  - Registra en activity_audit_logs (action: 'hide')
  ↓
Frontend:
  - Quita tarjeta del array local
  - Muestra toast de éxito
  ↓
Próxima carga:
  - API filtra y no devuelve esa tarjeta
```

### Flujo: Eliminar Actividad (Admin)

```
Admin hace clic en "⋮" → "Eliminar (Admin)"
  ↓
Confirmación: "¿Estás seguro?"
  ↓
Frontend: POST /api/user-activity/admin-delete
  ↓
Backend:
  - Obtiene snapshot del contenido
  - Soft delete del recurso original
  - Registra en activity_audit_logs (action: 'admin_delete')
  - Guarda snapshot en deleted_content_snapshots
  ↓
Frontend:
  - Quita tarjeta del array local
  - Muestra toast de éxito
  ↓
Próxima carga:
  - API filtra y no devuelve esa tarjeta
```

### Flujo: Recuperar Contenido (Admin)

```
Admin en panel de administración
  ↓
GET /api/admin/deleted-content
  ↓
Visualiza lista de contenido borrado
  ↓
Hace clic en "Recuperar"
  ↓
POST /api/admin/deleted-content/recover
  ↓
Backend:
  - Restaura contenido (deleted_at = NULL)
  - Marca snapshot como recuperado
  - Registra quién lo recuperó
  ↓
Frontend:
  - Muestra toast de éxito
  - Refresca lista
```

### Flujo: Ver Auditoría (Admin)

```
Admin en panel de administración
  ↓
GET /api/admin/audit-logs?action=admin_delete
  ↓
Visualiza logs de auditoría con:
  - Quién realizó la acción
  - Qué tipo de contenido
  - Cuándo se realizó
  - Estadísticas por tipo de acción
```

---

## 5️⃣ Tipos de Actividad Soportados

- `forum_thread` - Hilos del foro
- `forum_post` - Respuestas/Posts
- `weapon_stats` - Estadísticas de armas
- `lol_match` - Partidas de League of Legends
- `noticia` - Noticias
- `comentario` - Comentarios

---

## 6️⃣ Permisos y Seguridad

### Ocultar Actividad

- ✅ Solo el autor (en su propio perfil)
- ✅ Visible solo para el usuario que la ocultó
- ✅ RLS: `user_id = auth.uid()`

### Eliminar Actividad (Admin)

- ✅ Solo admins (verificado con `profile.role === 'admin'`)
- ✅ Soft delete (no hard delete)
- ✅ Snapshot guardado para recuperación
- ✅ Registrado en auditoría

### Ver Logs de Auditoría

- ✅ Solo admins
- ✅ RLS: Verifica `profile.role = 'admin'`

### Recuperar Contenido

- ✅ Solo admins
- ✅ Registra quién lo recuperó
- ✅ Marca snapshot como recuperado

---

## 7️⃣ Archivos Creados/Modificados

### ✨ Nuevos

- `supabase/migrations/20250204000001_add_activity_audit_logs.sql`
- `supabase/migrations/20250204000002_add_deleted_content_recovery.sql`
- `src/app/api/admin/deleted-content/route.ts`
- `src/app/api/admin/deleted-content/recover/route.ts`
- `src/app/api/admin/audit-logs/route.ts`

### 🔄 Modificados

- `src/app/api/user-activity/hide/route.ts` - Agregó auditoría
- `src/app/api/user-activity/unhide/route.ts` - Agregó auditoría
- `src/app/api/user-activity/admin-delete/route.ts` - Agregó snapshot y auditoría
- `src/app/api/perfil/[username]/route.ts` - Agregó filtrado de actividades ocultas
- `src/app/api/perfil/[username]/actividad/route.ts` - Agregó filtrado de actividades ocultas

---

## 8️⃣ Estado de Implementación

| Componente                         | Estado                       |
| ---------------------------------- | ---------------------------- |
| Migración activity_visibility      | ✅ Creada (requiere aplicar) |
| Migración audit_logs               | ✅ Creada (requiere aplicar) |
| Migración deleted_content_recovery | ✅ Creada (requiere aplicar) |
| API hide                           | ✅ Implementada              |
| API unhide                         | ✅ Implementada              |
| API admin-delete                   | ✅ Implementada              |
| API filtrado perfil                | ✅ Implementada              |
| API filtrado actividad             | ✅ Implementada              |
| API admin deleted-content          | ✅ Implementada              |
| API admin recover                  | ✅ Implementada              |
| API admin audit-logs               | ✅ Implementada              |
| Frontend menu                      | ✅ Implementado              |
| Frontend filtrado                  | ✅ Implementado              |

---

## 9️⃣ Próximos Pasos

### Inmediatos

1. **Aplicar migraciones SQL** en Supabase Dashboard:

   - `20250204000001_add_activity_audit_logs.sql`
   - `20250204000002_add_deleted_content_recovery.sql`

2. **Testing**:
   - Probar ocultar/mostrar actividades
   - Probar eliminar como admin
   - Probar recuperar contenido
   - Verificar auditoría

### Opcionales

1. **Panel de Admin**:

   - UI para ver contenido borrado
   - UI para ver logs de auditoría
   - UI para recuperar contenido

2. **Notificaciones**:

   - Avisar al autor si su contenido fue eliminado
   - Avisar si su contenido fue recuperado

3. **Filtros Avanzados**:

   - Filtrar por rango de fechas
   - Filtrar por tipo de acción
   - Filtrar por usuario

4. **Exportación**:
   - Exportar logs de auditoría a CSV
   - Exportar snapshots de contenido

---

## 🔟 Notas Técnicas

### Performance

- Índices optimizados en todas las tablas
- Queries paralelas donde es posible
- Caché de actividades ocultas en frontend

### Seguridad

- RLS habilitado en todas las tablas
- Verificación de admin en endpoints
- Soft delete (no hard delete)
- Snapshots para recuperación

### Auditoría

- Todas las acciones registradas
- Información de quién, qué, cuándo
- Estadísticas por tipo de acción
- Trazabilidad completa

---

## 📋 Resumen Final

✅ **Implementación completa** del sistema de gestión de actividades con:

- Ocultamiento de actividades por usuario
- Eliminación de contenido por admin
- Recuperación de contenido borrado
- Auditoría completa de todas las acciones
- Filtrado en APIs de perfil
- Seguridad con RLS y verificación de permisos

**Estado**: Listo para aplicar migraciones y hacer testing.
