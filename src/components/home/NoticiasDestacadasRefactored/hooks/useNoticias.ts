import { useQuery } from "@tanstack/react-query";
import { CACHE_TIME } from "../constants";
import { Noticia, TabType } from "../types";

export function useNoticias(
  activeTab: TabType,
  initialDestacadas?: Noticia[],
  initialRecientes?: Noticia[]
) {
  // Función para obtener noticias
  const fetchNoticias = async (tipo: string): Promise<Noticia[]> => {
    const res = await fetch(
      `/api/noticias?limit=${tipo === "recientes" ? "4" : "5"}&tipo=${tipo}`
    );
    if (!res.ok) {
      throw new Error("Error al cargar las noticias");
    }
    const data = await res.json();
    return data.data || [];
  };

  // Cargar TODAS las pestañas en paralelo desde el inicio
  const { data: destacadas = [], isLoading: isLoadingDestacadas } = useQuery({
    queryKey: ["noticias", "destacadas"],
    queryFn: () => fetchNoticias("destacadas"),
    staleTime: CACHE_TIME,
    initialData: initialDestacadas,
  });

  const { data: recientes = [], isLoading: isLoadingRecientes } = useQuery({
    queryKey: ["noticias", "recientes"],
    queryFn: () => fetchNoticias("recientes"),
    staleTime: CACHE_TIME,
    initialData: initialRecientes,
  });

  const { data: populares = [], isLoading: isLoadingPopulares } = useQuery({
    queryKey: ["noticias", "populares"],
    queryFn: () => fetchNoticias("populares"),
    staleTime: CACHE_TIME,
  });

  // Seleccionar noticias según la pestaña activa
  const noticias =
    activeTab === "destacadas"
      ? destacadas
      : activeTab === "recientes"
      ? recientes
      : populares;

  // Loading solo de la pestaña activa (las otras ya están cargadas)
  const loading =
    activeTab === "destacadas"
      ? isLoadingDestacadas && !initialDestacadas
      : activeTab === "recientes"
      ? isLoadingRecientes && !initialRecientes
      : isLoadingPopulares;

  return {
    noticias,
    ultimasNoticias: recientes,
    loading,
    isLoadingNoticias: loading,
    isLoadingUltimas: isLoadingRecientes,
    isErrorNoticias: false,
  };
}
