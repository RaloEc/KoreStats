// Tipos e interfaces para el módulo de eventos

export interface Juego {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string | null;
  imagen_portada_url?: string | null;
  icono_url?: string | null;
  fecha_lanzamiento?: string | null;
  desarrollador?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface JuegoListado extends Juego {
  iconoPublicUrl: string | null;
}

export type JuegoRow = {
  id: string;
  nombre: string;
  slug: string;
  icono_url: string | null;
  descripcion: string | null;
  desarrollador: string | null;
  fecha_lanzamiento: string | null;
};

export type TipoEvento = "actualizacion" | "parche" | "evento" | "torneo";
export type EstadoEvento = "borrador" | "publicado" | "cancelado";
export type TipoIcono = "juego_existente" | "personalizado";
