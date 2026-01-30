"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { getRedirectUrl } from "@/lib/utils/auth-utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
  redirectTo?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultMode = "login",
  redirectTo,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Actualizar el modo cuando cambie defaultMode
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  const { refreshAuth } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setConfirmPassword("");
    setError("");
    setMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError("");
    setMessage("");
  };

  const validateForm = () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos requeridos");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Por favor ingresa un email válido");
      return false;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    if (mode === "register") {
      if (!username) {
        setError("El nombre de usuario es requerido");
        return false;
      }

      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden");
        return false;
      }

      if (username.length < 3) {
        setError("El nombre de usuario debe tener al menos 3 caracteres");
        return false;
      }
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Credenciales inválidas. Verifica tu email y contraseña.");
        } else if (error.message.includes("Email not confirmed")) {
          setError(
            "Correo electrónico no confirmado. Por favor, verifica tu bandeja de entrada.",
          );
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        // No necesitamos llamar a refreshAuth() aquí porque el listener en AuthContext
        // ya se encarga de actualizar el estado cuando detecta el evento SIGNED_IN
        // refreshAuth();

        setMessage("¡Inicio de sesión exitoso!");

        // Cerrar modal y redirigir inmediatamente
        handleClose();
        const targetRedirect = redirectTo || getRedirectUrl("/");
        router.push(targetRedirect);
        router.refresh(); // Forzar refresh de la página
      }
    } catch (error) {
      console.error("Error en login:", error);
      setError("Error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      // Registrar usuario
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          setError("Este email ya está registrado. Intenta iniciar sesión.");
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        // Crear perfil
        try {
          console.log("Enviando datos para crear perfil:", {
            userId: data.user.id,
            username: username,
          });

          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: data.user.id,
              username: username,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Respuesta de error completa:", errorText);
            let errorMessage = "Error al crear el perfil";

            try {
              const result = JSON.parse(errorText);
              errorMessage = result.error || errorMessage;
            } catch (parseError) {
              console.error("Error al parsear respuesta:", parseError);
            }

            throw new Error(errorMessage);
          }

          const result = await response.json();

          setMessage(
            "¡Registro exitoso! Revisa tu email para confirmar tu cuenta y luego inicia sesión.",
          );
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setUsername("");
        } catch (profileError: any) {
          console.error("Error al crear perfil:", profileError);
          setError(
            `Error al crear perfil: ${
              profileError.message || "Contacta al administrador."
            }`,
          );

          // Intentar cerrar sesión para evitar problemas con usuario sin perfil
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error(
              "Error al cerrar sesión después de fallo en creación de perfil:",
              signOutError,
            );
          }
        }
      }
    } catch (error) {
      console.error("Error en registro:", error);
      setError("Error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px] md:max-w-md mx-auto p-0 overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-950">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="p-6 md:p-8 pt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-extrabold text-center tracking-tight text-zinc-900 dark:text-zinc-50">
                  {mode === "login"
                    ? "¡Bienvenido de nuevo!"
                    : "Crea tu cuenta"}
                </DialogTitle>
                <p className="text-center text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                  {mode === "login"
                    ? "Ingresa tus credenciales para continuar"
                    : "Únete a nuestra comunidad de jugadores"}
                </p>
              </DialogHeader>

              <div className="space-y-5">
                <form
                  onSubmit={mode === "login" ? handleLogin : handleRegister}
                  className="space-y-4"
                >
                  {mode === "register" && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="username"
                        className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1"
                      >
                        Nombre de usuario
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Tu nombre de usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        required
                        className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <Label
                        htmlFor="password"
                        title=""
                        className="text-xs font-bold uppercase tracking-wider text-zinc-500"
                      >
                        Contraseña
                      </Label>
                      {mode === "login" && (
                        <Button
                          variant="link"
                          className="p-0 h-auto text-[11px] font-semibold text-blue-500"
                          type="button"
                        >
                          ¿Olvidaste tu contraseña?
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-zinc-400"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {mode === "register" && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="confirmPassword"
                        title=""
                        className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1"
                      >
                        Confirmar contraseña
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirma tu contraseña"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={loading}
                          required
                          className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-zinc-400"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          disabled={loading}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-500/20 animate-in fade-in zoom-in-95">
                      {error}
                    </div>
                  )}

                  {message && (
                    <div className="text-sm font-medium text-green-500 bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-500/20 animate-in fade-in zoom-in-95">
                      {message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20 text-zinc-950 dark:text-white"
                    disabled={loading}
                  >
                    {loading
                      ? "Procesando..."
                      : mode === "login"
                        ? "Iniciar Sesión"
                        : "Crear Cuenta"}
                  </Button>
                </form>

                {/* Switch Mode */}
                <div className="text-center text-sm pt-2">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {mode === "login"
                      ? "¿No tienes cuenta? "
                      : "¿Ya tienes cuenta? "}
                  </span>
                  <Button
                    variant="link"
                    className="p-0 h-auto font-bold text-blue-500 hover:text-blue-600 transition-colors"
                    onClick={() =>
                      switchMode(mode === "login" ? "register" : "login")
                    }
                    disabled={loading}
                  >
                    {mode === "login"
                      ? "Regístrate aquí"
                      : "Inicia sesión aquí"}
                  </Button>
                </div>

                {/* Separador */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full dark:bg-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold">
                    <span className="bg-white dark:bg-zinc-950 px-4 text-zinc-400">
                      O continúa con
                    </span>
                  </div>
                </div>

                {/* Botones OAuth */}
                <OAuthButtons
                  onSuccess={() => {
                    setMessage("¡Inicio de sesión exitoso!");
                    setTimeout(() => {
                      handleClose();
                      const targetRedirect = getRedirectUrl("/");
                      router.push(targetRedirect);
                    }, 1000);
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer (Opcional) */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-400 font-medium">
            Al continuar, aceptas nuestros Términos de Servicio y Política de
            Privacidad.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
