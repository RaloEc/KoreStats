export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  imagen_url?: string;
  vistas: number;
  created_at: string;
  autor_nombre?: string;
  autor_avatar?: string;
  autor_color?: string;
  votos?: number;
  comentarios_count?: number;
  mi_voto?: number | null;
  resumen?: string;
  categorias?: {
    categoria: {
      nombre: string;
      slug: string;
      color: string;
    };
  }[];
}

export interface TickerMessage {
  id: string;
  mensaje: string;
  activo: boolean;
  orden: number;
  noticia_id?: string | null;
  noticia?: {
    id: string;
    titulo: string;
    slug?: string;
    created_at: string;
  } | null;
}

export type TabType = "destacadas" | "recientes" | "populares";
