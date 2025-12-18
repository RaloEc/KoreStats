"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthModal } from "@/components/auth/AuthModal";
import { useHeaderLogic } from "./header/useHeaderLogic";
import { HeaderDesktopNav } from "./header/HeaderDesktopNav";
import { HeaderRightControls } from "./header/HeaderRightControls";
import { HeaderMobileMenu } from "./header/HeaderMobileMenu";
import { Search } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Input } from "@/components/ui/input";
import { SearchDropdown } from "./header/SearchDropdown";

const Header: React.FC = () => {
  const [showMobileSearchDropdown, setShowMobileSearchDropdown] =
    useState(false);

  const {
    // Estados
    isMenuOpen,
    setIsMenuOpen,
    isUserMenuOpen,
    setIsUserMenuOpen,
    isAdmin,
    isAdminMenuOpen,
    setIsAdminMenuOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    authRedirectTo,
    searchQuery,
    setSearchQuery,
    foroCategorias,
    foroMobileOpen,
    setForoMobileOpen,
    noticiasMobileOpen,
    setNoticiasMobileOpen,
    expandedCategories,
    setExpandedCategories,
    isLoggingOut,

    // Referencias
    adminMenuRef,
    userMenuRef,
    userButtonRef,

    // Datos de autenticación
    authUser,
    profile,

    // Funciones
    handleLogout,
    closeAllMenus,
    openAuthModal,
    handleSearch,
  } = useHeaderLogic();

  return (
    <>
      {/* Backdrop blur overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all duration-300 animate-in fade-in"
          onClick={closeAllMenus}
          style={{ top: "64px" }} // Empieza después del header (h-16 = 64px)
        />
      )}

      <div
        role="banner"
        className="hidden lg:block fixed top-0 left-0 right-0 z-50 border-b border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm w-full"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2 md:gap-4">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link
                className="flex items-center gap-3"
                href="/"
                onClick={closeAllMenus}
              >
                <Image
                  src="/images/logo.png"
                  alt="KoreStats Logo"
                  width={32}
                  height={32}
                  priority
                />
                <span className="hidden xs:block font-bold text-lg bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                  KoreStats
                </span>
              </Link>
            </div>

            {/* Navegación Desktop y Búsqueda */}
            <HeaderDesktopNav
              isAdmin={isAdmin}
              isAdminMenuOpen={isAdminMenuOpen}
              setIsAdminMenuOpen={setIsAdminMenuOpen}
              closeAllMenus={closeAllMenus}
              profile={profile}
              adminMenuRef={adminMenuRef}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleSearch={handleSearch}
            />

            {/* Barra de búsqueda móvil - Solo visible en móviles */}
            <div className="flex-1 max-w-md mx-4 block md:hidden relative">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none z-10" />
                <Input
                  type="search"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Abre el dropdown automáticamente cuando hay al menos 2 caracteres
                    if (e.target.value.length >= 2) {
                      setShowMobileSearchDropdown(true);
                    } else {
                      setShowMobileSearchDropdown(false);
                    }
                  }}
                  onFocus={() =>
                    searchQuery.length >= 2 && setShowMobileSearchDropdown(true)
                  }
                  onBlur={() => {
                    // Cierra el dropdown después de un pequeño delay para permitir clicks en el dropdown
                    setTimeout(() => {
                      setShowMobileSearchDropdown(false);
                    }, 150);
                  }}
                  style={
                    {
                      "--focus-border-color": profile?.color || "#3b82f6",
                      "--focus-ring-color": profile?.color
                        ? `${profile.color}40`
                        : "rgba(59, 130, 246, 0.25)",
                    } as React.CSSProperties
                  }
                  className={`pl-10 pr-4 py-2 w-full bg-gray-50 dark:bg-black border-gray-200 dark:border-gray-800 rounded-full
                focus:border-[var(--focus-border-color)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]
                dark:focus:border-[var(--focus-border-color)] dark:focus-visible:ring-2 dark:focus-visible:ring-[var(--focus-ring-color)]
                transition-colors duration-200`}
                />

                {/* Dropdown de búsqueda en tiempo real para móvil */}
                <div className="absolute top-full left-0 right-0 mt-1 z-50">
                  <SearchDropdown
                    query={searchQuery}
                    isOpen={showMobileSearchDropdown}
                    onClose={() => setShowMobileSearchDropdown(false)}
                    profileColor={profile?.color}
                  />
                </div>
              </form>
            </div>

            {/* Controles del lado derecho */}
            <NotificationBell />
            <HeaderRightControls
              isAdmin={isAdmin}
              authUser={authUser}
              profile={profile}
              isUserMenuOpen={isUserMenuOpen}
              setIsUserMenuOpen={setIsUserMenuOpen}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              userButtonRef={userButtonRef}
              userMenuRef={userMenuRef}
              handleLogout={handleLogout}
              openAuthModal={openAuthModal}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>

        {/* Menú móvil */}
        <HeaderMobileMenu
          isOpen={isMenuOpen}
          authUser={authUser}
          profile={profile}
          closeAllMenus={closeAllMenus}
          handleLogout={handleLogout}
          openAuthModal={openAuthModal}
          noticiasMobileOpen={noticiasMobileOpen}
          setNoticiasMobileOpen={setNoticiasMobileOpen}
          foroMobileOpen={foroMobileOpen}
          setForoMobileOpen={setForoMobileOpen}
          foroCategorias={foroCategorias}
          expandedCategories={expandedCategories}
          setExpandedCategories={setExpandedCategories}
          isAdmin={isAdmin}
          isLoggingOut={isLoggingOut}
        />

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultMode={authModalMode}
          redirectTo={authRedirectTo}
        />
      </div>
    </>
  );
};

export default Header;
