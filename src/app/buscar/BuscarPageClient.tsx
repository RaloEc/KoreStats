"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Newspaper,
  MessageCircle,
  Users,
  Clock,
  Eye,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Force rebuild - v6

interface ResultadoBusqueda {
  id: string;
  titulo?: string;
  contenido?: string;
  tipo: "noticia" | "hilo" | "usuario";
  created_at?: string;
  vistas?: number;
  autor_nombre?: string;
  autor_color?: string;
  categoria?: {
    nombre: string;
    color: string;
  };
  imagen_url?: string;
  username?: string;
  avatar_url?: string;
  public_id?: string;
  color?: string;
  rol?: string;
  bio?: string;
  followers_count?: number;
  hilos_count?: number;
  profile_type?: "user" | "public_profile";
}

function BuscarContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const [noticias, setNoticias] = useState<ResultadoBusqueda[]>([]);
  const [hilos, setHilos] = useState<ResultadoBusqueda[]>([]);
  const [usuarios, setUsuarios] = useState<ResultadoBusqueda[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "todos" | "noticias" | "hilos" | "usuarios"
  >("todos");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (queryParam) {
      performSearch(queryParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParam, mounted]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const isUserSearch = searchQuery.startsWith("@");
      const queryToSearch = isUserSearch
        ? searchQuery.substring(1)
        : searchQuery;

      if (isUserSearch) {
        const res = await fetch(
          `/api/usuarios/buscar?q=${encodeURIComponent(queryToSearch)}`,
        );
        const data = res.ok ? await res.json() : { usuarios: [] };

        const usuariosData = (data.usuarios || []).map((item: any) => ({
          ...item,
          tipo: "usuario" as const,
          id: item.id,
          titulo: item.username,
        }));

        setNoticias([]);
        setHilos([]);
        setUsuarios(usuariosData);
        setActiveTab("usuarios");
      } else {
        const [noticiasRes, hilosRes] = await Promise.all([
          fetch(
            `/api/noticias?busqueda=${encodeURIComponent(
              queryToSearch,
            )}&limit=20`,
          ),
          fetch(
            `/api/foro/hilos?buscar=${encodeURIComponent(
              queryToSearch,
            )}&limit=20`,
          ),
        ]);

        const noticiasData = noticiasRes.ok
          ? await noticiasRes.json()
          : { data: [] };
        const hilosData = hilosRes.ok ? await hilosRes.json() : { items: [] };

        setNoticias(
          noticiasData.data?.map((item: any) => ({
            ...item,
            tipo: "noticia" as const,
          })) || [],
        );
        setHilos(
          hilosData.items?.map((item: any) => ({
            ...item,
            tipo: "hilo" as const,
          })) || [],
        );
        setUsuarios([]);
        setActiveTab("todos");
      }
    } catch (error) {
      console.error("Error en búsqueda:", error);
    } finally {
      setLoading(false);
    }
  };

  const getExcerpt = (contenido: string, maxLength: number = 150) => {
    const plainText = contenido.replace(/<[^>]*>/g, "");
    return plainText.length > maxLength
      ? `${plainText.substring(0, maxLength)}...`
      : plainText;
  };

  const ResultadoCard = ({ resultado }: { resultado: ResultadoBusqueda }) => {
    let href = "";

    if (resultado.tipo === "noticia") {
      href = `/noticias/${resultado.id}`;
    } else if (resultado.tipo === "hilo") {
      href = `/foro/hilos/${resultado.id}`;
    } else {
      // Usuario
      const isPublicProfile = resultado.profile_type === "public_profile";
      href = isPublicProfile
        ? `/pro/${resultado.public_id}`
        : `/perfil/${encodeURIComponent(
            resultado.public_id || resultado.username || "",
          )}`;
    }

    if (resultado.tipo === "usuario") {
      return (
        <Link href={href}>
          <article className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 hover:shadow-md dark:hover:shadow-black/30 group">
            <div className="flex items-start gap-5">
              {/* Avatar más grande */}
              <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 dark:from-gray-900 dark:to-black">
                {resultado.avatar_url ? (
                  <img
                    src={resultado.avatar_url}
                    alt={resultado.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl">👤</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Nombre y rol */}
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-bold text-lg group-hover:opacity-80 transition-opacity truncate"
                      style={{ color: resultado.color || "#3b82f6" }}
                    >
                      {resultado.username}
                    </h3>
                  </div>
                  {resultado.rol && resultado.rol !== "user" && (
                    <Badge
                      className={`flex-shrink-0 border ${
                        resultado.rol === "pro_player"
                          ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                          : resultado.rol === "streamer"
                            ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:bg-amber-500/10"
                      }`}
                    >
                      {resultado.rol === "admin"
                        ? "👑 Admin"
                        : resultado.rol === "moderator"
                          ? "🛡️ Mod"
                          : resultado.rol === "pro_player"
                            ? "PRO"
                            : resultado.rol === "streamer"
                              ? "LIVE"
                              : resultado.rol}
                    </Badge>
                  )}
                </div>

                {/* Biografía */}
                {resultado.bio && resultado.bio.trim() && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {resultado.bio}
                  </p>
                )}

                {/* Estadísticas */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {resultado.followers_count || 0}
                    </span>
                    <span>seguidores</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {resultado.hilos_count || 0}
                    </span>
                    <span>hilos</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </Link>
      );
    }

    return (
      <Link href={href}>
        <article className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 hover:shadow-lg dark:hover:shadow-black/50 group">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-black rounded-lg overflow-hidden flex items-center justify-center">
              {resultado.imagen_url ? (
                <img
                  src={resultado.imagen_url}
                  alt={resultado.titulo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-2xl">
                  {resultado.tipo === "noticia" ? "📰" : "💬"}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-gray-900 dark:text-white">
                  {resultado.titulo}
                </h3>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {resultado.categoria && (
                    <Badge
                      variant="outline"
                      className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      style={{ borderColor: resultado.categoria.color }}
                    >
                      {resultado.categoria.nombre}
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                {getExcerpt(resultado.contenido || "")}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                <div className="flex items-center gap-4">
                  {resultado.autor_nombre && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span
                        className="font-medium"
                        style={{ color: resultado.autor_color || undefined }}
                      >
                        {resultado.autor_nombre}
                      </span>
                    </div>
                  )}
                  {resultado.created_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(resultado.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {resultado.vistas && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{resultado.vistas}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  };

  const todosLosResultados = [...noticias, ...hilos, ...usuarios];
  const totalResultados = todosLosResultados.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        {queryParam && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Resultados de búsqueda
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {loading
                  ? "Buscando..."
                  : `${totalResultados} resultados para "${queryParam}"`}
              </p>
            </div>

            <div className="space-y-6">
              {/* Tabs Navigation */}
              <div className="border-b border-gray-200 dark:border-gray-800">
                <div className="flex gap-8">
                  <button
                    onClick={() => setActiveTab("todos")}
                    className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                      activeTab === "todos"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>Todos</span>
                      <span className="text-xs">({totalResultados})</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("noticias")}
                    className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                      activeTab === "noticias"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4" />
                      <span>Noticias</span>
                      <span className="text-xs">({noticias.length})</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("hilos")}
                    className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                      activeTab === "hilos"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>Foro</span>
                      <span className="text-xs">({hilos.length})</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("usuarios")}
                    className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                      activeTab === "usuarios"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Usuarios</span>
                      <span className="text-xs">({usuarios.length})</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeTab === "todos" && (
                  <>
                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-900 rounded-lg" />
                              <div className="flex-1 space-y-2">
                                <div className="h-6 bg-gray-200 dark:bg-gray-900 rounded w-3/4" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-900 rounded w-full" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-900 rounded w-2/3" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : todosLosResultados.length > 0 ? (
                      todosLosResultados.map((resultado) => (
                        <ResultadoCard
                          key={`${resultado.tipo}-${resultado.id}`}
                          resultado={resultado}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          No se encontraron resultados
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Intenta con otros términos de búsqueda
                        </p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "noticias" && (
                  <>
                    {noticias.length > 0 ? (
                      noticias.map((resultado) => (
                        <ResultadoCard
                          key={resultado.id}
                          resultado={resultado}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📰</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          No se encontraron noticias
                        </h3>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "hilos" && (
                  <>
                    {hilos.length > 0 ? (
                      hilos.map((resultado) => (
                        <ResultadoCard
                          key={resultado.id}
                          resultado={resultado}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">💬</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          No se encontraron hilos del foro
                        </h3>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "usuarios" && (
                  <>
                    {usuarios.length > 0 ? (
                      usuarios.map((resultado) => (
                        <ResultadoCard
                          key={resultado.id}
                          resultado={resultado}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">👤</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          No se encontraron usuarios
                        </h3>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!queryParam && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Buscar en KoreStats
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Encuentra estadísticas, hilos del foro, usuarios y más contenido
              de la comunidad
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
              💡 Tip: Usa{" "}
              <span className="font-mono bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                @nombre
              </span>{" "}
              para buscar usuarios
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuscarPageClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="min-h-screen bg-gray-50 dark:bg-black" />;
  }

  return <BuscarContent />;
}
