import { createClient } from "@/lib/supabase/server";
import ServidoresContainer from "@/components/servidores/ServidoresContainer";
import { Servidor } from "@/types";

export const revalidate = 60; // Revalidar cada minuto

export default async function Servidores() {
  const supabase = await createClient();

  const { data: servidores, error } = await supabase
    .from("servidores")
    .select("*");

  if (error) {
    console.error("Error al cargar servidores:", error);
  }

  const initialServidores: Servidor[] = servidores || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Banner de la página */}
      <div className="bg-muted/40 dark:bg-amoled-gray py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Servidores de Minecraft
            </h1>
            <p className="text-xl text-muted-foreground">
              Encuentra los mejores servidores para jugar con amigos y la
              comunidad
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container py-8">
        <ServidoresContainer initialServidores={initialServidores} />
      </div>
    </div>
  );
}
