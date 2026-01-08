"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserTheme } from "@/hooks/useUserTheme";
import type { Database } from "@/lib/database.types";
import TiptapEditor from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CategorySelector,
  type Category,
} from "@/components/foro/CategorySelector";
import { WeaponStatsUploader } from "@/components/weapon/WeaponStatsUploader";
import type { WeaponStats } from "@/types/weapon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Target, CheckCircle, Eye } from "lucide-react";
import { WeaponStatsCard } from "@/components/weapon/WeaponStatsCard";
import { cn } from "@/lib/utils";
import { processEditorContent as processEditorImages } from "@/components/tiptap-editor/processImages";
import { useAutoGuardarHilo } from "@/hooks/useAutoGuardarHilo";

type CategoriaForo = Database["public"]["Tables"]["foro_categorias"]["Row"] & {
  subcategorias?: CategoriaForo[];
};

interface CrearHiloFormProps {
  categorias: CategoriaForo[];
  userId: string;
}

// Mantenemos la exportación nombrada para compatibilidad
export function CrearHiloForm({ categorias }: CrearHiloFormProps) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>(""); // Este será el UUID
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [isWeaponModalOpen, setIsWeaponModalOpen] = useState(false);
  const [weaponStatsPreview, setWeaponStatsPreview] =
    useState<WeaponStats | null>(null);
  const [weaponStatsRecordId, setWeaponStatsRecordId] = useState<string | null>(
    null
  );
  const { user } = useAuth();
  const router = useRouter();
  const { userColor } = useUserTheme();

  // Hook de autoguardado
  const { isAutoSaving, lastSavedAt, saveDraft, loadDraft, clearDraft } =
    useAutoGuardarHilo();
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Convertir categorías al formato esperado por CategorySelector (recursivo para 3 niveles)
  const formatCategory = (cat: CategoriaForo): Category => ({
    id: cat.id,
    nombre: cat.nombre,
    color: cat.color || undefined,
    subcategories: cat.subcategorias?.map(formatCategory),
  });

  const formattedCategories: Category[] = useMemo(() => {
    return categorias.map(formatCategory);
  }, [categorias]);

  // Función recursiva para encontrar una categoría por ID (soporta 3 niveles)
  const findCategoryById = (
    id: string,
    categories: Category[] = formattedCategories
  ): Category | null => {
    for (const cat of categories) {
      if (cat.id === id) return cat;
      if (cat.subcategories) {
        const found = findCategoryById(id, cat.subcategories);
        if (found) return found;
      }
    }
    return null;
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setCategoriaId(category.id);
  };

  const handleWeaponStatsExtracted = (
    stats: WeaponStats,
    recordId: string | null = null
  ) => {
    // Guardar las estadísticas para previsualización y estado del botón
    setWeaponStatsPreview(stats);
    // Guardar el recordId si viene del hook
    if (recordId) {
      setWeaponStatsRecordId(recordId);
    }

    // Cerrar el modal
    setIsWeaponModalOpen(false);

    // Mostrar mensaje de éxito
    toast.success("Estadísticas agregadas al contenido del hilo");
  };

  const clearWeaponStats = () => {
    setWeaponStatsPreview(null);
    setWeaponStatsRecordId(null);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cargar borrador al iniciar (solo una vez y si hay usuario)
  useEffect(() => {
    if (user && !draftLoaded) {
      const draft = loadDraft();
      if (draft) {
        // Confirmar si el usuario quiere restaurar el borrador
        toast("Se encontró un borrador no guardado", {
          action: {
            label: "Restaurar",
            onClick: () => {
              setTitulo(draft.titulo);
              setContenido(draft.contenido);
              setCategoriaId(draft.categoriaId);
              setWeaponStatsRecordId(draft.weaponStatsRecordId);

              if (draft.categoriaId) {
                const cat = findCategoryById(draft.categoriaId);
                if (cat) setSelectedCategory(cat);
              }

              toast.success("Borrador restaurado");
            },
          },
          duration: 8000,
        });
      }
      setDraftLoaded(true);
    }
  }, [user, draftLoaded, loadDraft, formattedCategories]);

  // Autoguardado al cambiar datos (debounce de 3s manual)
  useEffect(() => {
    if (!draftLoaded) return; // No guardar hasta intentar cargar

    const timer = setTimeout(() => {
      if (titulo || contenido || categoriaId) {
        saveDraft({
          titulo,
          contenido,
          categoriaId,
          weaponStatsRecordId,
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    titulo,
    contenido,
    categoriaId,
    weaponStatsRecordId,
    draftLoaded,
    saveDraft,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Debes iniciar sesión para crear un hilo.");
      return;
    }
    if (!titulo.trim() || !contenido.trim() || !categoriaId) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }

    setIsLoading(true);

    try {
      let contenidoProcesado = contenido;

      try {
        console.log(
          "[CrearHiloForm] Iniciando procesamiento de imágenes antes de guardar..."
        );
        console.log(
          "[CrearHiloForm] Contenido original (primeros 200 chars):",
          contenido.substring(0, 200)
        );

        contenidoProcesado = await processEditorImages(contenido);

        console.log("[CrearHiloForm] Procesamiento completado");
        console.log(
          "[CrearHiloForm] Contenido procesado (primeros 200 chars):",
          contenidoProcesado.substring(0, 200)
        );

        // Verificar si hay cambios
        if (contenidoProcesado === contenido) {
          console.warn(
            "[CrearHiloForm] ADVERTENCIA: El contenido no cambió después del procesamiento"
          );
        } else {
          console.log(
            "[CrearHiloForm] Contenido fue modificado durante el procesamiento"
          );
        }
      } catch (processingError) {
        console.error(
          "[CrearHiloForm] Error al procesar imágenes antes de guardar el hilo:",
          processingError
        );
        toast.error(
          "No se pudieron procesar algunas imágenes. Intenta nuevamente."
        );
        setIsLoading(false);
        return;
      }

      console.log(
        "[CrearHiloForm] Enviando hilo a API con contenido procesado..."
      );
      const response = await fetch("/api/foro/crear-hilo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          contenido: contenidoProcesado,
          categoria_id: categoriaId, // Enviar el UUID directamente
          weapon_stats_id: weaponStatsRecordId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear el hilo.");
      }

      const nuevoHilo = await response.json();
      toast.success("¡Hilo creado con éxito!");
      clearDraft(); // Limpiar borrador
      router.push(`/foro/hilos/${nuevoHilo.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ocurrió un error inesperado.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return <div className="text-center p-8">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-8 bg-white p-6 rounded-lg shadow-md dark:bg-card/80">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-foreground">
          Acceso Restringido
        </h2>
        <p className="mb-4 text-gray-700 dark:text-muted-foreground">
          Debes iniciar sesión para poder crear un nuevo hilo.
        </p>
        <Button onClick={() => router.push("/login?redirect=/foro/crear-hilo")}>
          Ir a Iniciar Sesión
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white dark:bg-transparent p-6 px-0 rounded-lg shadow-sm dark:shadow-none"
    >
      <div className="space-y-1">
        <label
          htmlFor="titulo"
          className="text-sm font-medium text-gray-900 dark:text-foreground"
        >
          Título del Hilo
        </label>
        <div className="relative">
          <Input
            id="titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Escribe un título claro y conciso"
            maxLength={100}
            required
            className="transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
            style={
              {
                "--tw-ring-color": userColor,
                "--tw-ring-opacity": "0.1",
                "--tw-ring-offset-width": "0.1px",
                "--tw-ring-offset-color": "hsl(var(--background))",
              } as React.CSSProperties
            }
          />
          {titulo.length > 0 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {titulo.length}/100
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-900 dark:text-foreground">
          Contenido
        </label>
        <div className="bg-white dark:bg-transparent">
          <TiptapEditor
            value={contenido}
            onChange={setContenido}
            placeholder="Escribe el contenido de tu hilo aquí..."
            userColor={userColor}
            className="min-h-[400px]"
          />
        </div>

        {weaponStatsPreview && (
          <div
            className="mt-3 rounded-md border border-dashed border-[var(--user-color,#6366f1)]/60 bg-[var(--user-color,#6366f1)]/5 p-4"
            style={{ "--user-color": userColor } as React.CSSProperties}
          >
            <div className="flex items-center gap-2 text-[var(--user-color,#6366f1)] mb-3">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Previsualización de estadísticas cargadas
              </span>
            </div>
            <div className="max-w-md">
              <WeaponStatsCard stats={weaponStatsPreview} className="w-full" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-[var(--user-color,#6366f1)] hover:text-[var(--user-color,#6366f1)]/80"
              onClick={clearWeaponStats}
              style={{ "--user-color": userColor } as React.CSSProperties}
            >
              Quitar estadísticas
            </Button>
          </div>
        )}

        {/* Botón para análisis de armas */}
        <div className="flex justify-end mt-2">
          <Dialog open={isWeaponModalOpen} onOpenChange={setIsWeaponModalOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant={weaponStatsPreview ? "default" : "outline"}
                size="sm"
                className={cn(
                  "border-[var(--user-color,#6366f1)] text-[var(--user-color,#6366f1)] hover:bg-[var(--user-color,#6366f1)]/10",
                  weaponStatsPreview &&
                    "bg-[var(--user-color,#6366f1)] text-white hover:bg-[var(--user-color,#6366f1)]/90 border-transparent"
                )}
                style={{ "--user-color": userColor } as React.CSSProperties}
              >
                {weaponStatsPreview ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Target className="w-4 h-4 mr-2" />
                )}
                {weaponStatsPreview
                  ? "Estadísticas listas para compartir"
                  : "Analizar Estadísticas de Arma"}
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-none !w-[85vw] h-auto md:h-[90vh] p-0 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <DialogHeader>
                  <DialogTitle>Análisis de Estadísticas de Arma</DialogTitle>
                  <DialogDescription>
                    Sube una captura de pantalla de las estadísticas de tu arma
                    para analizarlas automáticamente
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div
                className="flex-1 overflow-y-auto p-4 min-h-0"
                style={{ "--user-color": userColor } as React.CSSProperties}
              >
                <WeaponStatsUploader
                  onStatsExtracted={handleWeaponStatsExtracted}
                  onClose={() => setIsWeaponModalOpen(false)}
                  className="h-full"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="categoria"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Categoría
        </label>
        <div className="bg-card dark:bg-black/80 border border-border rounded-md p-4 max-h-[400px] overflow-y-auto shadow-sm">
          {selectedCategory && (
            <div className="mb-4 pb-3 border-b border-border/50">
              <p className="text-sm text-muted-foreground mb-1">
                Categoría seleccionada:
              </p>
              <div className="flex items-center">
                {selectedCategory.color && (
                  <div
                    className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                )}
                <span className="font-medium text-foreground truncate">
                  {selectedCategory.nombre}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-muted-foreground hover:text-foreground hover:bg-transparent"
                  onClick={() => {
                    setSelectedCategory(null);
                    setCategoriaId("");
                  }}
                >
                  Cambiar
                </Button>
              </div>
            </div>
          )}

          {!selectedCategory && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Selecciona una categoría:
              </p>
              <CategorySelector
                categories={formattedCategories}
                selectedCategoryId={categoriaId}
                onSelectCategory={handleCategorySelect}
              />
            </div>
          )}
        </div>
        {categoriaId === "" && (
          <p className="text-red-500 text-sm mt-1">
            Debes seleccionar una categoría
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Publicando..." : "Publicar Hilo"}
        </Button>
      </div>
    </form>
  );
}

// Añadimos la exportación por defecto para solucionar el error de compilación
export default CrearHiloForm;
