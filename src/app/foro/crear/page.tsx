import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CrearHiloPageClient from "@/components/foro/CrearHiloPageClient";

export const metadata = {
  title: "Crear Nuevo Hilo - Foro KoreStats",
  description: "Crea un nuevo tema de discusión en el foro.",
};

export default async function CrearHiloPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Debes iniciar sesión para crear un hilo.");
  }

  // Obtener todas las categorías con datos completos
  const { data: categoriasPlanas, error } = await supabase
    .from("foro_categorias")
    .select("id, nombre, descripcion, color, parent_id, nivel, orden, icono")
    .order("orden", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Error</h1>
        <p>No se pudieron cargar las categorías del foro.</p>
      </div>
    );
  }

  // Convertir la lista plana en estructura jerárquica
  const categoriasMap: Record<string, any> = {};
  const categoriasJerarquicas: any[] = [];

  if (categoriasPlanas) {
    categoriasPlanas.forEach((cat) => {
      categoriasMap[cat.id] = {
        ...cat,
        hijos: [],
      };
    });

    categoriasPlanas.forEach((cat) => {
      if (cat.parent_id && categoriasMap[cat.parent_id]) {
        categoriasMap[cat.parent_id].hijos.push(categoriasMap[cat.id]);
      } else {
        categoriasJerarquicas.push(categoriasMap[cat.id]);
      }
    });
  }

  return (
    <CrearHiloPageClient categorias={categoriasJerarquicas} userId={user.id} />
  );
}
