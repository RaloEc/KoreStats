"use client";

import { useAuthModal } from "@/hooks/useAuthModal";
import { AuthModal } from "@/components/auth/AuthModal";

export function AuthModalWrapper() {
  const { isOpen, close, redirectTo } = useAuthModal();

  return <AuthModal isOpen={isOpen} onClose={close} redirectTo={redirectTo} />;
}
