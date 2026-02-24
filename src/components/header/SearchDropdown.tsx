"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Newspaper, MessageCircle, Users } from "lucide-react";

interface Usuario {
  id: string;
  username: string;
  avatar_url?: string;
  public_id?: string;
  color?: string;
  rol?: string;
  bio?: string;
  tipo: "usuario";
  profile_type?: "user" | "public_profile";
  team_name?: string;
}

interface Noticia {
  id: string;
  titulo: string;
  imagen_url?: string;
  tipo: "noticia";
}

interface Hilo {
  id: string;
  titulo: string;
  tipo: "hilo";
}

type Resultado = Usuario | Noticia | Hilo;

interface SearchDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  query,
  isOpen,
  onClose,
}) => {
  const [results, setResults] = useState<Resultado[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    // Debounce mínimo de 100ms para evitar demasiadas requests
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch();
    }, 100);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const performSearch = async () => {
    try {
      const isUserSearch = query.startsWith("@");
      const searchQuery = isUserSearch ? query.substring(1) : query;

      if (isUserSearch) {
        // Solo buscar usuarios cuando comienza con @
        const usuariosRes = await fetch(
          `/api/usuarios/buscar?q=${encodeURIComponent(searchQuery)}&limit=5`,
        );
        const usuariosData = usuariosRes.ok
          ? await usuariosRes.json()
          : { usuarios: [] };

        const usuarios = (usuariosData.usuarios || []).map((u: any) => ({
          ...u,
          tipo: "usuario" as const,
        }));

        setResults(usuarios);
      } else {
        // Buscar noticias e hilos cuando NO comienza con @
        const [noticiasRes, hilosRes] = await Promise.all([
          fetch(
            `/api/noticias?busqueda=${encodeURIComponent(searchQuery)}&limit=3`,
          ),
          fetch(
            `/api/foro/hilos?buscar=${encodeURIComponent(searchQuery)}&limit=3`,
          ),
        ]);

        const noticiasData = noticiasRes.ok
          ? await noticiasRes.json()
          : { data: [] };
        const hilosData = hilosRes.ok ? await hilosRes.json() : { hilos: [] };

        const noticias = (noticiasData.data || []).map((n: any) => ({
          id: n.id,
          titulo: n.titulo,
          imagen_url: n.imagen_url,
          tipo: "noticia" as const,
        }));

        const hilos = (hilosData.hilos || []).map((h: any) => ({
          id: h.id,
          titulo: h.titulo,
          slug: h.slug,
          tipo: "hilo" as const,
        }));

        setResults([...noticias, ...hilos]);
      }
    } catch (error) {
      console.error("Error en búsqueda:", error);
      setResults([]);
    }
  };

  if (!isOpen || !query.trim() || query.length < 2) {
    return null;
  }

  const renderResultItem = (resultado: Resultado) => {
    if (resultado.tipo === "usuario") {
      const usuario = resultado as Usuario;
      const isPublicProfile = usuario.profile_type === "public_profile";
      const href = isPublicProfile
        ? `/pro/${usuario.public_id}` // public_id contiene el slug para perfiles públicos
        : `/perfil/${encodeURIComponent(usuario.public_id || usuario.username || "")}`;

      return (
        <Link
          key={`${usuario.tipo}-${usuario.id}`}
          href={href}
          onClick={onClose}
        >
          <div className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors cursor-pointer">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 dark:from-gray-800 dark:to-gray-900">
              {usuario.avatar_url ? (
                <img
                  src={usuario.avatar_url}
                  alt={usuario.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                {isPublicProfile ? (
                  <>
                    <span className="text-blue-600 dark:text-blue-400">
                      @{usuario.public_id}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 font-normal text-[11px]">
                      ({usuario.username})
                    </span>
                  </>
                ) : (
                  usuario.username
                )}
                {isPublicProfile && usuario.team_name && (
                  <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-400 font-bold uppercase transition-colors">
                    {usuario.team_name}
                  </span>
                )}
              </h4>
              {usuario.bio && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {usuario.bio}
                </p>
              )}
            </div>
            {(usuario.rol === "pro_player" || usuario.rol === "admin") && (
              <Badge
                variant="outline"
                className={`flex-shrink-0 text-[10px] font-black tracking-widest px-1.5 py-0.5 border-0 h-fit ${
                  usuario.rol === "pro_player"
                    ? "bg-blue-500/5 text-blue-500/60 dark:text-blue-400/40"
                    : "bg-amber-500/5 text-amber-500/60 dark:text-amber-400/40"
                }`}
              >
                {usuario.rol === "pro_player" ? "PRO" : "ADM"}
              </Badge>
            )}
          </div>
        </Link>
      );
    } else if (resultado.tipo === "noticia") {
      const noticia = resultado as Noticia;
      return (
        <Link
          key={`${noticia.tipo}-${noticia.id}`}
          href={`/noticias/${noticia.id}`}
          onClick={onClose}
        >
          <div className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors cursor-pointer">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 dark:from-gray-800 dark:to-gray-900">
              {noticia.imagen_url ? (
                <img
                  src={noticia.imagen_url}
                  alt={noticia.titulo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Newspaper className="w-5 h-5 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate text-sm text-gray-900 dark:text-white">
                {noticia.titulo}
              </h4>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Noticia
              </p>
            </div>
          </div>
        </Link>
      );
    } else {
      const hilo = resultado as Hilo & { slug?: string };
      return (
        <Link
          key={`${hilo.tipo}-${hilo.id}`}
          href={`/foro/hilos/${hilo.slug || hilo.id}`}
          onClick={onClose}
        >
          <div className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors cursor-pointer">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50 dark:from-gray-800 dark:to-gray-900">
              <MessageCircle className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate text-sm text-gray-900 dark:text-white">
                {hilo.titulo}
              </h4>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Hilo
              </p>
            </div>
          </div>
        </Link>
      );
    }
  };

  return (
    <motion.div
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {results.length > 0 ? (
        <motion.div
          key={`results-${results.length}`}
          className="p-2 space-y-1"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
                delayChildren: 0.05,
              },
            },
          }}
        >
          {results.map((resultado, index) => (
            <motion.div
              key={`${resultado.tipo}-${resultado.id}`}
              variants={{
                hidden: { opacity: 0, x: -10 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.15 } },
              }}
            >
              {renderResultItem(resultado)}
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          No se encontraron resultados
        </motion.div>
      )}
    </motion.div>
  );
};
