# Sistema de Reportes para Noticias y Comentarios

## Descripción General

Se ha implementado un sistema completo de reportes para noticias y comentarios de noticias, permitiendo a los usuarios denunciar contenido inapropiado y a los administradores gestionar estos reportes de forma centralizada.

## Estructura Implementada

### 1. Base de Datos

**Migración:** `supabase/migrations/20250116000000_sistema_reportes_noticias.sql`

#### Tabla: `noticias_reportes`

- `id` (UUID, PK)
- `tipo_contenido` (VARCHAR): 'noticia' o 'comentario'
- `contenido_id` (UUID): ID de la noticia o comentario reportado
- `reportado_por` (UUID): ID del usuario que reporta
- `razon` (VARCHAR): Razón del reporte (spam, acoso, contenido_inapropiado, etc.)
- `descripcion` (TEXT): Descripción adicional opcional
- `estado` (VARCHAR): 'pendiente', 'en_revision', 'resuelto', 'desestimado'
- `prioridad` (VARCHAR): 'baja', 'media', 'alta', 'critica'
- `asignado_a` (UUID): Admin asignado al reporte
- `resuelto_por` (UUID): Admin que resolvió el reporte
- `resolucion` (TEXT): Detalles de la resolución
- `created_at`, `updated_at`, `resuelto_en` (TIMESTAMPTZ)

#### Índices

- `idx_noticias_reportes_estado`
- `idx_noticias_reportes_tipo_contenido`
- `idx_noticias_reportes_contenido_id`
- `idx_noticias_reportes_reportado_por`
- `idx_noticias_reportes_asignado_a`
- `idx_noticias_reportes_created_at`

#### RLS Policies

- Usuarios pueden crear reportes
- Usuarios pueden ver sus propios reportes
- Admins pueden ver y gestionar todos los reportes

### 2. Funciones RPC

#### `crear_reporte_noticia()`

Crea un nuevo reporte de noticia o comentario.

```sql
SELECT crear_reporte_noticia(
  p_tipo_contenido := 'noticia',
  p_contenido_id := 'uuid-value',
  p_razon := 'spam',
  p_descripcion := 'Descripción opcional'
);
```

#### `obtener_reportes_noticias()`

Obtiene reportes con filtros opcionales.

```sql
SELECT * FROM obtener_reportes_noticias(
  p_estado := 'pendiente',
  p_tipo_contenido := 'noticia',
  p_limit := 50,
  p_offset := 0
);
```

#### `resolver_reporte_noticia()`

Marca un reporte como resuelto.

#### `desestimar_reporte_noticia()`

Marca un reporte como desestimado.

#### `procesar_reportes_noticias_masivo()`

Procesa múltiples reportes en lote.

### 3. Endpoints API

#### `POST /api/admin/noticias/reportes`

Crear un nuevo reporte.

**Request:**

```json
{
  "tipo_contenido": "noticia" | "comentario",
  "contenido_id": "uuid",
  "razon": "spam" | "acoso" | "contenido_inapropiado" | "desinformacion" | "lenguaje_ofensivo" | "fuera_de_tema" | "otro",
  "descripcion": "Descripción adicional (opcional)"
}
```

**Response:**

```json
{
  "reporte_id": "uuid"
}
```

#### `GET /api/admin/noticias/reportes`

Obtener reportes con filtros.

**Query Parameters:**

- `estado`: 'pendiente', 'en_revision', 'resuelto', 'desestimado'
- `tipo_contenido`: 'noticia', 'comentario'
- `limit`: Número de resultados (default: 50)
- `offset`: Desplazamiento (default: 0)

**Response:**

```json
{
  "reportes": [
    {
      "id": "uuid",
      "tipo_contenido": "noticia",
      "contenido_id": "uuid",
      "reportado_por": "uuid",
      "razon": "spam",
      "descripcion": "...",
      "estado": "pendiente",
      "prioridad": "media",
      "created_at": "2025-01-16T...",
      "reportador_nombre": "Usuario",
      "reportador_avatar": "url",
      "contenido_preview": "Título de la noticia...",
      "noticia_id": "uuid",
      "noticia_titulo": "Título completo"
    }
  ]
}
```

#### `PATCH /api/admin/noticias/reportes`

Procesar un reporte (resolver o desestimar).

**Request:**

```json
{
  "reporte_id": "uuid",
  "accion": "resolver" | "desestimar",
  "resolucion": "Descripción de la resolución"
}
```

#### `POST /api/admin/noticias/reportes/masivo`

Procesar múltiples reportes en lote.

**Request:**

```json
{
  "reporte_ids": ["uuid1", "uuid2", ...],
  "accion": "resolver" | "desestimar",
  "resolucion": "Descripción de la resolución"
}
```

**Response:**

```json
{
  "success": true,
  "procesados": 5
}
```

### 4. Componentes Frontend

#### `BotonReportarNoticia.tsx`

Componente reutilizable para reportar noticias y comentarios.

**Props:**

```typescript
interface BotonReportarNoticiaProps {
  tipo_contenido: "noticia" | "comentario";
  contenido_id: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  hideLabelBelow?: "sm" | "md" | "lg" | "xl";
}
```

**Uso:**

```tsx
<BotonReportarNoticia
  tipo_contenido="noticia"
  contenido_id={noticiaId}
  variant="outline"
  size="sm"
/>
```

#### `TablaReportesNoticias.tsx`

Tabla interactiva para gestionar reportes en el admin.

**Características:**

- Filtros por estado y tipo de contenido
- Selección múltiple de reportes
- Procesamiento masivo
- Vista previa del contenido
- Enlaces directos al contenido reportado
- Dialog para procesar reportes individuales

### 5. Páginas

#### `/admin/noticias/reportes`

Página de gestión de reportes de noticias.

**Ubicación:** `src/app/admin/noticias/reportes/page.tsx`

**Características:**

- Protegida por autenticación de admin
- Tabla de reportes con filtros
- Acciones masivas
- Procesamiento individual

### 6. Integración en Componentes Existentes

#### `NoticiaCabecera.tsx`

Se agregó botón de reporte en el header de la noticia.

```tsx
<BotonReportarNoticia
  tipo_contenido="noticia"
  contenido_id={noticiaId}
  variant="outline"
  size="sm"
/>
```

#### `CommentCard.tsx`

Se agregó botón de reporte en cada comentario y respuesta.

```tsx
<BotonReportarNoticia
  tipo_contenido="comentario"
  contenido_id={comment.id}
  variant="ghost"
  size="icon"
/>
```

### 7. Panel Admin

Se agregó enlace a reportes en `/admin/noticias`:

```tsx
<NavCard
  href="/admin/noticias/reportes"
  icon={Flag}
  title="Reportes"
  description="Gestiona reportes de contenido"
/>
```

## Razones de Reporte

Los usuarios pueden seleccionar una de las siguientes razones:

1. **Spam o publicidad** - Contenido promocional no autorizado
2. **Acoso o intimidación** - Contenido que acosa o intimida
3. **Contenido inapropiado** - Contenido ofensivo o inapropiado
4. **Desinformación** - Información falsa o engañosa
5. **Lenguaje ofensivo** - Lenguaje vulgar o ofensivo
6. **Fuera de tema** - Contenido no relacionado
7. **Otro** - Otra razón (requiere descripción)

## Flujo de Uso

### Para Usuarios

1. **Reportar Noticia:**

   - Ir a la página de la noticia
   - Hacer clic en botón "Reportar" en el header
   - Seleccionar razón
   - Agregar descripción opcional
   - Enviar reporte

2. **Reportar Comentario:**
   - En la sección de comentarios
   - Hacer clic en botón "Reportar" en el comentario
   - Seleccionar razón
   - Agregar descripción opcional
   - Enviar reporte

### Para Administradores

1. **Ver Reportes:**

   - Ir a `/admin/noticias/reportes`
   - Filtrar por estado y tipo
   - Ver lista de reportes

2. **Procesar Reportes:**

   - Hacer clic en "Procesar" en un reporte
   - Escribir resolución
   - Elegir "Resolver" o "Desestimar"

3. **Procesamiento Masivo:**
   - Seleccionar múltiples reportes
   - Elegir acción (Resolver o Desestimar)
   - Escribir resolución
   - Aplicar a todos seleccionados

## Estados de Reporte

- **Pendiente**: Reporte recién creado, sin revisar
- **En revisión**: Admin está revisando el reporte
- **Resuelto**: Reporte procesado, acción tomada
- **Desestimado**: Reporte rechazado, sin acción

## Prioridades

- **Baja**: Contenido menor
- **Media**: Contenido moderado
- **Alta**: Contenido grave
- **Crítica**: Contenido muy grave

## Archivos Creados

1. `supabase/migrations/20250116000000_sistema_reportes_noticias.sql`
2. `src/app/api/admin/noticias/reportes/route.ts`
3. `src/app/api/admin/noticias/reportes/masivo/route.ts`
4. `src/components/noticias/BotonReportarNoticia.tsx`
5. `src/components/admin/noticias/TablaReportesNoticias.tsx`
6. `src/app/admin/noticias/reportes/page.tsx`

## Archivos Modificados

1. `src/components/noticias/NoticiaCabecera.tsx` - Agregado botón de reporte
2. `src/components/comentarios/CommentCard.tsx` - Agregado botón de reporte
3. `src/app/admin/noticias/page.tsx` - Agregado enlace a reportes

## Próximas Mejoras

- [ ] Notificaciones por email a admins cuando hay nuevos reportes
- [ ] Estadísticas de reportes en el dashboard
- [ ] Historial de acciones de moderación
- [ ] Sanciones automáticas para usuarios con múltiples reportes
- [ ] Reportes anónimos opcionales
- [ ] Categorización automática de reportes con IA

## Seguridad

- RLS habilitado en tabla `noticias_reportes`
- Validación de autenticación en todos los endpoints
- Verificación de permisos de admin
- Validación de contenido antes de crear reporte
- Logs de todas las acciones de moderación

## Testing

Para probar el sistema:

1. Aplicar migración: `supabase db push`
2. Crear una noticia o comentario
3. Hacer clic en botón "Reportar"
4. Llenar formulario y enviar
5. Ir a `/admin/noticias/reportes`
6. Procesar el reporte

## Notas

- Los reportes se pueden filtrar por estado y tipo
- Los admins pueden procesar reportes individualmente o en lote
- Cada reporte incluye información del reportador
- Se guarda el historial completo de resoluciones
- El sistema es escalable y puede extenderse a otros tipos de contenido
