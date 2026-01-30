import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Plus, PenSquare, Menu, X } from "lucide-react";
import { UserDesktopMenu } from "./UserDesktopMenu";

interface HeaderRightControlsProps {
  isAdmin: boolean;
  authUser: any;
  profile?: {
    username?: string;
    avatar_url?: string;
    role?: string;
    color?: string;
  } | null;
  isUserMenuOpen: boolean;
  setIsUserMenuOpen: (value: boolean) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
  userButtonRef: React.RefObject<HTMLButtonElement>;
  userMenuRef: React.RefObject<HTMLDivElement>;
  handleLogout: () => void;
  openAuthModal: (mode: "login" | "register") => void;
  isLoggingOut: boolean;
  isAuthLoading?: boolean;
  setIsSettingsModalOpen: (value: boolean) => void;
}

export const HeaderRightControls: React.FC<HeaderRightControlsProps> = ({
  isAdmin,
  authUser,
  profile,
  isUserMenuOpen,
  setIsUserMenuOpen,
  isMenuOpen,
  setIsMenuOpen,
  userButtonRef,
  userMenuRef,
  handleLogout,
  openAuthModal,
  isLoggingOut,
  isAuthLoading,
  setIsSettingsModalOpen,
}) => {
  return (
    <div className="flex items-center gap-1 md:gap-3">
      {/* Botones de creación - Ocultar en pantallas menores a 1024px */}
      <div className="hidden lg:flex items-center gap-2">
        <ModeToggle variant="ghost" size="default" modes={["light", "dark"]} />
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Link href="/admin/noticias/crear">
              <Plus className="h-4 w-4 mr-1" />
              Noticia
            </Link>
          </Button>
        )}
        {authUser && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Link href="/foro/crear-hilo">
              <PenSquare className="h-4 w-4 mr-1" />
              Hilo
            </Link>
          </Button>
        )}
      </div>

      {/* Usuario/Auth - Desktop */}
      <div className="hidden lg:flex items-center gap-4">
        {isAuthLoading ? (
          // Skeleton loader para evitar parpadeo
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>
        ) : authUser ? (
          <UserDesktopMenu
            isOpen={isUserMenuOpen}
            onToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
            onClose={() => setIsUserMenuOpen(false)}
            onLogout={handleLogout}
            authUser={authUser}
            profile={profile}
            userButtonRef={userButtonRef}
            userMenuRef={userMenuRef}
            isLoggingOut={isLoggingOut}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        ) : (
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm hover:shadow-md px-5"
            onClick={() => openAuthModal("login")}
          >
            Iniciar Sesión
          </Button>
        )}
      </div>

      {/* Botón de menú móvil - Mostrar en pantallas menores a 1024px */}
      <div className="block lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2"
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
};
