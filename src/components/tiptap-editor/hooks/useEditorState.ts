import { useState } from "react";

export interface EditorStateReturn {
  // Imagen
  selectedImagePos: number | null;
  setSelectedImagePos: (pos: number | null) => void;
  images: { node: unknown; pos: number }[];
  setImages: (images: { node: unknown; pos: number }[]) => void;

  // YouTube
  youtubeDialogOpen: boolean;
  setYoutubeDialogOpen: (open: boolean) => void;
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
  selectedYoutubePos: number | null;
  setSelectedYoutubePos: (pos: number | null) => void;
  youtubeVideos: { node: unknown; pos: number }[];
  setYoutubeVideos: (videos: { node: unknown; pos: number }[]) => void;

  // Tabla
  tableDialogOpen: boolean;
  setTableDialogOpen: (open: boolean) => void;
  tableRows: number;
  setTableRows: (rows: number) => void;
  tableCols: number;
  setTableCols: (cols: number) => void;

  // Colores y fuentes
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentHighlightColor: string;
  setCurrentHighlightColor: (color: string) => void;
  currentFontFamily: string;
  setCurrentFontFamily: (font: string) => void;

  // Conteo de caracteres
  characterCount: { characters: number; words: number };
  setCharacterCount: (count: { characters: number; words: number }) => void;

  // Menciones
  mentionSuggestions: string[];
}

/**
 * Hook que centraliza todos los estados del editor TipTap.
 * Reduce la complejidad del componente principal.
 */
export function useEditorState(): EditorStateReturn {
  // Estados de imagen
  const [selectedImagePos, setSelectedImagePos] = useState<number | null>(null);
  const [images, setImages] = useState<{ node: unknown; pos: number }[]>([]);

  // Estados de YouTube
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedYoutubePos, setSelectedYoutubePos] = useState<number | null>(
    null
  );
  const [youtubeVideos, setYoutubeVideos] = useState<
    { node: unknown; pos: number }[]
  >([]);

  // Estados de tabla
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Estados de colores y fuentes
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentHighlightColor, setCurrentHighlightColor] = useState("#ffcc00");
  const [currentFontFamily, setCurrentFontFamily] = useState("Arial");

  // Estado de conteo de caracteres
  const [characterCount, setCharacterCount] = useState({
    characters: 0,
    words: 0,
  });

  // Menciones (estático por ahora)
  const [mentionSuggestions] = useState([
    "admin",
    "editor",
    "usuario",
    "invitado",
  ]);

  return {
    // Imagen
    selectedImagePos,
    setSelectedImagePos,
    images,
    setImages,

    // YouTube
    youtubeDialogOpen,
    setYoutubeDialogOpen,
    youtubeUrl,
    setYoutubeUrl,
    selectedYoutubePos,
    setSelectedYoutubePos,
    youtubeVideos,
    setYoutubeVideos,

    // Tabla
    tableDialogOpen,
    setTableDialogOpen,
    tableRows,
    setTableRows,
    tableCols,
    setTableCols,

    // Colores y fuentes
    currentColor,
    setCurrentColor,
    currentHighlightColor,
    setCurrentHighlightColor,
    currentFontFamily,
    setCurrentFontFamily,

    // Conteo
    characterCount,
    setCharacterCount,

    // Menciones
    mentionSuggestions,
  };
}
