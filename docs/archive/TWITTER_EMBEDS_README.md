# Funcionalidad de Embeds de X/Twitter

## Resumen

Se ha implementado una funcionalidad completa para embeber publicaciones de X (anteriormente Twitter) en el editor TipTap, tanto para la creación de hilos como de noticias.

## Características Implementadas

### 1. API Route para oEmbed
- **Archivo**: `src/app/api/twitter/oembed/route.ts`
- **Funcionalidad**: Proxy para la API de oEmbed de Twitter/X
- **Validación**: URLs válidas de twitter.com y x.com
- **Seguridad**: Manejo de errores y validación de respuestas

### 2. Extensión TipTap
- **Archivo**: `src/components/tiptap-editor/extensions/twitter-embed.ts`
- **Funcionalidades**:
  - Comando `setTwitterEmbed()` para insertar tweets
  - Almacenamiento de URL y HTML del tweet
  - Renderizado como bloque aislado

### 3. Componente React Interactivo
- **Archivo**: `src/components/tiptap-editor/extensions/twitter-embed-component.tsx`
- **Funcionalidades**:
  - Carga asíncrona del contenido del tweet
  - Toolbar flotante con botones de abrir y eliminar
  - Estados de carga y error con reintentos
  - Carga automática del script de Twitter

### 4. Detección Automática
- **Integración**: Modificado `src/components/tiptap-editor/index.tsx`
- **Funcionalidad**: Detección automática al pegar URLs de X/Twitter
- **Patrón**: Reconoce URLs de `twitter.com` y `x.com`

### 5. Estilos CSS
- **Archivo**: `src/components/tiptap-editor/editor-styles.css`
- **Características**:
  - Diseño responsive (máx. 550px, 100% en móvil)
  - Soporte para modo claro y oscuro
  - Animaciones de carga
  - Estados de selección

## Flujo de Funcionamiento

### Inserción Automática
1. **Pegar URL**: Usuario pega enlace de X/Twitter
2. **Detección**: Editor detecta patrón de URL automáticamente
3. **Inserción**: Se crea nodo embed inmediatamente
4. **Carga**: Componente carga contenido de forma asíncrona

### Carga del Tweet
1. **Petición**: Llama a `/api/twitter/oembed?url=...`
2. **Proxy**: API route hace petición a Twitter oEmbed
3. **Renderizado**: Inserta HTML del tweet en el DOM
4. **Script**: Carga `platform.twitter.com/widgets.js`
5. **Procesamiento**: Twitter procesa y estiliza el embed

### Interacción
- **Selección**: Clic en tweet muestra toolbar
- **Abrir**: Botón para abrir tweet en X/Twitter
- **Eliminar**: Botón para remover embed
- **Reintento**: En caso de error, botón para volver a intentar

## URLs Soportadas

### Formatos Válidos
```
https://twitter.com/usuario/status/1234567890
https://x.com/usuario/status/1234567890
https://www.twitter.com/usuario/status/1234567890
https://www.x.com/usuario/status/1234567890
```

### Detección Automática
- **Patrón**: `/https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/g`
- **Pegado**: Funciona al pegar texto que contenga URL válida
- **Prevención**: Evita procesamiento de imágenes si detecta URL

## Estructura HTML Generada

```html
<div class="twitter-embed-container" data-type="twitter-embed" data-url="...">
  <blockquote class="twitter-tweet">
    <!-- Contenido del tweet generado por Twitter -->
  </blockquote>
  <script async src="https://platform.twitter.com/widgets.js"></script>
</div>
```

## Estados del Componente

### 1. Carga
```tsx
<div className="twitter-embed-loading">
  <RefreshCw className="animate-spin" />
  <span>Cargando tweet...</span>
</div>
```

### 2. Error
```tsx
<div className="twitter-embed-error">
  <span>⚠️ No se pudo cargar el tweet</span>
  <Button onClick={handleRetry}>Reintentar</Button>
</div>
```

### 3. Éxito
```tsx
<div className="twitter-embed-content">
  {/* HTML del tweet procesado por Twitter */}
</div>
```

## Beneficios

1. **UX Intuitiva**: Funciona igual que YouTube, solo pegar URL
2. **Carga Asíncrona**: No bloquea el editor mientras carga
3. **Manejo de Errores**: Reintentos y mensajes claros
4. **Responsive**: Se adapta a diferentes tamaños de pantalla
5. **Accesible**: Mantiene funcionalidad nativa de Twitter
6. **Performante**: Carga script solo una vez por página

## Archivos Creados/Modificados

### Nuevos Archivos
- `src/app/api/twitter/oembed/route.ts`
- `src/components/tiptap-editor/extensions/twitter-embed.ts`
- `src/components/tiptap-editor/extensions/twitter-embed-component.tsx`

### Archivos Modificados
- `src/components/tiptap-editor/extensions.ts`
- `src/components/tiptap-editor/index.tsx`
- `src/components/tiptap-editor/editor-styles.css`

## Uso

### Para Usuarios
1. Copiar URL de un tweet desde X/Twitter
2. Pegar en el editor (automáticamente se convierte en embed)
3. El tweet se carga y muestra con estilos nativos de Twitter

### Para Desarrolladores
```typescript
// Insertar tweet programáticamente
editor.chain().focus().setTwitterEmbed({
  url: 'https://twitter.com/usuario/status/1234567890'
}).run()
```

## Consideraciones Técnicas

### Seguridad
- Validación de URLs en backend
- Sanitización de respuestas de API
- Manejo seguro de `dangerouslySetInnerHTML`

### Rendimiento
- Carga asíncrona de contenido
- Script de Twitter cargado solo una vez
- Caché del navegador para embeds repetidos

### Compatibilidad
- Funciona con URLs de `twitter.com` y `x.com`
- Compatible con modo claro y oscuro
- Responsive en dispositivos móviles

## Estado de Implementación

✅ **Completado**:
- API route para oEmbed
- Extensión TipTap personalizada
- Componente React interactivo
- Detección automática de URLs
- Estilos CSS completos
- Manejo de errores y estados de carga

La funcionalidad está lista para usar en producción y permite embeber tweets de X/Twitter de forma automática y elegante.
