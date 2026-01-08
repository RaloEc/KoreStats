# Resumen de Mejoras - Perfil de Usuario y Último Acceso

## Fecha
13 de octubre de 2025

## Problemas Identificados y Solucionados

### 1. ✅ Último Acceso Siempre Mostraba "Nunca"

**Problema:**
- En `/admin/usuarios` y `/admin/usuarios/[id]`, el campo "Último acceso" siempre mostraba "Nunca"
- La columna `fecha_ultimo_acceso` en la tabla `perfiles` no se actualizaba automáticamente
- No había sincronización entre `auth.users.last_sign_in_at` y `perfiles.fecha_ultimo_acceso`

**Solución:**
1. **Trigger automático en la base de datos:**
   - Se creó una función `actualizar_fecha_ultimo_acceso()` que sincroniza automáticamente `last_sign_in_at` de `auth.users` con `fecha_ultimo_acceso` en `perfiles`
   - Se creó un trigger que se ejecuta cada vez que un usuario inicia sesión
   - Se sincronizaron todos los datos existentes

2. **Mejora en el formato de fecha:**
   - Se agregó función `formatDateRelative()` que muestra fechas relativas (ej: "Hace 2h", "Hace 3d")
   - Se agregó tooltip con la fecha completa al pasar el mouse
   - Manejo robusto de fechas nulas o inválidas

**Migración aplicada:**
```sql
-- Función para sincronizar last_sign_in_at con fecha_ultimo_acceso
CREATE OR REPLACE FUNCTION actualizar_fecha_ultimo_acceso()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.perfiles
  SET fecha_ultimo_acceso = NEW.last_sign_in_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger automático
CREATE TRIGGER trigger_actualizar_fecha_ultimo_acceso
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION actualizar_fecha_ultimo_acceso();

-- Sincronizar datos existentes
UPDATE public.perfiles p
SET fecha_ultimo_acceso = au.last_sign_in_at
FROM auth.users au
WHERE p.id = au.id
AND au.last_sign_in_at IS NOT NULL;
```

---

### 2. ✅ Página de Detalles del Usuario Mejorada

**Problema:**
- El diseño era básico y no mostraba toda la información disponible
- Los datos no se obtenían correctamente del endpoint
- Faltaba información importante como email, ubicación, sitio web

**Solución:**
1. **Rediseño completo de la interfaz:**
   - Layout de 2 columnas optimizado (principal + sidebar)
   - Secciones organizadas: Información Personal, Biografía, Actividad, Estadísticas
   - Sidebar con información administrativa e insignias
   - Mejor visualización del avatar con fallback

2. **Corrección del endpoint API:**
   - El endpoint `/api/admin/usuarios/[id]` ahora devuelve la estructura correcta con `perfil` anidado
   - Se incluyen todos los campos: `fecha_ultimo_acceso`, `auth_id`, `last_sign_in_at`, etc.
   - Logging mejorado para debugging

3. **Nuevas características:**
   - Muestra email del usuario
   - Muestra ubicación y sitio web (si están disponibles)
   - Muestra fecha de registro y último acceso con formato relativo
   - Muestra estadísticas como racha de días
   - Muestra insignias del usuario
   - Muestra notas del moderador (si existen)
   - Badge de "Verificado" si el email está verificado

**Estructura de datos del endpoint:**
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "created_at": "2025-10-13T00:00:00Z",
  "updated_at": "2025-10-13T00:00:00Z",
  "perfil": {
    "id": "uuid",
    "username": "NombreUsuario",
    "role": "usuario",
    "avatar_url": "https://...",
    "color": "#3b82f6",
    "activo": true,
    "fecha_ultimo_acceso": "2025-10-13T00:00:00Z",
    "bio": "Biografía del usuario",
    "ubicacion": "Ciudad, País",
    "sitio_web": "https://...",
    "banner_url": "https://...",
    "email_verificado": true,
    "racha_dias": 5,
    "badges": [],
    "notas_moderador": "Notas internas"
  },
  "auth_id": "uuid",
  "last_sign_in_at": "2025-10-13T00:00:00Z"
}
```

---

### 3. ✅ Tabla de Usuarios Mejorada

**Problema:**
- La columna "Último Acceso" mostraba "—" o fechas incorrectas
- No había formato amigable para las fechas

**Solución:**
1. **Formato de fecha relativo:**
   - Muestra "Hace 2h", "Hace 3d" para fechas recientes
   - Tooltip con fecha completa al pasar el mouse
   - "Nunca" para usuarios que no han iniciado sesión

2. **Mejora visual:**
   - Texto más claro con `text-muted-foreground/50` para "Nunca"
   - Cursor help (`cursor-help`) para indicar que hay tooltip
   - Formato consistente en toda la tabla

---

## Archivos Modificados

### Base de datos:
1. **Nueva migración:** `actualizar_fecha_ultimo_acceso_trigger.sql`
   - Función de sincronización automática
   - Trigger en `auth.users`
   - Sincronización de datos existentes

### Backend (API):
1. **`src/app/api/admin/usuarios/[id]/route.ts`**
   - Estructura de respuesta corregida con `perfil` anidado
   - Inclusión de todos los campos necesarios
   - Logging mejorado

### Frontend:
1. **`src/app/admin/usuarios/[id]/page.tsx`**
   - Rediseño completo de la interfaz
   - Nuevas secciones y mejor organización
   - Funciones `formatDate()` y `formatDateRelative()`
   - Manejo robusto de datos nulos

2. **`src/components/admin/usuarios/TablaUsuarios.tsx`**
   - Función `formatDateRelative()` agregada
   - Tooltip en columna "Último Acceso"
   - Mejor manejo de fechas nulas

3. **`src/types/index.ts`**
   - Tipo `UsuarioCompleto` actualizado con campos adicionales:
     - `auth_id?: string | null`
     - `last_sign_in_at?: string | null`
     - `updated_at?: string | null`

---

## Características Nuevas

### Página de Detalles del Usuario (`/admin/usuarios/[id]`)

#### Columna Principal:
- **Header con avatar grande:**
  - Avatar de 96x96px con fallback
  - Nombre de usuario
  - Email
  - Badges: Rol, Estado, Verificado
  - Botones: Editar, Menú de acciones

- **Información Personal:**
  - Usuario
  - Email
  - Ubicación (si existe)
  - Sitio web con enlace (si existe)

- **Biografía:**
  - Texto completo con formato preservado

- **Actividad:**
  - Fecha de registro (formato completo)
  - Último acceso (formato relativo + tooltip con fecha completa)

- **Estadísticas:**
  - Racha de días (si > 0)
  - Icono de fuego 🔥

#### Columna Secundaria (Sidebar):
- **Información Administrativa:**
  - ID de Usuario (código)
  - ID de Autenticación (código)
  - Rol
  - Estado
  - Email Verificado
  - Notas del Moderador (si existen)

- **Insignias:**
  - Lista de badges del usuario
  - Con iconos si están disponibles

---

## Formato de Fechas

### Función `formatDate()`
- Entrada: `string | null | undefined`
- Salida: Fecha completa en español (ej: "13 de octubre de 2025, 15:30")
- Manejo de errores: "Nunca" o "Fecha inválida"

### Función `formatDateRelative()`
- Entrada: `string | null | undefined`
- Salida:
  - "Hace un momento" (< 1 minuto)
  - "Hace Xm" (< 1 hora)
  - "Hace Xh" (< 24 horas)
  - "Hace Xd" (< 7 días)
  - Fecha completa (> 7 días)
- Manejo de errores: "Nunca" o "Fecha inválida"

---

## Sincronización Automática

El trigger `trigger_actualizar_fecha_ultimo_acceso` se ejecuta automáticamente cuando:
1. Un usuario inicia sesión (OAuth, email/password, etc.)
2. El campo `last_sign_in_at` en `auth.users` se actualiza
3. La función sincroniza el valor a `fecha_ultimo_acceso` en `perfiles`

**Ventajas:**
- No requiere código adicional en el frontend
- Funciona para todos los métodos de autenticación
- Mantiene los datos sincronizados en tiempo real
- No afecta el rendimiento (trigger eficiente)

---

## Verificación

Para verificar que las mejoras funcionan correctamente:

1. **Verificar trigger:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_actualizar_fecha_ultimo_acceso';
   ```

2. **Verificar datos sincronizados:**
   ```sql
   SELECT 
     p.username,
     p.fecha_ultimo_acceso,
     au.last_sign_in_at
   FROM perfiles p
   LEFT JOIN auth.users au ON p.id = au.id
   ORDER BY p.created_at DESC
   LIMIT 10;
   ```

3. **Probar en la interfaz:**
   - Ir a `/admin/usuarios`
   - Verificar que la columna "Último Acceso" muestra fechas relativas
   - Pasar el mouse sobre las fechas para ver el tooltip
   - Hacer clic en un usuario para ver su perfil detallado
   - Verificar que todos los datos se muestran correctamente

---

## Notas Adicionales

- El formato de fecha relativo mejora la experiencia de usuario al mostrar información más intuitiva
- El tooltip permite ver la fecha exacta cuando sea necesario
- El trigger automático garantiza que los datos estén siempre actualizados
- El diseño mejorado de la página de detalles facilita la gestión de usuarios
- Todos los cambios son retrocompatibles con datos existentes
