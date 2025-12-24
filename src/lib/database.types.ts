export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string;
          nombre: string;
          slug: string;
          descripcion: string | null;
          color: string | null;
          icono: string | null;
          orden: number | null;
          creado_en: string;
          actualizado_en: string | null;
          categoria_padre_id: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          slug: string;
          descripcion?: string | null;
          color?: string | null;
          icono?: string | null;
          orden?: number | null;
          creado_en?: string;
          actualizado_en?: string | null;
          categoria_padre_id?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          slug?: string;
          descripcion?: string | null;
          color?: string | null;
          icono?: string | null;
          orden?: number | null;
          creado_en?: string;
          actualizado_en?: string | null;
          categoria_padre_id?: string | null;
        };
      };
      perfiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          ubicacion: string | null;
          sitio_web: string | null;
          role: string;
          activo: boolean;
          fecha_ultimo_acceso: string | null;
          creado_en: string;
          actualizado_en: string | null;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          ubicacion?: string | null;
          sitio_web?: string | null;
          role?: string;
          activo?: boolean;
          fecha_ultimo_acceso?: string | null;
          creado_en?: string;
          actualizado_en?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          ubicacion?: string | null;
          sitio_web?: string | null;
          role?: string;
          activo?: boolean;
          fecha_ultimo_acceso?: string | null;
          creado_en?: string;
          actualizado_en?: string | null;
        };
      };
      noticias: {
        Row: {
          id: string;
          titulo: string;
          slug: string;
          contenido: Json;
          resumen: string | null;
          imagen_principal: string | null;
          autor_id: string;
          estado: string;
          publicada_en: string | null;
          creada_en: string;
          actualizada_en: string | null;
          vistas: number;
        };
        Insert: {
          id?: string;
          titulo: string;
          slug: string;
          contenido: Json;
          resumen?: string | null;
          imagen_principal?: string | null;
          autor_id: string;
          estado?: string;
          publicada_en?: string | null;
          creada_en?: string;
          actualizada_en?: string | null;
          vistas?: number;
        };
        Update: {
          id?: string;
          titulo?: string;
          slug?: string;
          contenido?: Json;
          resumen?: string | null;
          imagen_principal?: string | null;
          autor_id?: string;
          estado?: string;
          publicada_en?: string | null;
          creada_en?: string;
          actualizada_en?: string | null;
          vistas?: number;
        };
      };
      noticias_categorias: {
        Row: {
          noticia_id: string;
          categoria_id: string;
        };
        Insert: {
          noticia_id: string;
          categoria_id: string;
        };
        Update: {
          noticia_id?: string;
          categoria_id?: string;
        };
      };
      foro_categorias: {
        Row: {
          id: string;
          nombre: string;
          slug: string;
          descripcion: string | null;
          color: string | null;
          icono: string | null;
          orden: number;
          creado_en: string;
          actualizado_en: string | null;
          categoria_padre_id: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          slug: string;
          descripcion?: string | null;
          color?: string | null;
          icono?: string | null;
          orden?: number;
          creado_en?: string;
          actualizado_en?: string | null;
          categoria_padre_id?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          slug?: string;
          descripcion?: string | null;
          color?: string | null;
          icono?: string | null;
          orden?: number;
          creado_en?: string;
          actualizado_en?: string | null;
          categoria_padre_id?: string | null;
        };
      };
      foro_hilos: {
        Row: {
          id: string;
          titulo: string;
          contenido: string;
          autor_id: string;
          categoria_id: string;
          estado: "abierto" | "cerrado" | "fijado" | "oculto";
          es_importante: boolean;
          vistas: number;
          creado_en: string;
          actualizado_en: string | null;
          ultimo_post_id: string | null;
          slug: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          contenido: string;
          autor_id: string;
          categoria_id: string;
          estado?: "abierto" | "cerrado" | "fijado" | "oculto";
          es_importante?: boolean;
          vistas?: number;
          creado_en?: string;
          actualizado_en?: string | null;
          ultimo_post_id?: string | null;
          slug: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          contenido?: string;
          autor_id?: string;
          categoria_id?: string;
          estado?: "abierto" | "cerrado" | "fijado" | "oculto";
          es_importante?: boolean;
          vistas?: number;
          creado_en?: string;
          actualizado_en?: string | null;
          ultimo_post_id?: string | null;
          slug?: string;
        };
      };
      foro_posts: {
        Row: {
          id: string;
          contenido: string;
          autor_id: string;
          hilo_id: string;
          creado_en: string;
          actualizado_en: string | null;
          editado_por: string | null;
          es_respuesta: boolean;
          post_padre_id: string | null;
        };
        Insert: {
          id?: string;
          contenido: string;
          autor_id: string;
          hilo_id: string;
          creado_en?: string;
          actualizado_en?: string | null;
          editado_por?: string | null;
          es_respuesta?: boolean;
          post_padre_id?: string | null;
        };
        Update: {
          id?: string;
          contenido?: string;
          autor_id?: string;
          hilo_id?: string;
          creado_en?: string;
          actualizado_en?: string | null;
          editado_por?: string | null;
          es_respuesta?: boolean;
          post_padre_id?: string | null;
        };
      };
      foro_reacciones: {
        Row: {
          id: string;
          post_id: string;
          usuario_id: string;
          tipo: string;
          creado_en: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          usuario_id: string;
          tipo: string;
          creado_en?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          usuario_id?: string;
          tipo?: string;
          creado_en?: string;
        };
      };
      foro_seguimiento: {
        Row: {
          id: string;
          usuario_id: string;
          hilo_id: string;
          ultima_vista: string | null;
          notificaciones_activas: boolean;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          hilo_id: string;
          ultima_vista?: string | null;
          notificaciones_activas?: boolean;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          hilo_id?: string;
          ultima_vista?: string | null;
          notificaciones_activas?: boolean;
        };
      };
      foro_votos_hilos: {
        Row: {
          hilo_id: string;
          usuario_id: string;
          valor_voto: number;
          created_at: string;
        };
        Insert: {
          hilo_id: string;
          usuario_id: string;
          valor_voto: number;
          created_at?: string;
        };
        Update: {
          hilo_id?: string;
          usuario_id?: string;
          valor_voto?: number;
          created_at?: string;
        };
      };
      social_posts: {
        Row: {
          id: string;
          user_id: string;
          target_user_id: string | null;
          content: string | null;
          media_url: string | null;
          media_type: "image" | "video" | "youtube" | null;
          created_at: string;
          updated_at: string | null;
          likes_count: number;
          comments_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_user_id?: string | null;
          content?: string | null;
          media_url?: string | null;
          media_type?: "image" | "video" | "youtube" | null;
          created_at?: string;
          updated_at?: string | null;
          likes_count?: number;
          comments_count?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          target_user_id?: string | null;
          content?: string | null;
          media_url?: string | null;
          media_type?: "image" | "video" | "youtube" | null;
          created_at?: string;
          updated_at?: string | null;
          likes_count?: number;
          comments_count?: number;
        };
      };
      social_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Categoria = Tables<"categorias">;
export type Perfil = Tables<"perfiles">;
export type Noticia = Tables<"noticias">;
export type NoticiaCategoria = Tables<"noticias_categorias">;

export type ForoCategoria = Tables<"foro_categorias">;
export type ForoHilo = Tables<"foro_hilos">;
export type ForoPost = Tables<"foro_posts">;
export type ForoReaccion = Tables<"foro_reacciones">;
export type ForoSeguimiento = Tables<"foro_seguimiento">;
