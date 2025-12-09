"use client";

import { useEffect, useRef, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useNoticia } from "@/components/noticias/hooks/useNoticia";
import {
  NoticiaErrorBoundary,
  NoticiaLoading,
} from "@/components/noticias/NoticiaLoading";
import NoticiaCabecera from "@/components/noticias/NoticiaCabecera";
import NoticiaAutor from "@/components/noticias/NoticiaAutor";
import NoticiaImagen from "@/components/noticias/NoticiaImagen";
import NoticiaContenido from "@/components/noticias/NoticiaContenido";
import NoticiaCategorias from "@/components/noticias/NoticiaCategorias";
import NoticiasRelacionadas from "@/components/noticias/NoticiasRelacionadas";
import NoticiaComentariosOptimizado from "@/components/noticias/NoticiaComentariosOptimizado";
import LolPatchContent from "@/components/noticias/LolPatchContent";

// Estilos para el scrollbar
const scrollbarStyles = `
  .comentarios-container::-webkit-scrollbar {
    width: 8px;
  }
  
  .comentarios-container::-webkit-scrollbar-track {
    background: hsl(var(--muted));
    border-radius: 4px;
  }
  
  .comentarios-container::-webkit-scrollbar-thumb {
    background-color: hsl(var(--primary) / 0.3);
    border-radius: 4px;
  }
  
  .comentarios-container::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--primary) / 0.5);
  }
`;

export default function NoticiaDetalle({ params }: { params: { id: string } }) {
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const hasCountedView = useRef(false);

  // Usar el hook personalizado para obtener la noticia
  const {
    noticia,
    noticiasRelacionadas,
    isLoading,
    isLoadingRelacionadas,
    isError,
    error,
  } = useNoticia(params.id);

  // Verificar si hay un usuario autenticado (una sola vez al cargar)
  useEffect(() => {
    const checkUsuario = async () => {
      try {
        setCargandoAuth(true);
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setUsuario(session.user);

          // Verificar si el usuario es administrador
          try {
            const { data: perfil } = await supabase
              .from("perfiles")
              .select("role")
              .eq("id", session.user.id)
              .single();

            if (perfil?.role === "admin") {
              setEsAdmin(true);
            }
          } catch (error) {
            console.error("Error al verificar usuario:", error);
          }
        }
      } catch (error) {
        console.error("Error al verificar usuario:", error);
      } finally {
        setCargandoAuth(false);
      }
    };

    checkUsuario();
  }, []);

  // Incrementar vistas de la noticia una sola vez cuando esté cargada
  useEffect(() => {
    const incrementarVista = async () => {
      // Verificar si ya se incrementó en esta sesión
      const sessionKey = `vista_contada_${params.id}`;
      const yaContado = sessionStorage.getItem(sessionKey);

      if (hasCountedView.current || yaContado) {
        console.log("⚠️ Vista ya contada para esta noticia en esta sesión");
        return;
      }

      try {
        console.log("👁️ Incrementando vista para noticia:", params.id);
        const supabase = createClient();
        const { data, error } = await supabase.rpc(
          "incrementar_vista_noticia",
          {
            noticia_id: params.id,
          }
        );

        if (error) {
          console.error("❌ Error al incrementar vista:", error);
          return;
        }

        console.log("✅ Vista incrementada exitosamente. Nuevo total:", data);
        hasCountedView.current = true;
        sessionStorage.setItem(sessionKey, "true");
      } catch (e) {
        console.error("❌ Error al incrementar vista de noticia:", e);
      }
    };

    // Ejecutar tras montar con un pequeño delay para evitar doble ejecución
    const timer = setTimeout(incrementarVista, 100);

    return () => clearTimeout(timer);
  }, [params.id]);

  // Mostrar estado de carga
  if (isLoading) {
    return <NoticiaLoading />;
  }

  // Mostrar error si lo hay
  if (isError || !noticia) {
    return (
      <NoticiaLoading
        error={
          error instanceof Error ? error.message : "Error al cargar la noticia"
        }
      />
    );
  }

  return (
    <NoticiaErrorBoundary>
      <div className="min-h-screen bg-background">
        <style jsx global>
          {scrollbarStyles}
        </style>
        <main className="container py-4 px-4">
          {/* Cabecera con título y botón de volver */}
          <NoticiaCabecera
            titulo={noticia.titulo}
            descripcion={
              noticia.contenido?.substring(0, 160).replace(/<[^>]*>/g, "") || ""
            }
            esAdmin={esAdmin}
            noticiaId={params.id}
          />

          {/* Información del autor */}
          <NoticiaAutor
            nombre={noticia.autor_nombre || ""}
            avatar={noticia.autor_avatar}
            color={noticia.autor_color}
            rol={noticia.autor_rol}
            fecha={noticia.fecha_publicacion}
            vistas={(noticia as any).vistas || 0}
          />

          {/* Imagen de portada */}
          {(noticia.imagen_url || noticia.imagen_portada) && (
            <NoticiaImagen
              src={noticia.imagen_url || noticia.imagen_portada || ""}
              alt={noticia.titulo}
              priority={true}
            />
          )}

          {/* Contenido de la noticia */}
          <NoticiaContenido contenido={noticia.contenido} />

          {/* Contenido especial para parches de LoL */}
          {noticia.type === "lol_patch" && noticia.data && (
            <div className="max-w-4xl mx-auto mb-8">
              <LolPatchContent data={noticia.data} />
            </div>
          )}

          {/* Divisor después del contenido */}
          <div className="max-w-4xl mx-auto mb-8">
            <Separator className="my-4" />
          </div>

          {/* Temas relacionados */}
          <NoticiaCategorias
            categoria={noticia.categoria}
            categorias={noticia.categorias}
          />

          {/* Noticias relacionadas */}
          <NoticiasRelacionadas
            noticias={noticiasRelacionadas}
            isLoading={isLoadingRelacionadas}
          />

          {/* Divisor antes de comentarios */}
          <div className="max-w-4xl mx-auto mb-8">
            <Separator className="my-4" />
          </div>

          {/* Sección de comentarios */}
          <NoticiaComentariosOptimizado noticiaId={noticia.id.toString()} />
        </main>
      </div>
    </NoticiaErrorBoundary>
  );
}
