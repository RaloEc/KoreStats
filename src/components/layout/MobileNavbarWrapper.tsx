"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { AuthModal } from "@/components/auth/AuthModal";

const MobileNavbar = dynamic(() => import("./MobileNavbar"), {
  ssr: false,
});

export const MobileNavbarWrapper: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">(
    "login"
  );

  const handleOpenAuthModal = (mode: "login" | "register") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <MobileNavbar onOpenAuthModal={handleOpenAuthModal} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </>
  );
};

export default MobileNavbarWrapper;
