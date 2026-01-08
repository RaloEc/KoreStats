# Corrección - Email no visible en usuarios de Google

## Fecha
13 de octubre de 2025

## Problema Identificado

En la página `/admin/usuarios/[id]`, algunos usuarios registrados con Google no mostraban su email, aunque el email existía en la tabla `auth.users`.

### Causa Raíz

El endpoint `/api/admin/usuarios/[id]` estaba intentando obtener los datos de autenticación usando el campo `auth_id` de la tabla `perfiles`, pero:

1. **Campo `auth_id` no existe en la tabla `perfiles`** - Este campo fue eliminado o nunca se implementó correctamente
2. **Lógica incorrecta** - El código verificaba si `auth_id` existía antes de buscar en `auth.users`
3. **Fallback insuficiente** - No había un método alternativo para obtener el email

```typescript
// ❌ CÓDIGO ANTERIOR (INCORRECTO)
if (usuario.auth_id && typeof usuario.auth_id === 'string' && usuario.auth_id.length > 0) {
  const { data, error: authError } = await supabase.auth.admin.getUserById(usuario.auth_id);
  // ...
} else {
  console.warn(`El perfil no tiene un auth_id válido.`);
}
```

## Solución Implementada

### 1. Búsqueda directa por ID del perfil

El `id` en la tabla `perfiles` es el mismo UUID que el `id` en `auth.users`, por lo que podemos buscar directamente:

```typescript
// ✅ CÓDIGO NUEVO (CORRECTO)
// Intentar buscar datos de autenticación usando el id del perfil
console.log(`[API] Buscando datos de autenticación para usuario con id: ${usuario.id}`);
const { data, error: authError } = await supabase.auth.admin.getUserById(usuario.id);

if (authError) {
  console.error('[API] Error al obtener datos de auth:', authError.message);
  // Si falla con el id del perfil, intentar con auth_id si existe (fallback)
  if (usuario.auth_id && typeof usuario.auth_id === 'string' && usuario.auth_id.length > 0) {
    console.log(`[API] Intentando con auth_id: ${usuario.auth_id}`);
    const { data: dataFallback, error: authErrorFallback } = await supabase.auth.admin.getUserById(usuario.auth_id);
    if (!authErrorFallback && dataFallback) {
      authUser = dataFallback.user;
      console.log('[API] Datos de auth obtenidos usando auth_id');
    }
  }
} else {
  authUser = data.user;
  console.log('[API] Datos de auth obtenidos correctamente:', {
    email: authUser?.email,
    provider: authUser?.app_metadata?.provider
  });
}
```

### 2. Ventajas de esta solución

- ✅ **Funciona para todos los usuarios** - No depende de un campo `auth_id` que puede no existir
- ✅ **Más simple y directo** - Usa el ID del perfil que siempre existe
- ✅ **Fallback robusto** - Si falla, intenta con `auth_id` como respaldo
- ✅ **Mejor logging** - Registra el proveedor de autenticación para debugging

## Estructura de Datos

### Usuarios registrados con Google

En `auth.users`, los usuarios de Google tienen esta estructura en `raw_user_meta_data`:

```json
{
  "iss": "https://accounts.google.com",
  "sub": "104159276763051286864",
  "name": "Ricardo López",
  "email": "ricardo.lopez.18.ralo@gmail.com",
  "picture": "https://lh3.googleusercontent.com/...",
  "username": "Ralo",
  "full_name": "Ricardo López",
  "avatar_url": "https://lh3.googleusercontent.com/...",
  "provider_id": "104159276763051286864",
  "email_verified": true,
  "phone_verified": false
}
```

### Relación entre tablas

```
auth.users.id (UUID) ←→ perfiles.id (UUID)
        ↓
    email, raw_user_meta_data, last_sign_in_at
```

**Nota importante:** El campo `auth_id` en `perfiles` no existe o no es necesario, ya que el `id` es suficiente para vincular ambas tablas.

## Archivos Modificados

### `src/app/api/admin/usuarios/[id]/route.ts`

**Cambios:**
1. Búsqueda directa usando `usuario.id` en lugar de `usuario.auth_id`
2. Fallback a `auth_id` solo si la búsqueda principal falla
3. Logging mejorado con información del proveedor

## Verificación

Para verificar que la corrección funciona:

1. **Verificar que los usuarios tienen email en auth.users:**
   ```sql
   SELECT 
     au.id,
     au.email,
     au.raw_user_meta_data->>'iss' as provider_iss,
     p.username
   FROM auth.users au
   LEFT JOIN perfiles p ON au.id = p.id
   WHERE au.email IS NOT NULL
   ORDER BY au.created_at DESC
   LIMIT 10;
   ```

2. **Probar en la interfaz:**
   - Ir a `/admin/usuarios`
   - Hacer clic en un usuario registrado con Google
   - Verificar que el email se muestra correctamente en:
     - El header debajo del nombre de usuario
     - La sección "Información Personal"

3. **Verificar en los logs del servidor:**
   - Buscar: `[API] Datos de auth obtenidos correctamente`
   - Debe mostrar el email y el proveedor

## Usuarios de Google vs Email/Password

### Google OAuth:
- `raw_user_meta_data` contiene `iss: "https://accounts.google.com"`
- Email siempre verificado (`email_verified: true`)
- Incluye `picture`, `full_name`, `provider_id`

### Email/Password:
- `raw_user_meta_data` contiene solo `sub`, `email`, `username`
- Email puede no estar verificado inicialmente
- No incluye `picture` ni `provider_id`

## Próximos Pasos (Opcional)

Si quieres mejorar aún más el sistema:

1. **Agregar indicador de proveedor en la UI:**
   ```typescript
   const provider = usuario.raw_user_meta_data?.iss?.includes('google') ? 'Google' : 'Email'
   ```

2. **Mostrar avatar de Google si existe:**
   ```typescript
   const avatarUrl = usuario.perfil?.avatar_url || 
                     usuario.raw_user_meta_data?.picture || 
                     '/images/default-avatar.svg'
   ```

3. **Sincronizar avatar de Google automáticamente:**
   - Crear un trigger que actualice `perfiles.avatar_url` cuando el usuario inicie sesión
   - Similar al trigger de `fecha_ultimo_acceso`

## Resumen

✅ **Problema resuelto:** El email ahora se muestra correctamente para todos los usuarios, incluyendo los registrados con Google.

✅ **Método:** Búsqueda directa usando el `id` del perfil en lugar de depender de un campo `auth_id` inexistente.

✅ **Beneficio adicional:** Mejor logging y manejo de errores para facilitar el debugging futuro.
