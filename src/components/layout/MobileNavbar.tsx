"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  Flame,
  Plus,
  Bell,
  User,
  Shield,
  LogOut,
  LogIn,
  UserPlus,
  X,
  Moon,
  Sun,
  MessageSquare,
  Search,
  Newspaper,
  MessageCircle,
  Users,
  Clock,
  TrendingUp,
  Star,
  Filter,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { differenceInHours, differenceInDays, format } from "date-fns";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import "./mobile-navbar.css";

interface MobileNavbarProps {
  onOpenAuthModal?: (mode: "login" | "register") => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({
  onOpenAuthModal,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // mounted es true por defecto ya que este componente solo se renderiza en el cliente (ssr: false)
  const mounted = true;
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } =
    useNotifications();
  const { theme, setTheme } = useTheme();

  // Búsqueda en tiempo real
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const isUserSearch = searchQuery.startsWith("@");
        const query = isUserSearch ? searchQuery.substring(1) : searchQuery;

        if (isUserSearch) {
          // Buscar solo usuarios
          const res = await fetch(
            `/api/usuarios/buscar?q=${encodeURIComponent(query)}&limit=5`
          );
          const data = res.ok ? await res.json() : { usuarios: [] };
          setSearchResults(
            (data.usuarios || []).map((u: any) => ({ ...u, tipo: "usuario" }))
          );
        } else {
          // Buscar hilos y noticias
          const [noticiasRes, hilosRes] = await Promise.all([
            fetch(
              `/api/noticias?busqueda=${encodeURIComponent(query)}&limit=3`
            ),
            fetch(
              `/api/foro/hilos?buscar=${encodeURIComponent(query)}&limit=3`
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
            tipo: "noticia",
          }));

          const hilos = (hilosData.hilos || []).map((h: any) => ({
            id: h.id,
            titulo: h.titulo,
            slug: h.slug,
            tipo: "hilo",
          }));

          setSearchResults([...noticias, ...hilos]);
        }
      } catch (error) {
        console.error("Error en búsqueda:", error);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isAdmin = profile?.role === "admin" || profile?.role === "moderator";

  // Color personalizado del usuario (fallback a azul por defecto)
  const userColor = profile?.color || "#3b82f6";

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await signOut();
    router.push("/");
  };

  const handleNavClick = (href: string) => {
    setIsProfileMenuOpen(false);
    setIsCreateModalOpen(false);
    router.push(href);
  };

  const handleCreateClick = () => {
    if (!user) {
      onOpenAuthModal?.("login");
      return;
    }
    // Cerrar otros modales
    setIsProfileMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsFiltersOpen(false);

    // Si es admin, mostrar modal con opciones
    // Si es usuario normal, ir directo a crear hilo
    if (isAdmin) {
      setIsCreateModalOpen(true);
    } else {
      router.push("/foro/crear-hilo");
    }
  };

  const handleProfileClick = () => {
    if (!user) {
      onOpenAuthModal?.("login");
      return;
    }
    // Cerrar otros modales antes de abrir/cerrar perfil
    setIsCreateModalOpen(false);
    setIsNotificationsOpen(false);
    setIsFiltersOpen(false);
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const handleNotificationsClick = () => {
    if (!user) {
      onOpenAuthModal?.("login");
      return;
    }
    // Cerrar otros modales antes de abrir/cerrar notificaciones
    setIsCreateModalOpen(false);
    setIsProfileMenuOpen(false);
    setIsFiltersOpen(false);
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const hoursAgo = differenceInHours(now, date);
    const daysAgo = differenceInDays(now, date);

    if (hoursAgo < 1) {
      const minutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );
      if (minutes < 1) return "ahora";
      return `hace ${minutes}m`;
    } else if (daysAgo < 1) {
      return format(date, "HH:mm");
    } else {
      return format(date, "dd/MM");
    }
  };

  const handleNotificationClick = (
    id: string,
    read: boolean,
    notification: any
  ) => {
    if (!read) {
      markAsRead(id);
    }
    setIsNotificationsOpen(false);

    const data = notification.data as any;
    const commentHash = data?.commentId ? `#comment-${data.commentId}` : "";

    if (notification.type === "news_comment" && data?.noticiaSlug) {
      window.location.href = `/noticias/${data.noticiaSlug}${commentHash}`;
    } else if (notification.type === "thread_comment" && data?.hiloSlug) {
      const postHash = data?.commentId ? `#post-${data.commentId}` : "";
      window.location.href = `/foro/hilo/${data.hiloSlug}${postHash}`;
    } else if (notification.type === "comment_reply") {
      if (data?.contentType === "hilo" && data?.hiloSlug) {
        const postHash = data?.commentId ? `#post-${data.commentId}` : "";
        window.location.href = `/foro/hilo/${data.hiloSlug}${postHash}`;
      } else if (data?.contentType === "noticia" && data?.contentSlug) {
        window.location.href = `/noticias/${data.contentSlug}${commentHash}`;
      }
    } else if (data?.link) {
      window.location.href = data.link;
    }
  };

  const navItems = [
    {
      id: "home",
      icon: Home,
      label: "Inicio",
      href: "/inicio",
      isActive: pathname === "/inicio" || pathname === "/",
    },
    {
      id: "trending",
      icon: Flame,
      label: "Trending",
      href: "/foro?sort=popular",
      isActive: pathname === "/foro" && pathname.includes("popular"),
    },
    {
      id: "create",
      icon: Plus,
      label: "Crear",
      href: null,
      isActive: false,
      isCenter: true,
    },
    {
      id: "notifications",
      icon: Bell,
      label: "Alertas",
      href: null,
      isActive: false,
    },
    {
      id: "profile",
      icon: User,
      label: "Perfil",
      href: null,
      isActive: pathname === "/perfil",
    },
  ];

  return (
    <>
      {/* Header móvil con logo - Solo visible en móviles */}
      <header className="fixed top-0 left-0 right-0 z-[9999] lg:hidden pwa-only-nav pwa-top-header bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-b border-gray-200/80 dark:border-gray-700/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => {
              setIsProfileMenuOpen(false);
              setIsCreateModalOpen(false);
              setIsNotificationsOpen(false);
              setIsSearchOpen(false);
            }}
          >
            <Image
              src="/images/logo.png"
              alt="KoreStats Logo"
              width={28}
              height={28}
              priority
            />
            <span className="font-bold text-base bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              KoreStats
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Botón de cambio de tema */}
            <button
              onClick={(e) => {
                const nextTheme = theme === "dark" ? "light" : "dark";

                // Verificar si el navegador soporta View Transitions API
                if (!(document as any).startViewTransition) {
                  setTheme(nextTheme);
                  return;
                }

                // Configurar coordenadas para la animación circular
                const x = e.clientX;
                const y = e.clientY;

                // Calcular la distancia a la esquina más lejana
                const right = window.innerWidth - x;
                const bottom = window.innerHeight - y;
                const maxRadius = Math.hypot(
                  Math.max(x, right),
                  Math.max(y, bottom)
                );

                document.documentElement.style.setProperty("--x", `${x}px`);
                document.documentElement.style.setProperty("--y", `${y}px`);
                document.documentElement.style.setProperty(
                  "--r",
                  `${maxRadius}px`
                );

                // Iniciar transición
                (document as any).startViewTransition(() => {
                  setTheme(nextTheme);
                });
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={
                theme === "dark"
                  ? "Cambiar a modo claro"
                  : "Cambiar a modo oscuro"
              }
            >
              <div className="relative w-5 h-5">
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300 absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </div>
            </button>

            {/* Botón de búsqueda */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Modal de Búsqueda Fullscreen */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[10001] lg:hidden bg-white dark:bg-black">
          <div className="flex flex-col h-full">
            {/* Header del modal */}
            <div className="flex items-center gap-3 h-14 px-4 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                }}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Cerrar búsqueda"
              >
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en KoreStats..."
                  autoFocus
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Contenido del modal con resultados */}
            <div className="flex-1 overflow-y-auto p-4">
              {searchQuery.length >= 2 ? (
                <>
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((resultado: any) => {
                        if (resultado.tipo === "usuario") {
                          return (
                            <Link
                              key={`usuario-${resultado.id}`}
                              href={`/perfil/${encodeURIComponent(
                                resultado.public_id || resultado.username || ""
                              )}`}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                            >
                              <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 dark:from-gray-800 dark:to-gray-900">
                                {resultado.avatar_url ? (
                                  <img
                                    src={resultado.avatar_url}
                                    alt={resultado.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4
                                  className="font-semibold truncate text-sm"
                                  style={{
                                    color: resultado.color || userColor,
                                  }}
                                >
                                  {resultado.username}
                                </h4>
                                {resultado.bio && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {resultado.bio}
                                  </p>
                                )}
                              </div>
                              {resultado.rol && resultado.rol !== "user" && (
                                <Badge className="flex-shrink-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                                  {resultado.rol === "admin" ? "👑" : "🛡️"}
                                </Badge>
                              )}
                            </Link>
                          );
                        } else if (resultado.tipo === "noticia") {
                          return (
                            <Link
                              key={`noticia-${resultado.id}`}
                              href={`/noticias/${resultado.id}`}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                            >
                              <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 dark:from-gray-800 dark:to-gray-900">
                                {resultado.imagen_url ? (
                                  <img
                                    src={resultado.imagen_url}
                                    alt={resultado.titulo}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Newspaper className="w-5 h-5 text-orange-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate text-sm text-gray-900 dark:text-white">
                                  {resultado.titulo}
                                </h4>
                                <p className="text-xs text-orange-600 dark:text-orange-400">
                                  Noticia
                                </p>
                              </div>
                            </Link>
                          );
                        } else {
                          // Hilo
                          return (
                            <Link
                              key={`hilo-${resultado.id}`}
                              href={`/foro/hilos/${
                                resultado.slug || resultado.id
                              }`}
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                            >
                              <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50 dark:from-gray-800 dark:to-gray-900">
                                <MessageCircle className="w-5 h-5 text-purple-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate text-sm text-gray-900 dark:text-white">
                                  {resultado.titulo}
                                </h4>
                                <p className="text-xs text-purple-600 dark:text-purple-400">
                                  Hilo
                                </p>
                              </div>
                            </Link>
                          );
                        }
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
                      No se encontraron resultados
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
                  {searchQuery.length === 0 ? (
                    <>
                      <p className="mb-2">
                        Escribe para buscar hilos, noticias y más...
                      </p>
                      <p className="text-xs">
                        💡 Usa{" "}
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          @
                        </span>{" "}
                        para buscar usuarios
                      </p>
                    </>
                  ) : (
                    <p>Escribe al menos 2 caracteres para buscar</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de Filtros del Foro */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-[64px] left-0 right-0 z-[9999] lg:hidden">
            <AnimatePresence>
              {isFiltersOpen && (
                <motion.div
                  key="filters-modal"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 270,
                    mass: 0.9,
                  }}
                  style={{ willChange: "transform" }}
                  className="mx-auto max-w-md px-4"
                >
                  <div className="bg-white dark:bg-gray-950 rounded-t-2xl shadow-2xl border-x border-t border-gray-200 dark:border-gray-700/50 border-b-0 max-h-[70vh] overflow-hidden flex flex-col">
                    {/* Header del modal */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700/50">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Filtros del Foro
                      </h2>
                      <button
                        onClick={() => setIsFiltersOpen(false)}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Cerrar filtros"
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Contenido del modal con scroll */}
                    <div className="flex-1 overflow-y-auto p-3">
                      <div className="space-y-1.5">
                        {/* Recientes */}
                        <Link
                          href="/foro"
                          onClick={() => setIsFiltersOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-gray-900 dark:text-white">
                              Recientes
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Hilos más nuevos
                            </p>
                          </div>
                        </Link>

                        {/* Populares */}
                        <Link
                          href="/foro?sort=popular"
                          onClick={() => setIsFiltersOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-gray-900 dark:text-white">
                              Populares
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Más votados
                            </p>
                          </div>
                        </Link>

                        {/* Sin respuesta */}
                        <Link
                          href="/foro?filter=sin_respuesta"
                          onClick={() => setIsFiltersOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-gray-900 dark:text-white">
                              Sin respuesta
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Necesitan ayuda
                            </p>
                          </div>
                        </Link>

                        {user && (
                          <>
                            {/* Siguiendo */}
                            <Link
                              href="/foro?filter=siguiendo"
                              onClick={() => setIsFiltersOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                <Star className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm text-gray-900 dark:text-white">
                                  Siguiendo
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Hilos que sigues
                                </p>
                              </div>
                            </Link>

                            {/* Míos */}
                            <Link
                              href="/foro?filter=mios"
                              onClick={() => setIsFiltersOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm text-gray-900 dark:text-white">
                                  Mis hilos
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Creados por ti
                                </p>
                              </div>
                            </Link>
                          </>
                        )}
                      </div>

                      {/* Mensaje para usuarios no autenticados */}
                      {!user && (
                        <div className="mt-3 p-3 bg-blue-900/10 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-blue-700 dark:text-blue-100">
                            💡 <strong>Inicia sesión</strong> para ver tus hilos
                            y los que sigues
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}

      {/* Backdrop para menús - Renderizado con Portal */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {(isProfileMenuOpen ||
              isCreateModalOpen ||
              isNotificationsOpen ||
              isFiltersOpen) && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ willChange: "opacity" }}
                className="fixed inset-0 bg-gray-900/30 dark:bg-black/60 transform-gpu z-[9990] lg:hidden"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsCreateModalOpen(false);
                  setIsNotificationsOpen(false);
                  setIsFiltersOpen(false);
                }}
              />
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Menú de Perfil */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-[64px] left-0 right-0 z-[9999] lg:hidden">
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  key="profile-menu"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 270,
                    mass: 0.9,
                  }}
                  style={{ willChange: "transform" }}
                  className="mx-auto max-w-md px-4"
                >
                  <div className="bg-white dark:bg-gray-950 rounded-t-2xl shadow-2xl border-x border-t border-gray-200 dark:border-gray-700/50 border-b-0">
                    <div className="p-3">
                      {/* Header del menú */}
                      <div className="flex items-center justify-between mb-3 pl-1">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-10 h-10 ring-2 ring-white dark:ring-gray-800">
                            <AvatarImage
                              src={profile?.avatar_url || undefined}
                              alt={profile?.username || "Usuario"}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                              {getUserInitials(profile?.username || "", 1, "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">
                              {profile?.username || "Usuario"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {profile?.role || "user"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>

                      {/* Opciones del menú */}
                      <div className="space-y-0.5">
                        <button
                          onClick={() => handleNavClick("/perfil")}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                        >
                          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-white">
                            Mi Perfil
                          </span>
                        </button>

                        {isAdmin && (
                          <>
                            <div className="my-1.5 border-t border-gray-100 dark:border-gray-800" />
                            <button
                              onClick={() => handleNavClick("/admin/dashboard")}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                            >
                              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                Panel Admin
                              </span>
                            </button>
                          </>
                        )}

                        <div className="my-1.5 border-t border-gray-100 dark:border-gray-800" />

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-500">
                            Cerrar Sesión
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}

      {/* Modal de Crear */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-[64px] left-0 right-0 z-[9999] lg:hidden">
            <AnimatePresence>
              {isCreateModalOpen && (
                <motion.div
                  key="create-modal"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 270,
                    mass: 0.9,
                  }}
                  style={{ willChange: "transform" }}
                  className="mx-auto max-w-md px-4"
                >
                  <div className="bg-white dark:bg-gray-950 rounded-t-2xl shadow-2xl border-x border-t border-gray-200 dark:border-gray-700/50 border-b-0">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          Crear nuevo
                        </h3>
                        <button
                          onClick={() => setIsCreateModalOpen(false)}
                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleNavClick("/foro/crear-hilo")}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-left group border border-transparent hover:border-gray-200 dark:hover:border-gray-800"
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: `${userColor}15`,
                            }}
                          >
                            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Nuevo Hilo
                          </span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleNavClick("/admin/noticias/crear")
                            }
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-left group border border-transparent hover:border-gray-200 dark:hover:border-gray-800"
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: `${userColor}15`,
                              }}
                            >
                              <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Nueva Noticia
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}

      {/* Modal de Notificaciones - Renderizado con Portal */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-[64px] left-0 right-0 z-[9999] lg:hidden">
            <AnimatePresence>
              {isNotificationsOpen && user && (
                <motion.div
                  key="notifications-modal"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 270,
                    mass: 0.9,
                  }}
                  style={{ willChange: "transform" }}
                  className="mx-auto max-w-md px-4"
                >
                  <div className="bg-white dark:bg-gray-950 rounded-t-2xl shadow-2xl border-x border-t border-gray-200 dark:border-gray-700/50 border-b-0">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          Notificaciones
                        </h3>
                        <div className="flex items-center gap-1.5">
                          {unreadCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-7 px-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                              onClick={() => markAllAsRead()}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Marcar leídas
                            </Button>
                          )}
                          <button
                            onClick={() => setIsNotificationsOpen(false)}
                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>

                      <ScrollArea className="h-[280px]">
                        {isLoading ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            Cargando...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Bell className="w-10 h-10 text-gray-400 dark:text-gray-600 mb-2" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              No tienes notificaciones
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={cn(
                                  "p-2.5 rounded-xl cursor-pointer transition-colors border border-transparent",
                                  !notification.read
                                    ? "bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-100 dark:hover:border-gray-800"
                                )}
                                onClick={() =>
                                  handleNotificationClick(
                                    notification.id,
                                    notification.read,
                                    notification
                                  )
                                }
                              >
                                <div className="flex justify-between items-start gap-2 mb-0.5">
                                  <span
                                    className={cn(
                                      "font-medium text-xs line-clamp-2 flex-1",
                                      !notification.read
                                        ? "text-gray-900 dark:text-white"
                                        : "text-gray-700 dark:text-gray-300"
                                    )}
                                  >
                                    {notification.title}
                                  </span>
                                  <span className="text-[9px] text-gray-500 whitespace-nowrap shrink-0">
                                    {formatNotificationTime(
                                      notification.created_at
                                    )}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}

      {/* Menú para usuarios no autenticados */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-[64px] left-0 right-0 z-[9999] lg:hidden">
            <AnimatePresence>
              {isProfileMenuOpen && !user && (
                <motion.div
                  key="guest-menu"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 270,
                    mass: 0.9,
                  }}
                  style={{ willChange: "transform" }}
                  className="mx-auto max-w-md px-4"
                >
                  <div className="bg-white dark:bg-gray-950 rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700/50 border-b-0">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          Opciones
                        </h3>
                        <button
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {/* Botón de Iniciar Sesión */}
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenAuthModal?.("login");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                        >
                          <LogIn className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-white">
                            Iniciar Sesión
                          </span>
                        </button>

                        {/* Botón de Registrarse */}
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenAuthModal?.("register");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                        >
                          <UserPlus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-white">
                            Registrarse
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}

      {/* Navbar principal */}
      <nav className="fixed bottom-0 left-0 right-0 z-[10000] lg:hidden pwa-only-nav pwa-bottom-nav">
        <div className="mx-auto max-w-md px-4 overflow-visible">
          <div
            className={cn(
              "bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg transition-all duration-300 shadow-2xl border-gray-200/80 dark:border-gray-700/50 px-1 py-1.5 h-16",
              isProfileMenuOpen ||
                isCreateModalOpen ||
                isNotificationsOpen ||
                isFiltersOpen
                ? "rounded-t-none border-x border-t-0 border-b-0"
                : "rounded-t-2xl border-x border-t border-b-0"
            )}
          >
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const Icon = item.icon;

                if (item.id === "create") {
                  return (
                    <button
                      key={item.id}
                      onClick={handleCreateClick}
                      className="relative -mt-6 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                      style={{
                        background: `linear-gradient(to bottom right, ${userColor}, ${userColor}dd)`,
                        boxShadow: `0 10px 15px -3px ${userColor}40, 0 4px 6px -2px ${userColor}30`,
                      }}
                    >
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </button>
                  );
                }

                if (item.id === "notifications") {
                  return (
                    <button
                      key={item.id}
                      onClick={handleNotificationsClick}
                      disabled={!user}
                      className={cn(
                        "flex items-center justify-center p-2 rounded-xl transition-all duration-200 relative",
                        !user && "opacity-40 cursor-not-allowed",
                        user &&
                          !isNotificationsOpen &&
                          "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      )}
                      style={{
                        color:
                          isNotificationsOpen && user ? userColor : undefined,
                      }}
                    >
                      <Icon className="w-6 h-6" strokeWidth={2} />
                      {user && unreadCount > 0 && (
                        <Badge
                          className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center p-0 text-[8px] font-bold"
                          variant="destructive"
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </button>
                  );
                }

                if (item.id === "profile") {
                  return (
                    <button
                      key={item.id}
                      onClick={handleProfileClick}
                      className={cn(
                        "flex items-center justify-center p-1.5 rounded-xl transition-all duration-200",
                        !(isProfileMenuOpen || item.isActive) &&
                          "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      )}
                      style={{
                        color:
                          isProfileMenuOpen || item.isActive
                            ? userColor
                            : undefined,
                      }}
                    >
                      {user && profile?.avatar_url ? (
                        <Avatar
                          className="w-9 h-9 ring-2 transition-all duration-200"
                          style={{
                            borderColor:
                              isProfileMenuOpen || item.isActive
                                ? userColor
                                : "transparent",
                          }}
                        >
                          <AvatarImage
                            src={profile.avatar_url}
                            alt={profile.username || "Usuario"}
                          />
                          <AvatarFallback
                            className="text-white text-sm"
                            style={{
                              backgroundColor: userColor,
                            }}
                          >
                            {getUserInitials(profile.username || "", 1, "U")}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Icon className="w-6 h-6" strokeWidth={2} />
                      )}
                    </button>
                  );
                }

                // Botón especial para Trending
                if (item.id === "trending") {
                  const isInForo = pathname.startsWith("/foro");

                  if (isInForo) {
                    // Si ya está en /foro, abrir modal de filtros
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          // Cerrar otros modales antes de abrir filtros
                          setIsProfileMenuOpen(false);
                          setIsCreateModalOpen(false);
                          setIsNotificationsOpen(false);
                          setIsFiltersOpen(true);
                        }}
                        className={cn(
                          "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
                          !isFiltersOpen &&
                            "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                        style={{
                          color: isFiltersOpen ? userColor : undefined,
                        }}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2} />
                      </button>
                    );
                  } else {
                    // Si no está en /foro, navegar normalmente
                    return (
                      <Link
                        key={item.id}
                        href={item.href || "/"}
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsCreateModalOpen(false);
                          setIsNotificationsOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
                          !item.isActive &&
                            "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        )}
                        style={{
                          color: item.isActive ? userColor : undefined,
                        }}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2} />
                      </Link>
                    );
                  }
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href || "/"}
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsCreateModalOpen(false);
                      setIsNotificationsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
                      !item.isActive &&
                        "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                    style={{
                      color: item.isActive ? userColor : undefined,
                    }}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default MobileNavbar;
