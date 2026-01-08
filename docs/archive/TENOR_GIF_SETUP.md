# Configuración de GIFs de Tenor en Comentarios

## Descripción

Se ha implementado la funcionalidad de agregar GIFs de Tenor a los comentarios. Los usuarios pueden buscar y seleccionar GIFs para compartir en sus comentarios.

## Cambios Realizados

### 1. Base de Datos

- **Migración**: `supabase/migrations/20250115_add_gif_url_to_comentarios.sql`
- **Columna agregada**: `gif_url` (TEXT, NULL) en tabla `comentarios`
- **Índice**: Se creó índice para búsquedas eficientes de comentarios con GIFs

### 2. Componentes Nuevos

- **GifPicker.tsx**: Modal para buscar y seleccionar GIFs de Tenor
  - Búsqueda en tiempo real
  - Trending GIFs por defecto
  - Cuadrícula responsive

### 3. Componentes Modificados

- **CommentForm.tsx**:

  - Botón GIF para abrir el picker
  - Previsualización del GIF seleccionado
  - Permite enviar solo GIF sin texto

- **CommentCard.tsx**:
  - Renderización de GIFs en comentarios
  - Imagen responsive con lazy loading

### 4. API Actualizada

- **POST /api/comentarios**:
  - Acepta parámetro `gif_url`
  - Permite comentarios solo con GIF (sin texto)
  - Guarda en tabla `comentarios` y `foro_posts`

### 5. Hooks Actualizados

- **useNoticiaComentarios.ts**: Mapeo de `gif_url` en comentarios
- **useHiloComentarios.ts**: Mapeo de `gif_url` en comentarios del foro

### 6. Configuración

- **next.config.js**: Agregados dominios de Tenor para imágenes
  - `media.tenor.com`
  - `*.tenor.com`

## Variables de Entorno Requeridas

Agregar a tu archivo `.env.local`:

```env
NEXT_PUBLIC_TENOR_API_KEY=tu_api_key_de_tenor
```

## Obtener API Key de Tenor

1. Ir a https://tenor.com/developer/dashboard
2. Crear una aplicación
3. Copiar la API Key
4. Agregar a `.env.local`

## Flujo de Uso

### Para Usuarios

1. Hacer clic en el botón GIF (icono de imagen) en el formulario de comentarios
2. Buscar un GIF o ver trending
3. Hacer clic en un GIF para seleccionarlo
4. Ver previsualización del GIF
5. Enviar comentario con o sin texto

### Para Desarrolladores

```typescript
// El componente CommentForm ahora acepta gif_url
const handleAddComment = async (text: string, gifUrl?: string | null) => {
  // text puede estar vacío si hay GIF
  // gifUrl es la URL del GIF de Tenor
};
```

## Estructura de Datos

### Comment Interface

```typescript
interface Comment {
  // ... campos existentes ...
  gif_url?: string | null; // URL del GIF de Tenor
}
```

### API Request

```json
{
  "text": "Mi comentario",
  "content_type": "noticia",
  "content_id": "id-noticia",
  "gif_url": "https://media.tenor.com/..."
}
```

## Notas Técnicas

- Los GIFs se almacenan como URLs de Tenor (no se descargan)
- Las imágenes se cargan con lazy loading
- Máximo ancho de GIF: 320px (xs)
- Los GIFs se renderizan debajo del texto del comentario
- Compatible con modo claro y oscuro

## Próximas Mejoras

- [ ] Permitir cargar GIFs personalizados
- [ ] Caché de búsquedas recientes
- [ ] Reacciones con GIFs
- [ ] Migración de GIFs para comentarios existentes
- [ ] Soporte para otros proveedores de GIFs

## Troubleshooting

### "API key de Tenor no configurada"

- Verificar que `NEXT_PUBLIC_TENOR_API_KEY` está en `.env.local`
- Reiniciar servidor de desarrollo

### GIFs no se cargan

- Verificar que `media.tenor.com` está en `next.config.js`
- Limpiar caché del navegador
- Verificar conexión a internet

### Error al buscar GIFs

- Verificar que la API key es válida
- Verificar límites de rate limiting de Tenor API
- Ver logs del navegador (F12 > Console)

## Recursos

- [Tenor API Documentation](https://tenor.com/developer/documentation)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
