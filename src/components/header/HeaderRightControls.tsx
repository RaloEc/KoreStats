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
            className="text-sm"
            style={
              {
                color: profile?.color || "#2563eb",
                "--hover-bg": profile?.color
                  ? `${profile.color}1a`
                  : "rgba(37, 99, 235, 0.1)",
                "--hover-text": profile?.color || "#2563eb",
                "--dark-hover-bg": profile?.color
                  ? `${profile.color}1a`
                  : "rgba(96, 165, 250, 0.1)",
                "--dark-hover-text": profile?.color || "#60a5fa",
              } as React.CSSProperties
            }
          >
            <Link
              href="/admin/noticias/crear"
              className="hover:bg-[var(--hover-bg)] dark:hover:bg-[var(--dark-hover-bg)] hover:text-[var(--hover-text)] dark:hover:text-[var(--dark-hover-text)] px-2 py-1 rounded"
            >
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
            className="text-sm"
            style={
              {
                color: profile?.color || "#2563eb",
                "--hover-bg": profile?.color
                  ? `${profile.color}1a`
                  : "rgba(37, 99, 235, 0.1)",
                "--hover-text": profile?.color || "#2563eb",
                "--dark-hover-bg": profile?.color
                  ? `${profile.color}1a`
                  : "rgba(96, 165, 250, 0.1)",
                "--dark-hover-text": profile?.color || "#60a5fa",
              } as React.CSSProperties
            }
          >
            <Link
              href="/foro/crear-hilo"
              className="hover:bg-[var(--hover-bg)] dark:hover:bg-[var(--dark-hover-bg)] hover:text-[var(--hover-text)] dark:hover:text-[var(--dark-hover-text)] px-2 py-1 rounded"
            >
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
          />
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openAuthModal("login")}
            >
              Iniciar Sesión
            </Button>
            <Button size="sm" onClick={() => openAuthModal("register")}>
              Registrarse
            </Button>
          </div>
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
