"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface NoticiaAutorProps {
  nombre: string;
  autorId?: string | null;
  avatar?: string | null;
  color?: string;
  rol?: "admin" | "moderator" | "user";
  fecha: string;
  vistas?: number;
}

const NoticiaAutor: React.FC<NoticiaAutorProps> = ({
  nombre,
  autorId,
  avatar,
  color = "#4B5563",
  rol = "user",
  fecha,
  vistas = 0,
}) => {
  // Usar autorId si está disponible, sino usar nombre como fallback
  const perfilUrl = autorId
    ? `/perfil/${encodeURIComponent(autorId)}`
    : `/perfil/${encodeURIComponent(nombre || "")}`;
  return (
    <div className="flex flex-col mb-4 border-b pb-6">
      {/* Autor con foto e info */}
      <div className="flex items-center gap-3 mb-4">
        {/* Enlace al perfil del autor */}
        <Link
          href={perfilUrl}
          className="flex items-center gap-3 group/author"
          title={`Ver perfil de ${nombre || "usuario"}`}
        >
          {/* Imagen de perfil del autor */}
          <div className="flex-shrink-0">
            {avatar ? (
              <div className="relative size-16 overflow-hidden rounded-full group-hover/author:ring-2 group-hover/author:ring-primary transition-all duration-200">
                <Image
                  src={avatar}
                  alt={`Foto de ${nombre || "Anónimo"}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  loading="lazy"
                />
              </div>
            ) : (
              <div
                className="size-16 flex items-center justify-center rounded-full text-white font-semibold text-lg group-hover/author:ring-2 group-hover/author:ring-primary transition-all duration-200"
                style={{
                  backgroundColor: color || "#4B5563",
                }}
              >
                {nombre ? nombre.charAt(0).toUpperCase() : "A"}
              </div>
            )}
          </div>

          {/* Información del autor */}
          <div className="flex flex-col">
            <div className="font-medium group-hover/author:text-primary transition-colors duration-200 flex items-center gap-1">
              {nombre || "Anónimo"}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover/author:opacity-100 transition-opacity duration-200" />
            </div>
            {rol && (
              <Badge
                variant="outline"
                className="w-fit mt-1 text-xs"
                style={{
                  borderColor: color || "#4B5563",
                  color: color || "#4B5563",
                }}
              >
                {rol === "admin" && "Administrador"}
                {rol === "moderator" && "Moderador"}
                {rol === "user" && "Usuario"}
              </Badge>
            )}
          </div>
        </Link>
      </div>

      {/* Fecha y vistas en vivo */}
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-center">
          {new Date(fecha || Date.now()).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-eye"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{typeof vistas === "number" ? vistas : 0} vistas</span>
        </div>
      </div>
    </div>
  );
};

// Memoizar el componente para evitar re-renderizados innecesarios
export default React.memo(NoticiaAutor);
