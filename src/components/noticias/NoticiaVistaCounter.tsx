"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NoticiaVistaCounter({
  noticiaId,
}: {
  noticiaId: string;
}) {
  const hasCountedView = useRef(false);

  useEffect(() => {
    const incrementarVista = async () => {
      // Verificar si ya se incrementó en esta sesión
      const sessionKey = `vista_contada_${noticiaId}`;
      const yaContado = sessionStorage.getItem(sessionKey);

      if (hasCountedView.current || yaContado) {
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase.rpc("incrementar_vista_noticia", {
          noticia_id: noticiaId,
        });

        if (error) {
          console.error("❌ Error al incrementar vista:", error);
          return;
        }

        hasCountedView.current = true;
        sessionStorage.setItem(sessionKey, "true");
      } catch (e) {
        console.error("❌ Error al incrementar vista de noticia:", e);
      }
    };

    // Ejecutar tras montar con un pequeño delay
    const timer = setTimeout(incrementarVista, 1000);

    return () => clearTimeout(timer);
  }, [noticiaId]);

  return null;
}
