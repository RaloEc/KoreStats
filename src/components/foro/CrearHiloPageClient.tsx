"use client";

import { useEffect, useState } from "react";
import CrearHiloForm from "@/components/foro/CrearHiloForm";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { useUserTheme } from "@/hooks/useUserTheme";

export default function CrearHiloPageClient({
  categorias,
  userId,
}: {
  categorias: any[];
  userId: string;
}) {
  const [loading, setLoading] = useState(false);
  const { getThemeAdjustedBorderColor } = useUserTheme();
  const borderStyle = getThemeAdjustedBorderColor(0.5);

  // Removed useEffect fetching logic

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl py-1 px-0 sm:px-6 lg:px-8">
        <div className="backdrop-blur-md border border-gray-700/50 rounded-lg shadow-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-0 px-0 sm:px-6 lg:px-8">
      <div
        className="backdrop-blur-md rounded-lg shadow-lg p-6"
        style={{
          border: "1px solid",
          ...borderStyle,
        }}
      >
        <h1
          className="text-3xl font-bold text-gray-900 dark:text-foreground mb-1 pb-2"
          style={{
            borderBottom: `2px solid ${borderStyle.borderColor}`,
            borderColor: borderStyle.borderColor,
          }}
        >
          Crear Nuevo Hilo
        </h1>
        <CrearHiloForm categorias={categorias} userId={userId} />
      </div>
    </div>
  );
}
