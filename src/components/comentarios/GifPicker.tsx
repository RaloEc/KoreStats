"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GIF_CATEGORIES = [
  { id: "favorites", label: "Favoritos", query: null, isFavorites: true },
  { id: "reactions", label: "Reacciones", query: "reaction" },
  { id: "love", label: "Amor", query: "love" },
  { id: "funny", label: "Divertidos", query: "funny" },
  { id: "gaming", label: "Gaming", query: "gaming" },
];

interface GifPickerProps {
  children: React.ReactNode;
  onGifSelect: (url: string) => void;
}

interface TenorGif {
  id: string;
  title?: string;
  media_formats?: {
    gif: {
      url: string;
    };
  };
  gif_url?: string; // Para GIFs guardados en favoritos
}

export const GifPicker: React.FC<GifPickerProps> = ({
  children,
  onGifSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("favorites");
  const [resultLabel, setResultLabel] = useState("Favoritos");

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/gifs/favorites", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setGifs(data.results || []);
      setHasSearched(false);
      setResultLabel("Favoritos");
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar favoritos. Por favor, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrendingGifs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/gifs?limit=20", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setGifs(data.results || []);
      setHasSearched(false);
      setResultLabel("Tendencias");
    } catch (err) {
      console.error("Error fetching trending GIFs:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar GIFs. Por favor, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGifsByQuery = useCallback(
    async (query: string, label?: string) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/gifs?q=${encodeURIComponent(query)}&limit=20`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setGifs(data.results || []);
        setHasSearched(true);
        if (label) {
          setResultLabel(label);
        }
      } catch (err) {
        console.error("Error searching GIFs:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar GIFs. Por favor, intenta de nuevo."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const saveFavorite = useCallback(
    async (gif_url: string, tenor_id?: string, title?: string) => {
      try {
        const response = await fetch("/api/gifs/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gif_url,
            tenor_id: tenor_id || null,
            title: title || null,
          }),
        });

        if (!response.ok) {
          console.error("Error saving favorite:", response.statusText);
        }
      } catch (err) {
        console.error("Error saving favorite:", err);
      }
    },
    []
  );

  const fetchCategory = useCallback(
    async (value: string) => {
      if (value === "favorites") {
        await fetchFavorites();
        return;
      }

      if (value === "trending") {
        await fetchTrendingGifs();
        return;
      }

      const category = GIF_CATEGORIES.find((cat) => cat.id === value);
      if (category?.query) {
        await fetchGifsByQuery(category.query, category.label);
      }
    },
    [fetchGifsByQuery, fetchTrendingGifs, fetchFavorites]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    fetchCategory(activeTab);
  }, [isOpen, activeTab, fetchCategory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setActiveTab("trending");
      return;
    }

    await fetchGifsByQuery(
      searchQuery.trim(),
      `Resultados para "${searchQuery.trim()}"`
    );
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "trending") {
      setResultLabel("Populares");
      setHasSearched(false);
      return;
    }

    const category = GIF_CATEGORIES.find((cat) => cat.id === value);
    if (category) {
      setResultLabel(category.label);
    }
  };

  const getGifUrl = (gif: TenorGif): string => {
    // Si es un GIF de favoritos, tiene gif_url directamente
    if (gif.gif_url) {
      return gif.gif_url;
    }
    // Si es de Tenor API, tiene media_formats.gif.url
    return gif.media_formats?.gif?.url || "";
  };

  const handleGifSelect = (gif: TenorGif) => {
    const gifUrl = getGifUrl(gif);
    if (!gifUrl) {
      console.error("No se pudo obtener la URL del GIF");
      return;
    }
    // Guardar en favoritos
    saveFavorite(gifUrl, gif.id, gif.title);
    // Notificar al componente padre
    onGifSelect(gifUrl);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-96 max-h-[500px] overflow-hidden flex flex-col p-0"
        align="start"
      >
        {/* Header */}
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Seleccionar GIF</h3>
          <p className="text-xs text-gray-500">
            Busca y selecciona un GIF de Tenor
          </p>
        </div>

        {/* Barra de búsqueda */}
        <div className="p-3 border-b">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Buscar GIFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="px-3 h-8 text-sm"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Buscar"
              )}
            </Button>
          </form>
        </div>

        {/* Tabs de categorías */}
        <div className="border-b px-3 py-2">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid grid-cols-5">
              {GIF_CATEGORIES.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="text-[0.6875rem] py-1"
                >
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="p-2 bg-red-50 text-red-700 text-xs">{error}</div>
        )}

        {/* Etiqueta de resultados */}
        {!error && (
          <div className="px-3 py-2 text-[0.6875rem] text-gray-500 border-b">
            Mostrando:{" "}
            <span className="font-semibold text-gray-700">{resultLabel}</span>
          </div>
        )}

        {/* Spinner de carga */}
        {loading && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}

        {/* Cuadrícula de GIFs */}
        {!loading && gifs.length > 0 && (
          <div className="overflow-y-auto flex-1">
            <div className="grid grid-cols-3 gap-2 p-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleGifSelect(gif)}
                  className="relative group overflow-hidden rounded bg-gray-100 dark:bg-gray-800 aspect-square hover:opacity-80 transition-opacity"
                  title={gif.title}
                >
                  <img
                    src={getGifUrl(gif)}
                    alt={gif.title || "GIF"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      ✓
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay resultados */}
        {!loading && gifs.length === 0 && (
          <div className="flex justify-center items-center py-6 text-gray-500 text-xs">
            <p>
              {activeTab === "favorites"
                ? "Todavía no has usado GIFs. Selecciona algunos y aparecerán aquí"
                : "No se encontraron GIFs"}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
