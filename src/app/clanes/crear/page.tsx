import React, { Suspense } from "react";
import { Metadata } from "next";
import CreateClanForm from "@/components/clanes/CreateClanForm";
import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import { getAllGames } from "@/lib/games/games-data";

export const metadata: Metadata = {
  title: "Crear Clan | KoreStats",
  description:
    "Funda tu propio clan en KoreStats para League of Legends o Delta Force. Establece requisitos, política de ingreso y conecta tu servidor de Discord.",
};

interface CreateClanPageProps {
  searchParams: Promise<{ game?: string }>;
}

export default async function CreateClanPage({ searchParams }: CreateClanPageProps) {
  const params = await searchParams;
  const gameParam = params.game;
  const defaultGame =
    gameParam === "league_of_legends" || gameParam === "delta_force"
      ? gameParam
      : undefined;

  // Obtener todos los juegos para el selector
  const allGames = await getAllGames();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb */}
        <Link
          href="/clanes"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-8 transition-colors uppercase tracking-widest"
        >
          <ChevronLeft size={14} />
          Volver al directorio
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Shield size={20} className="text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                Fundar un Clan
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Crea tu comunidad en KoreStats
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Tu clan aparecerá en el directorio público. Como fundador, serás el{" "}
            <strong className="text-gray-900 dark:text-white">Líder</strong> y podrás
            gestionar miembros, aceptar solicitudes e invitar jugadores.
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-transparent md:bg-white md:dark:bg-white/[0.02] md:border border-gray-200 dark:border-white/[0.07] rounded-none md:rounded-2xl md:p-8">
          <Suspense fallback={<div className="py-10 text-center text-gray-400">Cargando formulario...</div>}>
            <CreateClanForm defaultGame={defaultGame} games={allGames} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
