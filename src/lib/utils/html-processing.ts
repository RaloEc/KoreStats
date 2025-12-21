// Función para procesar el contenido HTML y corregir URLs de imágenes
export function procesarContenido(contenido: string): string {
  if (!contenido) return "";

  // Reemplazar URLs de blob o data por URLs de Supabase
  let contenidoProcesado = contenido;

  // Reemplazar atributos src que contengan blob: o data:
  contenidoProcesado = contenidoProcesado.replace(
    /(<img[^>]*src=["'])(?:blob:|data:)[^"']+(["'][^>]*>)/gi,
    (match, prefix, suffix) => {
      // Reemplazar con una imagen de fallback
      return `${prefix}https://placehold.co/600x400/333333/FFFFFF?text=Imagen+no+disponible${suffix}`;
    }
  );

  // Añadir atributo loading="lazy" a todas las imágenes para mejorar rendimiento
  contenidoProcesado = contenidoProcesado.replace(
    /(<img[^>]*)>/gi,
    (match, prefix) => {
      if (match.includes("loading=")) {
        return match; // Ya tiene atributo loading
      }
      return `${prefix} loading="lazy">`;
    }
  );

  // Eliminar atributos crossOrigin incorrectos
  contenidoProcesado = contenidoProcesado.replace(
    /(<img[^>]*)crossOrigin=["'][^"']*["']([^>]*>)/gi,
    (match, prefix, suffix) => {
      return `${prefix}${suffix}`;
    }
  );

  return contenidoProcesado;
}
