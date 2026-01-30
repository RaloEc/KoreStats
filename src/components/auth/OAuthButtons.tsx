"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getRedirectUrl } from "@/lib/utils/auth-utils";

type Provider = "discord" | "facebook" | "google" | "twitch";

interface OAuthButtonsProps {
  redirectTo?: string;
  className?: string;
  onSuccess?: () => void;
}

export function OAuthButtons({
  redirectTo = "/",
  className = "",
  onSuccess,
}: OAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState<Provider | null>(null);
  const supabase = createClient();

  const handleOAuthSignIn = async (provider: Provider) => {
    try {
      setIsLoading(provider);
      // Usar URL absoluta completa para evitar problemas de redirección
      // Usar NEXT_PUBLIC_SITE_URL si está disponible, de lo contrario usar window.location.origin
      const baseUrl =
        typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
          ? process.env.NEXT_PUBLIC_SITE_URL
          : window.location.origin;

      console.log("Base URL para redirección OAuth:", baseUrl);

      const redirectUrl = new URL("/auth/callback", baseUrl);
      // Obtener la URL guardada para redirección o usar la página principal
      const targetRedirect = getRedirectUrl("/");
      redirectUrl.searchParams.set("redirect", targetRedirect);

      console.log("Iniciando OAuth con:", {
        provider,
        redirectTo: redirectUrl.toString(),
      });

      // Configuración específica para cada proveedor
      const options: {
        redirectTo: string;
        skipBrowserRedirect: boolean;
        queryParams?: Record<string, string>;
      } = {
        redirectTo: redirectUrl.toString(),
        skipBrowserRedirect: false,
      };

      // Google requiere configuración adicional para asegurar que funcione correctamente
      if (provider === "google") {
        options.queryParams = {
          // Solicitar acceso al email y perfil básico
          access_type: "offline",
          prompt: "consent",
        };
      }

      console.log(`Iniciando OAuth con ${provider}, opciones:`, options);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      // Verificar si tenemos una URL para redireccionar
      if (data?.url) {
        console.log(`Redirigiendo a: ${data.url}`);
      }

      if (error) {
        toast.error(
          `Error al iniciar sesión con ${provider}: ${error.message}`,
        );
      }
    } catch (error) {
      console.error(`Error OAuth ${provider}:`, error);
      toast.error(`Ocurrió un error al conectar con ${provider}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/*GOOGLE*/}
      <Button
        variant="outline"
        onClick={() => handleOAuthSignIn("google")}
        disabled={isLoading !== null}
        className="flex items-center justify-center gap-3 h-11 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all font-bold text-zinc-700 dark:text-zinc-200"
      >
        {isLoading === "google" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continuar con Google
      </Button>
    </div>
  );
}
