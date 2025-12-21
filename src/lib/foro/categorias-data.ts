import { getServiceClient } from "@/utils/supabase-service";

export type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  color: string | null;
  icono: string | null;
  orden: number | null;
  es_activa: boolean | null;
  nivel: number | null;
  parent_id: string | null;
  hilos_count?: number;
  subcategorias?: Categoria[];
  abierta?: boolean;
};

export async function getCategoriasTree(limitRoots = 6): Promise<Categoria[]> {
  const supabase = getServiceClient();

  // 1. Obtener categorías activas
  const { data: todasCategorias, error } = await supabase
    .from("foro_categorias")
    .select("*")
    .eq("es_activa", true)
    .order("orden", { ascending: true });

  if (error || !todasCategorias) return [];

  // 2. Construir árbol
  const construirArbol = (parentId: string | null = null): Categoria[] => {
    return todasCategorias
      .filter((cat) => cat.parent_id === parentId)
      .map((cat) => ({
        ...cat,
        abierta: false,
        subcategorias: construirArbol(cat.id),
      }));
  };

  const roots = construirArbol(null).slice(0, limitRoots);

  // 3. Obtener conteos (opcional, si es costoso se puede omitir o cachear)
  // Para optimizar en servidor, haremos una query agregada si es posible, o iterativa server-side (rápida por red interna)

  // Aplanar IDs para conteo
  const obtenerTodosLosIds = (cats: Categoria[]): string[] => {
    return cats.reduce<string[]>((acc, cat) => {
      return [
        ...acc,
        cat.id,
        ...(cat.subcategorias ? obtenerTodosLosIds(cat.subcategorias) : []),
      ];
    }, []);
  };

  const allIds = obtenerTodosLosIds(roots);

  if (allIds.length === 0) return roots;

  // Optimización: Promise.all para conteos en paralelo
  const conteos = await Promise.all(
    allIds.map(async (id) => {
      const { count } = await supabase
        .from("foro_hilos")
        .select("*", { count: "exact", head: true })
        .eq("categoria_id", id)
        .is("deleted_at", null); // Importante: ignorar borrados
      return { id, count: count || 0 };
    })
  );

  // Inyectar conteos
  const injectCounts = (cats: Categoria[]): Categoria[] => {
    return cats.map((cat) => {
      const c = conteos.find((x) => x.id === cat.id);
      return {
        ...cat,
        hilos_count: c?.count || 0,
        subcategorias: cat.subcategorias ? injectCounts(cat.subcategorias) : [],
      };
    });
  };

  return injectCounts(roots);
}
