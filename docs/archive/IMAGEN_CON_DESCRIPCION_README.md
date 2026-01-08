# Funcionalidad de Imágenes con Descripción

## Resumen

Se ha implementado una funcionalidad completa para agregar descripciones a las imágenes en el editor TipTap, tanto para la creación de hilos como de noticias.

## Características Implementadas

### 1. Extensión Personalizada de TipTap
- **Archivo**: `src/components/tiptap-editor/extensions/image-with-caption.ts`
- **Funcionalidad**: Extensión que maneja imágenes usando estructura `<figure>/<figcaption>`
- **Comando**: `setImageWithCaption()` para insertar imágenes con descripción

### 2. Componente React Interactivo
- **Archivo**: `src/components/tiptap-editor/extensions/image-with-caption-component.tsx`
- **Funcionalidades**:
  - Edición inline de descripciones
  - Redimensionado de imágenes con mouse (drag desde esquina inferior derecha)
  - Toolbar flotante con botones de editar y eliminar
  - Estados de edición con input y botones de guardar/cancelar
  - Placeholder cuando no hay descripción
  - Indicador visual de redimensionado

### 3. Integración en el Editor
- **Archivos Modificados**:
  - `src/components/tiptap-editor/extensions.ts`: Registro de la nueva extensión
  - `src/components/tiptap-editor/index.tsx`: Uso del comando `setImageWithCaption`

### 4. Estilos CSS
- **Archivo**: `src/components/tiptap-editor/editor-styles.css`
- **Estilos Añadidos**:
  - `.image-with-caption-figure`: Contenedor principal
  - `.image-caption`: Descripción con estilo cursivo y sutil
  - Estados de selección y hover
  - Soporte para modo claro y oscuro

## Flujo de Funcionamiento

### Subida de Imágenes
1. **Desde archivos**: Al seleccionar una imagen, se sube a Supabase y se inserta con `setImageWithCaption`
2. **Desde portapapeles**: Al pegar una imagen, se procesa y se inserta automáticamente
3. **Procesamiento**: `processEditorContent` preserva las estructuras `figure/figcaption`

### Edición de Descripciones
1. **Agregar descripción**: Clic en el placeholder o botón de editar
2. **Editar existente**: Clic en la descripción o botón de editar
3. **Guardar**: Enter o botón de check
4. **Cancelar**: Escape o botón de X

### Redimensionado de Imágenes
1. **Seleccionar imagen**: Clic en la imagen para mostrar controles
2. **Redimensionar**: Drag desde el indicador azul en la esquina inferior derecha
3. **Proporción**: Se mantiene automáticamente la relación de aspecto
4. **Dimensiones**: Se preservan automáticamente en los atributos width/height

### Alineación de Imágenes
1. **Seleccionar imagen**: Clic en la imagen para mostrar toolbar
2. **Alinear**: Usar botones de alineación (izquierda, centro, derecha)
3. **Visual**: La imagen y descripción se alinean juntas

### Renderizado
- **En editor**: Componente React interactivo con controles
- **En lectura**: HTML estándar `<figure><img><figcaption>`
- **Estilos**: Descripción cursiva, centrada, color sutil

## Estructura HTML Generada

```html
<figure class="image-with-caption-figure" data-type="image-with-caption">
  <img src="https://supabase-url.com/image.jpg" alt="Nombre del archivo" class="editor-image">
  <figcaption class="image-caption">Descripción de la imagen</figcaption>
</figure>
```

## Compatibilidad

### Almacenamiento
- Las descripciones se guardan como parte del contenido HTML
- No requiere campos adicionales en la base de datos
- Compatible con el sistema actual de procesamiento de imágenes

### Renderizado
- Funciona en hilos y noticias
- Compatible con el sistema de colores personalizados del usuario
- Responsive y accesible

## Beneficios

1. **UX Mejorada**: Interfaz intuitiva para agregar descripciones
2. **Accesibilidad**: Mejor soporte para lectores de pantalla
3. **SEO**: Descripciones mejoran el SEO de las imágenes
4. **Consistencia**: Estilo uniforme en toda la aplicación
5. **Flexibilidad**: Descripciones opcionales, no obligatorias

## Archivos Creados/Modificados

### Nuevos Archivos
- `src/components/tiptap-editor/extensions/image-with-caption.ts`
- `src/components/tiptap-editor/extensions/image-with-caption-component.tsx`

### Archivos Modificados
- `src/components/tiptap-editor/extensions.ts`
- `src/components/tiptap-editor/index.tsx`
- `src/components/tiptap-editor/editor-styles.css`
- `src/components/tiptap-editor/processImages.ts`

## Uso

### Para Usuarios
1. Subir imagen (archivo o pegar)
2. Clic en "Clic para agregar una descripción..." o en una descripción existente
3. Escribir la descripción
4. Presionar Enter o clic en ✓ para guardar

### Para Desarrolladores
```typescript
// Insertar imagen con descripción
editor.chain().focus().setImageWithCaption({
  src: 'url-de-la-imagen',
  alt: 'Texto alternativo',
  title: 'Título',
  caption: 'Descripción opcional'
}).run()
```

## Estado de Implementación

✅ **Completado**:
- Extensión personalizada de TipTap
- Componente React interactivo
- Integración en manejadores de subida
- Estilos CSS completos
- Preservación en processEditorContent

La funcionalidad está lista para usar en producción.
