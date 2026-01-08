// =================================================================
// PERFILES Y USUARIOS
// =================================================================

export type Perfil = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: "admin" | "moderator" | "user";
  color: string | null;
  bio?: string | null;
  ubicacion?: string | null;
  sitio_web?: string | null;
  activo?: boolean;
  fecha_ultimo_acceso?: string | null;
  // Nuevos campos para admin de usuarios
  email_verificado?: boolean;
  racha_dias?: number;
  badges?: any[];
  notas_moderador?: string;
  ip_registro?: string;
  // Contadores sociales
  followers_count?: number;
  following_count?: number;
  friends_count?: number;
};

export type UsuarioCompleto = {
  id: string;
  email: string | undefined;
  created_at: string;
  updated_at?: string | null;
  perfil: Perfil | null;
  user_metadata?: {
    avatar_url?: string;
    picture?: string;
    full_name?: string;
    name?: string;
  };
  auth_id?: string | null;
  last_sign_in_at?: string | null;
};

// =================================================================
// FORO
// =================================================================

export type CategoriaForo = {
  id: string;
  nombre: string;
  descripcion: string;
  slug: string;
  color: string | null;
  icono: string | null;
  parent_id: string | null;
  nivel: number | null;
  orden: number | null;
  es_activa: boolean;
  subcategorias?: CategoriaForo[];
};

export type Hilo = {
  id: string;
  titulo: string;
  contenido: string;
  fecha_creacion: string;
  autor_id: string;
  categoria_id: string;
  fijado: boolean;
  cerrado: boolean;
  vistas: number;
  imagen_url?: string;
  // Relaciones
  autor: Perfil | null;
  categoria: Pick<CategoriaForo, "nombre" | "slug"> | null;
};

export type Post = {
  id: string;
  contenido: string;
  fecha_creacion: string;
  autor_id: string;
  hilo_id: string;
  // Relaciones
  autor: Perfil | null;
};

// =================================================================
// NOTICIAS
// =================================================================

export type CategoriaNoticia = {
  id: string | number;
  nombre: string;
  slug: string;
  parent_id?: string | number | null;
  descripcion?: string | null;
  orden?: number | null;
  color?: string | null;
  icono?: string | null;
  tipo?: string;
  hijos?: CategoriaNoticia[];
};

export type Noticia = {
  id: string | number;
  titulo: string;
  contenido: string;
  fecha_publicacion: string;
  created_at?: string;
  autor_id: string;
  categoria_id: number;
  slug: string;
  imagen_url: string | null;
  imagen_portada?: string | null; // Campo alternativo para la imagen
  fuentes?: string[] | null; // Fuentes de la noticia
  fuente?: string | null; // Deprecated: Mantener por compatibilidad temporal
  vistas?: number;
  comentarios_count?: number;
  type?: string; // Tipo de noticia (ej: 'lol_patch')
  data?: any; // Datos adicionales (ej: datos del parche)
  // Relaciones
  autor: Perfil | null;
  categoria: CategoriaNoticia | null;
  // Propiedad para múltiples categorías (añadida por la API)
  categorias?: CategoriaNoticia[];
  // Propiedades adicionales que devuelve la API
  autor_nombre?: string;
  autor_color?: string;
  autor_avatar?: string | null;
  autor_rol?: "admin" | "moderator" | "user";
  resumen?: string;
  estado?: "borrador" | "publicada" | "programada";
  destacada?: boolean;
};

// =================================================================
// SERVIDORES
// =================================================================

export type Servidor = {
  id: string;
  nombre: string;
  direccion_ip: string;
  puerto: number;
  descripcion: string;
  version: string;
  tipo: "survival" | "creativo" | "minijuegos" | "otro";
  web_url: string | null;
  discord_url: string | null;
  banner_url: string | null;
  online: boolean;
  jugadores_actuales: number;
  jugadores_maximos: number;
  agregado_por: string;
  // Relaciones
  propietario: Perfil | null;
};

export type SolicitudServidor = {
  id: string;
  nombre_servidor: string;
  direccion_ip: string;
  puerto: number;
  descripcion: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  solicitante_id: string;
  fecha_solicitud: string;
  // Relaciones
  solicitante: Perfil | null;
};

// =================================================================
// WIKI
// =================================================================

export type WikiArticulo = {
  id: string;
  titulo: string;
  contenido: string;
  slug: string;
  categoria: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  autor_id: string;
  // Relaciones
  autor: Perfil | null;
};

// =================================================================
// RECURSOS (Texturas, Shaders, Mods)
// =================================================================

interface RecursoBase {
  id: string;
  nombre: string;
  descripcion: string;
  url_descarga: string;
  url_imagen: string | null;
  version_mc: string;
  autor_id: string;
  // Relaciones
  autor: Perfil | null;
}

export type Textura = RecursoBase & {
  resolucion: "16x" | "32x" | "64x" | "128x" | "256x" | "512x+";
};

export type Shader = RecursoBase & {
  rendimiento: "bajo" | "medio" | "alto";
};

export type Mod = RecursoBase & {
  tipo: "forge" | "fabric" | "rift" | "otro";
  dependencias: string | null;
};

// =================================================================
// COMENTARIOS
// =================================================================

export interface Comentario {
  id: string;
  content_type: "noticia" | "hilo";
  content_id: string;
  author_id: string;
  text: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  autor: Perfil | null;
  replies: Comentario[];
  // Información de respuesta citada
  repliedTo?: {
    id: string;
    author: string;
    text: string;
  };
}

// =================================================================
// SOCIAL - Re-exportar tipos sociales
// =================================================================
export * from "./social";
