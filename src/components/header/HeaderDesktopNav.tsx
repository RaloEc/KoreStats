import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AdminDesktopMenu } from "./AdminDesktopMenu";
import { SearchDropdown } from "./SearchDropdown";

interface HeaderDesktopNavProps {
  isAdmin: boolean;
  isAdminMenuOpen: boolean;
  setIsAdminMenuOpen: (value: boolean) => void;
  closeAllMenus: () => void;
  profile?: {
    color?: string;
  } | null;
  adminMenuRef: React.RefObject<HTMLLIElement>;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;
}

export const HeaderDesktopNav: React.FC<HeaderDesktopNavProps> = ({
  isAdmin,
  isAdminMenuOpen,
  setIsAdminMenuOpen,
  closeAllMenus,
  profile,
  adminMenuRef,
  searchQuery,
  setSearchQuery,
  handleSearch,
}) => {
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  return (
    <>
      {/* Navegación principal - Solo Desktop */}
      <nav aria-label="Global" className="hidden lg:block">
        <ul className="flex items-center gap-1 text-sm">
          <li className="menu-item">
            <Link
              href="/noticias"
              className="px-4 py-2 rounded-lg transition-colors font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={closeAllMenus}
            >
              Noticias
            </Link>
          </li>
          <li className="menu-item">
            <Link
              href="/foro"
              className="px-4 py-2 rounded-lg transition-colors font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={closeAllMenus}
            >
              Foro
            </Link>
          </li>
          {isAdmin && (
            <AdminDesktopMenu
              isOpen={isAdminMenuOpen}
              onToggle={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              onClose={() => setIsAdminMenuOpen(false)}
              menuRef={adminMenuRef}
            />
          )}
        </ul>
      </nav>

      {/* Barra de búsqueda centrada - solo desktop */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar noticias, hilos, usuarios (@nombre)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Abre el dropdown automáticamente cuando hay al menos 2 caracteres
              if (e.target.value.length >= 2) {
                setShowSearchDropdown(true);
              }
            }}
            onFocus={() =>
              searchQuery.length >= 2 && setShowSearchDropdown(true)
            }
            onBlur={() => {
              // Cierra el dropdown después de un pequeño delay para permitir clicks en el dropdown
              setTimeout(() => {
                setShowSearchDropdown(false);
              }, 150);
            }}
            className="pl-10 pr-4 py-2 w-full bg-gray-50 dark:bg-black border-gray-200 dark:border-gray-800 rounded-full focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-colors duration-200"
          />

          {/* Dropdown de búsqueda en tiempo real */}
          <SearchDropdown
            query={searchQuery}
            isOpen={showSearchDropdown}
            onClose={() => setShowSearchDropdown(false)}
          />
        </form>
      </div>
    </>
  );
};
