"use client";

import React, { useState, memo, useCallback } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { MobileNavbar } from "./MobileNavbar";

/**
 * MobileNavbarWrapper - Wrapper que mantiene el estado del modal de autenticación
 *
 * Este componente NO debe usar dynamic import internamente ya que
 * eso se hace en layout.tsx. Aquí solo manejamos el estado del AuthModal.
 */
const MobileNavbarWrapper: React.FC = memo(function MobileNavbarWrapper() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">(
    "login"
  );

  const handleOpenAuthModal = useCallback((mode: "login" | "register") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <>
      <MobileNavbar onOpenAuthModal={handleOpenAuthModal} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        defaultMode={authModalMode}
      />
    </>
  );
});

export { MobileNavbarWrapper };
export default MobileNavbarWrapper;
