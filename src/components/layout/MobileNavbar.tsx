"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  Flame,
  Plus,
  Bell,
  User,
  Settings,
  Shield,
  LogOut,
  LogIn,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils";

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

  const isAdmin = profile?.role === "admin" || profile?.role === "moderator";

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
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const navItems = [
    {
      id: "home",
      icon: Home,
      label: "Inicio",
      href: "/",
      isActive: pathname === "/",
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
      href: "/notificaciones",
      isActive: pathname === "/notificaciones",
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
      {/* Backdrop para menús */}
      {(isProfileMenuOpen || isCreateModalOpen) && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden"
          onClick={() => {
            setIsProfileMenuOpen(false);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Menú de Perfil */}
      {isProfileMenuOpen && (
        <div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-[95] lg:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-4">
            {/* Header del menú */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage
                    src={profile?.avatar_url || undefined}
                    alt={profile?.username || "Usuario"}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {getUserInitials(profile?.username || "", 1, "U")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {profile?.username || "Usuario"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {profile?.role || "user"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Opciones del menú */}
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick("/perfil")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">Mi Perfil</span>
              </button>

              <button
                onClick={() => handleNavClick("/configuracion")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  Configuración
                </span>
              </button>

              {isAdmin && (
                <>
                  <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => handleNavClick("/admin/dashboard")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                  >
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      Panel Admin
                    </span>
                  </button>
                </>
              )}

              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
              >
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400">
                  Cerrar Sesión
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Crear */}
      {isCreateModalOpen && (
        <div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-[95] lg:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Crear nuevo
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleNavClick("/foro/crear-hilo")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all text-white"
              >
                <Plus className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Nuevo Hilo</p>
                  <p className="text-sm text-blue-100">
                    Inicia una discusión en el foro
                  </p>
                </div>
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleNavClick("/admin/noticias/crear")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 transition-all text-white"
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Nueva Noticia</p>
                    <p className="text-sm text-purple-100">
                      Publica una noticia (Admin)
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Menú para usuarios no autenticados */}
      {isProfileMenuOpen && !user && (
        <div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-[95] lg:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bienvenido
              </h3>
              <button
                onClick={() => setIsProfileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Inicia sesión para acceder a todas las funciones
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenAuthModal?.("login");
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium"
              >
                <LogIn className="w-5 h-5" />
                Iniciar Sesión
              </button>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenAuthModal?.("register");
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-900 dark:text-white font-medium"
              >
                <UserPlus className="w-5 h-5" />
                Registrarse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar principal */}
      <nav className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden">
        <div className="mx-4 mb-4">
          <div className="bg-gray-900 dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-800 dark:border-gray-700 px-2 py-2">
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const Icon = item.icon;

                if (item.id === "create") {
                  return (
                    <button
                      key={item.id}
                      onClick={handleCreateClick}
                      className="relative -mt-6 p-3 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-600/30 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </button>
                  );
                }

                if (item.id === "profile") {
                  return (
                    <button
                      key={item.id}
                      onClick={handleProfileClick}
                      className={cn(
                        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
                        isProfileMenuOpen || item.isActive
                          ? "text-blue-500"
                          : "text-gray-400 hover:text-gray-200"
                      )}
                    >
                      {user && profile?.avatar_url ? (
                        <Avatar className="w-6 h-6">
                          <AvatarImage
                            src={profile.avatar_url}
                            alt={profile.username || "Usuario"}
                          />
                          <AvatarFallback className="bg-gray-700 text-white text-xs">
                            {getUserInitials(profile.username || "", 1, "U")}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                      <span className="text-[10px] font-medium">
                        {item.label}
                      </span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href || "/"}
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsCreateModalOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
                      item.isActive
                        ? "text-blue-500"
                        : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px] font-medium">
                      {item.label}
                    </span>
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
