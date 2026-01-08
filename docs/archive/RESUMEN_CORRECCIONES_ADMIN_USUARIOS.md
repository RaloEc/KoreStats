# Resumen de Correcciones - Gestión de Usuarios Admin

## Fecha
12 de octubre de 2025

## Problemas Identificados y Solucionados

### 1. ✅ Rol por Defecto Incorrecto

**Problema:**
- La columna `role` en la tabla `perfiles` tenía como valor por defecto `'user'` en lugar de `'usuario'`
- Los nuevos usuarios se creaban con el rol `'user'` que no estaba en los roles establecidos

**Solución:**
- Se aplicó una migración SQL para cambiar el valor por defecto de `'user'` a `'usuario'`
- Se actualizaron todos los registros existentes que tenían `'user'` a `'usuario'`
- Se agregó un comentario en la columna para documentar los roles válidos

**Archivo de migración:**
- `supabase/migrations/[timestamp]_fix_rol_default_usuario.sql`

**Verificación:**
```sql
-- Verificar que no hay usuarios con rol 'user'
SELECT COUNT(*) FROM perfiles WHERE role = 'user';
-- Resultado: 0 usuarios
```

---

### 2. ✅ Avatares Rotos en la Lista de Usuarios

**Problema:**
- Los usuarios sin imagen de perfil mostraban imágenes rotas en la tabla de gestión de usuarios
- No había un fallback adecuado para usuarios sin `avatar_url`

**Solución:**
- Se creó una imagen SVG por defecto en `/public/images/default-avatar.svg`
- Se agregó un manejador `onError` en el componente `TablaUsuarios` para usar el avatar por defecto
- Se agregó una clase `bg-gray-700` para mejorar la visualización del avatar por defecto

**Archivos modificados:**
- `src/components/admin/usuarios/TablaUsuarios.tsx`
- `public/images/default-avatar.svg` (nuevo archivo)

**Código implementado:**
```tsx
<img
  src={usuario.perfil?.avatar_url || usuario.user_metadata?.avatar_url || '/images/default-avatar.svg'}
  alt={usuario.perfil?.username || 'Usuario'}
  className="w-12 h-12 rounded-full object-cover bg-gray-700"
  onError={(e) => {
    const target = e.target as HTMLImageElement;
    target.src = '/images/default-avatar.svg';
  }}
/>
```

---

### 3. ✅ Datos No Cargando en Página de Edición

**Problema:**
- En la página de editar usuario (`/admin/usuarios/[id]/editar`), no se mostraban correctamente ciertos datos:
  - El correo no se mostraba
  - El URL del avatar mostraba "Cargando..." como placeholder
  - El username no se mostraba en el header

**Causa:**
- El endpoint `/api/admin/usuarios/[id]` devuelve los datos en formato plano (directamente del perfil)
- La página esperaba una estructura anidada con `usuario.perfil.campo`
- Conflicto entre el tipo `UsuarioCompleto` y la estructura real de los datos

**Solución:**
- Se cambió el tipo del estado `usuario` de `UsuarioCompleto | null` a `any` para mayor flexibilidad
- Se corrigió el acceso a los datos para usar la estructura plana: `usuario.username`, `usuario.email`, etc.
- Se mejoró la visualización del avatar con preview y manejo de errores
- Se agregó logging para debugging: `console.log('Datos recibidos del usuario:', data)`
- Se corrigió el placeholder del campo avatar_url

**Archivos modificados:**
- `src/app/admin/usuarios/[id]/editar/page.tsx`

**Cambios específicos:**
1. Estado del usuario más flexible
2. Acceso correcto a los datos del formulario
3. Preview del avatar con manejo de errores
4. Placeholder mejorado en el campo de avatar URL
5. Header con username correcto

---

## Estructura de Datos

### Endpoint GET `/api/admin/usuarios/[id]`
Devuelve los datos en formato plano:
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "role": "usuario|moderator|admin",
  "activo": true,
  "bio": "string",
  "ubicacion": "string",
  "sitio_web": "string",
  "avatar_url": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Endpoint GET `/api/admin/usuarios` (lista)
Devuelve los datos en formato anidado:
```json
{
  "usuarios": [
    {
      "id": "uuid",
      "email": "string",
      "created_at": "timestamp",
      "perfil": {
        "id": "uuid",
        "username": "string",
        "role": "string",
        "avatar_url": "string",
        "activo": true,
        ...
      }
    }
  ]
}
```

---

## Roles Válidos

Los roles establecidos en el sistema son:
- `usuario` (por defecto) - Usuario regular
- `moderator` - Moderador con permisos especiales
- `admin` - Administrador con acceso completo

---

## Archivos Modificados

1. **Base de datos:**
   - Nueva migración: `fix_rol_default_usuario.sql`

2. **Componentes:**
   - `src/components/admin/usuarios/TablaUsuarios.tsx`
   - `src/app/admin/usuarios/[id]/editar/page.tsx`

3. **Assets:**
   - `public/images/default-avatar.svg` (nuevo)

---

## Verificación

Para verificar que las correcciones funcionan correctamente:

1. **Verificar rol por defecto:**
   - Crear un nuevo usuario
   - Verificar que el rol sea `'usuario'` y no `'user'`

2. **Verificar avatares:**
   - Ir a `/admin/usuarios`
   - Verificar que los usuarios sin avatar muestran la imagen por defecto
   - No deben aparecer imágenes rotas

3. **Verificar página de edición:**
   - Ir a `/admin/usuarios/[id]/editar`
   - Verificar que se muestra el correo del usuario
   - Verificar que se muestra el avatar (o placeholder correcto)
   - Verificar que el username aparece en el header
   - Verificar que todos los campos se cargan correctamente

---

## Notas Adicionales

- El avatar por defecto es un SVG simple que muestra un icono de usuario genérico
- Se agregó logging en la página de edición para facilitar el debugging futuro
- La estructura de datos entre el endpoint de lista y el endpoint individual es diferente, lo cual es importante tener en cuenta para futuros desarrollos
