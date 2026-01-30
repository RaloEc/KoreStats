import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials, normalizeAvatarUrl } from "@/lib/utils/avatar-utils";
import { User, LogOut, Loader2, Settings } from "lucide-react";
import { LegalModal } from "@/components/legal/LegalModal";

interface UserDesktopMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
  authUser: any;
  profile?: {
    username?: string;
    avatar_url?: string;
    role?: string;
  } | null;
  userButtonRef: React.RefObject<HTMLButtonElement>;
  userMenuRef: React.RefObject<HTMLDivElement>;
  isLoggingOut: boolean;
  onOpenSettings: () => void;
}

export const UserDesktopMenu: React.FC<UserDesktopMenuProps> = ({
  isOpen,
  onToggle,
  onClose,
  onLogout,
  authUser,
  profile,
  userButtonRef,
  userMenuRef,
  isLoggingOut,
  onOpenSettings,
}) => {
  return (
    <div className="relative">
      <button
        ref={userButtonRef}
        type="button"
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={onToggle}
      >
        <Avatar className="w-8 h-8">
          {normalizeAvatarUrl(profile?.avatar_url) ? (
            <AvatarImage
              src={
                normalizeAvatarUrl(profile?.avatar_url) ||
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
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {getUserInitials(
              profile?.username || authUser?.user_metadata?.full_name || "",
              1,
              "U",
            )}
          </AvatarFallback>
        </Avatar>
      </button>
      {isOpen && (
        <div
          ref={userMenuRef}
          className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg border z-50 bg-white dark:bg-black border-gray-200 dark:border-gray-800"
        >
          <div className="p-3">
            <div className="flex items-center px-3 py-3 border-b border-gray-200/50 dark:border-gray-800/50 mb-2">
              <Avatar className="w-10 h-10 mr-3">
                {normalizeAvatarUrl(profile?.avatar_url) ? (
                  <AvatarImage
                    src={
                      normalizeAvatarUrl(profile?.avatar_url) ||
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
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {getUserInitials(
                    profile?.username ||
                      authUser?.user_metadata?.full_name ||
                      "",
                    1,
                    "U",
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {profile?.username ||
                      authUser?.user_metadata?.full_name ||
                      authUser?.user_metadata?.name ||
                      authUser?.email?.split("@")[0] ||
                      "Usuario"}
                  </span>
                  <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60">
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
            <div className="space-y-1">
              <Link
                href="/perfil"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={onClose}
              >
                <User className="h-4 w-4" />
                Mi Perfil
              </Link>
              <LegalModal
                trigger={
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Aviso legal
                  </button>
                }
              />
              <button
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Settings className="h-4 w-4" />
                Ajustes
              </button>
              <div className="border-t border-gray-200/70 dark:border-gray-800/70" />
              <button
                onClick={onLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
