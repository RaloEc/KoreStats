import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/utils/avatar-utils";
import {
  Newspaper,
  MessageSquare,
  User,
  LogOut,
  Plus,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { ForoCategoria } from "./useHeaderLogic";
import { LegalModal } from "@/components/legal/LegalModal";

interface HeaderMobileMenuProps {
  isOpen: boolean;
  authUser: any;
  profile?: {
    username?: string;
    avatar_url?: string;
    role?: string;
    color?: string;
  } | null;
  closeAllMenus: () => void;
  handleLogout: () => void;
  openAuthModal: (mode: "login" | "register") => void;
  noticiasMobileOpen: boolean;
  setNoticiasMobileOpen: (value: boolean) => void;
  foroMobileOpen: boolean;
  setForoMobileOpen: (value: boolean) => void;
  foroCategorias: ForoCategoria[];
  expandedCategories: Record<string, boolean>;
  setExpandedCategories: (
    value: React.SetStateAction<Record<string, boolean>>
  ) => void;
  isAdmin: boolean;
  isLoggingOut?: boolean;
}

export const HeaderMobileMenu: React.FC<HeaderMobileMenuProps> = ({
  isOpen,
  authUser,
  profile,
  closeAllMenus,
  handleLogout,
  openAuthModal,
  noticiasMobileOpen,
  setNoticiasMobileOpen,
  foroMobileOpen,
  setForoMobileOpen,
  foroCategorias,
  expandedCategories,
  setExpandedCategories,
  isAdmin,
  isLoggingOut = false,
}) => {
  const [adminMenuOpen, setAdminMenuOpen] = React.useState(false);
  const [legalOpen, setLegalOpen] = React.useState(false);

  // Bloquear scroll del body cuando el menú esté abierto
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Cleanup: restaurar el scroll cuando el componente se desmonte
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="lg:hidden">
      {/* Menú desplegable */}
      <div
        key="mobile-menu"
        className="fixed top-16 right-0 w-72 max-w-[calc(100%-1rem)] rounded-bl-lg border border-gray-200 dark:border-gray-800 shadow-lg z-[60] overflow-hidden bg-white dark:bg-black text-gray-900 dark:text-white"
      >
        <style jsx global>{`
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          .menu-item {
            animation: scaleIn 0.2s ease-out forwards;
            opacity: 0;
          }
          .menu-item:nth-child(1) {
            animation-delay: 50ms;
          }
          .menu-item:nth-child(2) {
            animation-delay: 80ms;
          }
          .menu-item:nth-child(3) {
            animation-delay: 110ms;
          }
          .menu-item:nth-child(4) {
            animation-delay: 140ms;
          }
          .menu-item:nth-child(5) {
            animation-delay: 170ms;
          }
          .menu-item:nth-child(6) {
            animation-delay: 200ms;
          }
          .menu-item:nth-child(7) {
            animation-delay: 230ms;
          }
          .menu-item:nth-child(8) {
            animation-delay: 260ms;
          }
          .menu-item:nth-child(9) {
            animation-delay: 290ms;
          }
          .menu-item:nth-child(10) {
            animation-delay: 320ms;
          }
        `}</style>
        <div
          className="w-full rounded-lg shadow-2xl flex flex-col overflow-visible bg-white dark:bg-black text-gray-900 dark:text-white"
          style={{
            maxHeight: "calc(100vh - 6rem)",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div className="border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
            {authUser ? (
              <div className="menu-item flex items-center gap-3 p-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage
                    src={
                      profile?.avatar_url ||
                      authUser?.user_metadata?.avatar_url ||
                      authUser?.user_metadata?.picture ||
                      undefined
                    }
                    alt={
                      profile?.username ||
                      authUser?.user_metadata?.full_name ||
                      authUser?.user_metadata?.name ||
                      "Usuario"
                    }
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {getUserInitials(
                      profile?.username ||
                        authUser?.user_metadata?.full_name ||
                        "",
                      1,
                      "U"
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-base truncate menu-item">
                      {profile?.username ||
                        authUser?.user_metadata?.full_name ||
                        authUser?.user_metadata?.name ||
                        authUser?.email?.split("@")[0] ||
                        "Usuario"}
                    </span>
                    <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                      {profile?.role || "user"}
                    </span>
                  </div>
                  {authUser.email && (
                    <span className="text-xs text-muted-foreground truncate">
                      {authUser.email}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-4">
                <p className="text-sm font-medium text-center text-gray-500 dark:text-gray-400 mb-1">
                  Únete a la comunidad
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full mx-0 py-2 h-auto transition-all duration-200 hover:shadow-md"
                    onClick={() => openAuthModal("login")}
                    style={
                      {
                        "--tw-shadow":
                          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                        "--tw-shadow-colored":
                          "0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color)",
                      } as React.CSSProperties
                    }
                  >
                    <User className="w-4 h-4 mr-2" />
                    Iniciar Sesión
                  </Button>
                  <Button
                    className="w-full mx-0 py-2 h-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:shadow-lg"
                    onClick={() => openAuthModal("register")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Cuenta
                  </Button>
                </div>
              </div>
            )}
          </div>

          <ul
            className="flex-grow p-4 space-y-3 overflow-y-auto"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#9ca3af #e5e7eb",
            }}
          >
            {/* Sección de Perfil */}
            {authUser && (
              <li className="menu-item">
                <Link
                  href="/perfil"
                  className="flex items-center gap-2 p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeAllMenus}
                >
                  <User size={18} /> Mi Perfil
                </Link>
              </li>
            )}

            {/* Sección de Administración */}
            {isAdmin && (
              <li className="menu-item">
                <div className="flex items-center justify-between w-full">
                  <Link
                    href="/admin/dashboard"
                    className="flex-grow flex items-center gap-2 p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={closeAllMenus}
                  >
                    <span className="font-medium">Administración</span>
                  </Link>
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500"
                    aria-expanded={adminMenuOpen}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAdminMenuOpen(!adminMenuOpen);
                    }}
                  >
                    <ChevronDown
                      size={18}
                      className={`transition-transform ${
                        adminMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
                <div
                  className={`ml-4 overflow-hidden transition-all duration-200 ease-out ${
                    adminMenuOpen
                      ? "max-h-40 opacity-100"
                      : "max-h-0 opacity-0 pointer-events-none"
                  }`}
                  aria-hidden={!adminMenuOpen}
                >
                  <Link
                    href="/admin/noticias"
                    className="block p-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={closeAllMenus}
                  >
                    Noticias
                  </Link>
                  <Link
                    href="/admin/usuarios"
                    className="block p-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={closeAllMenus}
                  >
                    Usuarios
                  </Link>
                  <Link
                    href="/admin/foro"
                    className="block p-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={closeAllMenus}
                  >
                    Foro
                  </Link>
                </div>
              </li>
            )}

            {/* Sección de Noticias */}
            <li className="menu-item">
              <div className="flex items-center justify-between w-full">
                <Link
                  href="/noticias"
                  className="flex-grow flex items-center gap-2 p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeAllMenus}
                >
                  <Newspaper size={18} /> Noticias
                </Link>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500"
                  aria-expanded={noticiasMobileOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoticiasMobileOpen(!noticiasMobileOpen);
                  }}
                >
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${
                      noticiasMobileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
              <div
                className={`mt-1 ml-2 overflow-hidden transition-all duration-200 ease-out ${
                  noticiasMobileOpen
                    ? "max-h-40 opacity-100"
                    : "max-h-0 opacity-0 pointer-events-none"
                }`}
                aria-hidden={!noticiasMobileOpen}
              >
                <Link
                  href="/noticias"
                  className="block p-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeAllMenus}
                >
                  Ver noticias
                </Link>
                <Link
                  href="/noticias?tipo=recientes"
                  className="block p-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeAllMenus}
                >
                  Recientes
                </Link>
                <Link
                  href="/noticias?tipo=destacadas"
                  className="block p-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeAllMenus}
                >
                  Destacadas
                </Link>
              </div>
            </li>

            {/* Sección de Foro */}
            <li className="menu-item">
              <div className="flex items-center justify-between w-full">
                <Link
                  href="/foro"
                  className="flex-grow flex items-center gap-2 p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={closeAllMenus}
                >
                  <MessageSquare size={18} /> Foro
                </Link>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500"
                  aria-expanded={foroMobileOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setForoMobileOpen(!foroMobileOpen);
                  }}
                >
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${
                      foroMobileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
              <div
                className={`mt-1 ml-2 overflow-hidden transition-all duration-200 ease-out ${
                  foroMobileOpen
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0 pointer-events-none"
                }`}
                aria-hidden={!foroMobileOpen}
              >
                {foroCategorias.map((cat) => {
                  const hasSubcats =
                    cat.subcategorias && cat.subcategorias.length > 0;
                  const isExpanded = expandedCategories[cat.id] || false;

                  return (
                    <div key={cat.id} className="mb-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/foro/categoria/${cat.slug}`}
                          className="flex-grow block p-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={closeAllMenus}
                        >
                          {cat.nombre}
                        </Link>
                        {hasSubcats && (
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-opacity-20 hover:bg-gray-500"
                            onClick={() =>
                              setExpandedCategories((prev) => ({
                                ...prev,
                                [cat.id]: !prev[cat.id],
                              }))
                            }
                          >
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                      {hasSubcats && isExpanded && (
                        <div className="ml-4 mt-1">
                          {cat.subcategorias!.map((subcat) => (
                            <Link
                              key={subcat.id}
                              href={`/foro/categoria/${subcat.slug}`}
                              className="block p-1 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                              onClick={closeAllMenus}
                            >
                              {subcat.nombre}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          </ul>

          {/* Sección inferior con tema, aviso legal y cerrar sesión */}
          <div className="mt-auto">
            {/* Botón de cambio de tema */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tema</span>
                <ModeToggle
                  variant="ghost"
                  size="default"
                  modes={["light", "dark"]}
                />
              </div>
            </div>

            {/* Aviso legal */}
            <div className="border-t border-gray-200 dark:border-gray-800 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
              <button
                type="button"
                onClick={() => setLegalOpen(!legalOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Aviso legal
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    legalOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  legalOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-4 pb-4 space-y-2">
                  <p>
                    KoreStats no está afiliado a Riot Games, Inc. League of
                    Legends, Valorant, Teamfight Tactics, Legends of Runeterra y
                    todos los activos relacionados son propiedad intelectual de
                    Riot Games, Inc.
                  </p>
                  <p>
                    KoreStats es un proyecto comunitario independiente que
                    utiliza datos públicos de las APIs de Riot Games conforme a
                    sus Términos de Servicio.
                  </p>
                  <p>
                    Riot Games es una marca registrada de Riot Games, Inc. ©
                    2024 KoreStats.
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de cerrar sesión al final */}
            {authUser && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center justify-center gap-2 p-2 rounded-md w-full text-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <LogOut size={18} />
                  )}
                  {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
