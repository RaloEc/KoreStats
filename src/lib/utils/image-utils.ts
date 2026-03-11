/**
 * Utilidades para el manejo de URLs de imágenes
 */

export function getPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // Si ya es una URL absoluta, retornar tal cual
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Si comienza con /, es una ruta local del proyecto
  if (path.startsWith("/")) {
    return path;
  }

  // Si parece ser una ruta de Supabase Storage (no empieza con / y no es absoluta)
  // En este proyecto, la mayoría de iconos de juegos están en el bucket 'iconos'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    // Si el path no empieza con el nombre de un bucket conocido y parece relativo,
    // prependiamos 'iconos/' ya que es el estándar para juegos en este proyecto.
    const fullPath = path.includes('/') && !path.startsWith('iconos/') ? `iconos/${path}` : path;
    return `${supabaseUrl}/storage/v1/object/public/${fullPath}`;
  }

  // Fallback: tratar como ruta local añadiendo /
  return `/${path}`;
}
