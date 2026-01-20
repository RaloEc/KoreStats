# Capturas de pantalla para KoreStats

Esta carpeta debe contener las capturas de pantalla que se mostrarán en la tienda de aplicaciones y durante la instalación de la PWA.

## Requisitos de las imágenes

### Para el archivo manifest.json

- **screenshot-1.png** (1280x720px) - Captura de pantalla en modo horizontal
- **screenshot-2.png** (720x1280px) - Captura de pantalla en modo vertical

### Formatos recomendados

- **Resolución mínima**: 1280x720 píxeles
- **Relación de aspecto**: 16:9 para horizontal, 9:16 para vertical
- **Formato**: PNG con transparencia si es necesario
- **Tamaño máximo**: 1MB por imagen

### Contenido recomendado

- Muestra las características principales de la aplicación
- Incluye texto descriptivo claro
- Muestra la interfaz de usuario en acción
- Usa el tema oscuro para mejor apariencia

## Cómo añadir nuevas capturas

1. Crea la captura de pantalla en la resolución adecuada
2. Optimiza la imagen para web (puedes usar herramientas como TinyPNG)
3. Guarda el archivo en esta carpeta
4. Actualiza las referencias en `manifest.json` y `site.webmanifest` si es necesario
