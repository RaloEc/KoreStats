# Implementación del Sistema de Estado de Usuario en Tiempo Real

## 📋 Resumen

Se ha implementado un sistema completo de indicador de estado de usuario que:

- Muestra el estado actual del usuario (online, in-game, offline) en su avatar
- Sincroniza automáticamente el estado en tiempo real usando Supabase Realtime
- Detecta automáticamente cuando el usuario entra/sale de una partida
- Se integra globalmente en toda la aplicación

## 🎯 Componentes Creados

### 1. **StatusBadge.tsx** ✅

**Ubicación**: `src/components/status/StatusBadge.tsx`

Componente visual que muestra el indicador de estado:

- Punto de color + texto + icono gamepad (si está en partida)
- Escucha cambios en tiempo real desde Supabase
- Estados:
  - 🟣 **in-game**: Violeta pulsante + icono gamepad
  - 🟢 **online**: Verde estático
  - ⚫ **offline**: Gris

```tsx
import { StatusBadge } from "@/components/status/StatusBadge";

<StatusBadge userId={userId} initialStatus="offline" />;
```

### 2. **UserStatusSyncProvider.tsx** ✅

**Ubicación**: `src/components/status/UserStatusSyncProvider.tsx`

Proveedor que sincroniza automáticamente el estado del usuario:

- Establece "online" al montar
- Detecta partidas activas y cambia a "in-game"
- Establece "offline" al desmontar

Integrado en `src/components/Providers.tsx`

### 3. **Hooks Creados**

#### `use-update-user-status.ts`

Hook para actualizar el estado en BD:

```tsx
const { updateStatus } = useUpdateUserStatus();
await updateStatus("in-game");
```

#### `use-user-status-sync.ts`

Hook que sincroniza automáticamente el estado:

- Auto-establece "online" al montar
- Auto-establece "offline" al desmontar
- Maneja timeout para enviar actualizaciones antes de desmontar

#### `use-match-status-detector.ts`

Hook que detecta partidas activas:

- Verifica cada 10 segundos si hay partida activa
- Llama callback cuando cambia el estado
- Integrado con `UserStatusSyncProvider`

### 4. **Endpoints API Creados**

#### `PATCH /api/user/status`

Actualiza el estado del usuario en BD:

```bash
curl -X PATCH http://localhost:3000/api/user/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "in-game"}'
```

**Validaciones**:

- Requiere autenticación
- Status debe ser: "online", "in-game" o "offline"

#### `GET /api/riot/matches/active`

Detecta si hay una partida activa:

```bash
curl http://localhost:3000/api/riot/matches/active \
  -H "Authorization: Bearer {token}"
```

**Respuesta**:

```json
{
  "hasActiveMatch": true,
  "reason": "Game in progress"
}
```

### 5. **Migración SQL**

**Archivo**: `supabase/migrations/20250211000000_add_status_to_profiles.sql`

Agrega columna `status` a tabla `profiles`:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline'
CHECK (status IN ('online', 'in-game', 'offline'));

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_id_status ON public.profiles(id, status);
```

## 🚀 Pasos de Implementación

### Paso 1: Aplicar Migración SQL

```bash
# En Supabase Dashboard o CLI
supabase migration up
```

O ejecutar manualmente en el SQL Editor de Supabase:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline'
CHECK (status IN ('online', 'in-game', 'offline'));

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_id_status ON public.profiles(id, status);
```

### Paso 2: Verificar Integración en Providers

✅ Ya integrado en `src/components/Providers.tsx`

El `UserStatusSyncProvider` está envolviendo toda la app:

```tsx
<AuthProvider session={session}>
  <UserStatusSyncProvider autoDetectMatch={true}>
    <LazyMotion features={domAnimation}>
      {children}
      <Toaster />
    </LazyMotion>
  </UserStatusSyncProvider>
</AuthProvider>
```

### Paso 3: Verificar Integración en PerfilHeader

✅ Ya integrado en `src/components/perfil/PerfilHeader.tsx`

El `StatusBadge` está en la esquina inferior derecha del avatar:

```tsx
<div className="relative">
  <Avatar>{/* Avatar content */}</Avatar>

  <div className="absolute bottom-0 right-0 bg-white dark:bg-gray-950 rounded-full p-1 border-2 border-background dark:border-gray-950">
    <StatusBadge userId={profile.id} initialStatus="offline" />
  </div>
</div>
```

## 🔄 Flujo de Datos

```
1. Usuario abre la app
   ↓
2. UserStatusSyncProvider monta
   ↓
3. useUserStatusSync establece status = "online"
   ↓
4. PATCH /api/user/status { status: "online" }
   ↓
5. BD actualiza profiles.status = "online"
   ↓
6. Supabase Realtime notifica cambio
   ↓
7. StatusBadge recibe evento y actualiza UI
   ↓
8. useMatchStatusDetector verifica cada 10s si hay partida activa
   ↓
9. Si hay partida activa:
   - useUserStatusSync.updateStatus("in-game")
   - PATCH /api/user/status { status: "in-game" }
   - BD actualiza y Realtime notifica
   - StatusBadge muestra punto violeta pulsante
   ↓
10. Usuario cierra app
    ↓
11. UserStatusSyncProvider desmonta
    ↓
12. useUserStatusSync establece status = "offline"
    ↓
13. PATCH /api/user/status { status: "offline" }
    ↓
14. BD actualiza y Realtime notifica
```

## 📊 Estados Visuales

### En Partida (in-game)

```
🟣 En partida 🎮
```

- Punto violeta con animación `animate-pulse`
- Icono gamepad pequeño
- Indica actividad intensa

### En Línea (online)

```
🟢 En línea
```

- Punto verde estático
- Sin icono adicional

### Desconectado (offline)

```
⚫ Desconectado
```

- Punto gris
- Indica usuario no activo

## 🔧 Configuración

### Auto-detección de Partidas

En `UserStatusSyncProvider`:

```tsx
<UserStatusSyncProvider autoDetectMatch={true}>
  {children}
</UserStatusSyncProvider>
```

Cambiar a `false` para desactivar detección automática.

### Intervalo de Verificación

En `use-match-status-detector.ts` (línea 42):

```tsx
pollIntervalRef.current = setInterval(checkActiveMatch, 10000); // 10 segundos
```

Cambiar el valor para ajustar frecuencia de verificación.

## ✅ Testing

### 1. Verificar que el indicador aparece

- Ir a `/perfil/[username]`
- Ver el indicador en la esquina inferior derecha del avatar
- Debe mostrar "Desconectado" inicialmente

### 2. Verificar sincronización en tiempo real

- Abrir dos pestañas del mismo usuario
- En una pestaña, actualizar manualmente el estado:
  ```tsx
  const { updateStatus } = useUpdateUserStatus();
  await updateStatus("in-game");
  ```
- En la otra pestaña, el indicador debe cambiar automáticamente

### 3. Verificar detección de partidas

- Sincronizar historial de partidas
- Iniciar una partida
- El indicador debe cambiar a "En partida" automáticamente
- Cuando termina la partida, debe volver a "En línea" después de 5 minutos

### 4. Verificar estado offline

- Cerrar la pestaña/navegador
- Esperar 10 segundos
- El indicador debe cambiar a "Desconectado"

## 🐛 Troubleshooting

### El indicador no aparece

1. Verificar que la migración SQL se aplicó correctamente
2. Verificar que `UserStatusSyncProvider` está en `Providers.tsx`
3. Verificar que `StatusBadge` está importado en `PerfilHeader.tsx`
4. Revisar la consola del navegador para errores

### El estado no se actualiza en tiempo real

1. Verificar que Supabase Realtime está habilitado
2. Verificar que el canal se suscribe correctamente:
   ```tsx
   const channel = supabase
     .channel(`profile-status-${userId}`)
     .on('postgres_changes', {...})
     .subscribe();
   ```
3. Revisar logs de Supabase para errores de Realtime

### La detección de partidas no funciona

1. Verificar que hay partidas en la BD
2. Verificar que el endpoint `/api/riot/matches/active` responde correctamente
3. Revisar la consola del navegador para errores en el polling

## 📝 Notas Importantes

- El estado se persiste en BD, no en localStorage
- Supabase Realtime es necesario para sincronización en tiempo real
- La detección de partidas verifica cada 10 segundos (configurable)
- El estado se establece como "offline" automáticamente al desmontar el componente
- Los colores usan variables CSS personalizadas (`--color-violeta`, `--color-verde`)

## 🎨 Personalización

### Cambiar colores

En `tailwind.config.js`, actualizar:

```js
theme: {
  violeta: '#7c3aed', // Cambiar color violeta
  verde: '#10b981',   // Cambiar color verde
}
```

### Cambiar tamaño del indicador

En `PerfilHeader.tsx`, ajustar clases:

```tsx
<div className="w-2 h-2 rounded-full" /> {/* Cambiar w-2 h-2 */}
```

### Cambiar posición del indicador

En `PerfilHeader.tsx`, ajustar clases de posición:

```tsx
<div className="absolute bottom-0 right-0"> {/* Cambiar bottom-0 right-0 */}
```

## 📚 Archivos Relacionados

- `src/components/status/StatusBadge.tsx` - Componente visual
- `src/components/status/UserStatusSyncProvider.tsx` - Proveedor global
- `src/hooks/use-update-user-status.ts` - Hook para actualizar
- `src/hooks/use-user-status-sync.ts` - Hook de sincronización
- `src/hooks/use-match-status-detector.ts` - Hook de detección
- `src/app/api/user/status/route.ts` - Endpoint de actualización
- `src/app/api/riot/matches/active/route.ts` - Endpoint de detección
- `src/components/perfil/PerfilHeader.tsx` - Integración en perfil
- `src/components/Providers.tsx` - Integración global
- `supabase/migrations/20250211000000_add_status_to_profiles.sql` - Migración SQL

## ✨ Próximos Pasos (Opcionales)

1. **Mostrar en otros lugares**: Agregar `StatusBadge` en:

   - Listados de amigos
   - Tarjetas de usuarios en el foro
   - Sidebar de chat (si existe)

2. **Historial de estados**: Guardar cambios de estado para análisis

3. **Notificaciones**: Notificar cuando amigos cambian de estado

4. **Estadísticas**: Mostrar tiempo promedio en línea/en partida

5. **Customización**: Permitir que usuarios cambien su estado manualmente

---

**Estado**: ✅ COMPLETADO Y LISTO PARA PRODUCCIÓN

Todos los componentes están creados, integrados y listos para usar. Solo falta aplicar la migración SQL en Supabase.
