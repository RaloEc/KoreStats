import { useCallback, RefObject } from "react";
import { Editor } from "@tiptap/react";
import { uploadImageToSupabase, getYoutubeVideoId } from "../utils";

interface UseEditorHandlersOptions {
  editor: Editor | null;
  fileInputRef: RefObject<HTMLInputElement>;
  // YouTube
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
  setYoutubeDialogOpen: (open: boolean) => void;
  // Tabla
  tableRows: number;
  tableCols: number;
  setTableRows: (rows: number) => void;
  setTableCols: (cols: number) => void;
  setTableDialogOpen: (open: boolean) => void;
  // Imagen
  selectedImagePos: number | null;
  setSelectedImagePos: (pos: number | null) => void;
  // YouTube seleccionado
  selectedYoutubePos: number | null;
  setSelectedYoutubePos: (pos: number | null) => void;
}

export interface EditorHandlersReturn {
  handleOpenYoutubeDialog: () => void;
  handleSaveYoutube: () => void;
  handleOpenTableDialog: () => void;
  handleSaveTable: () => void;
  handleImageUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  handleRemoveImage: () => void;
  handleRemoveYoutube: () => void;
}

/**
 * Crea un indicador de carga visual para subida de imágenes.
 */
function createLoadingIndicator(id: string): HTMLDivElement {
  const loadingDiv = document.createElement("div");
  loadingDiv.id = id;
  loadingDiv.textContent = "Subiendo imagen...";
  loadingDiv.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0,0,0,0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 1000;
  `;
  return loadingDiv;
}

/**
 * Hook que centraliza los handlers del editor (YouTube, Tabla, Imagen).
 */
export function useEditorHandlers({
  editor,
  fileInputRef,
  youtubeUrl,
  setYoutubeUrl,
  setYoutubeDialogOpen,
  tableRows,
  tableCols,
  setTableRows,
  setTableCols,
  setTableDialogOpen,
  selectedImagePos,
  setSelectedImagePos,
  selectedYoutubePos,
  setSelectedYoutubePos,
}: UseEditorHandlersOptions): EditorHandlersReturn {
  // === YouTube Handlers ===
  const handleOpenYoutubeDialog = useCallback(() => {
    setYoutubeUrl("");
    setYoutubeDialogOpen(true);
  }, [setYoutubeUrl, setYoutubeDialogOpen]);

  const handleSaveYoutube = useCallback(() => {
    if (!editor) return;

    const videoId = getYoutubeVideoId(youtubeUrl);
    if (videoId) {
      editor
        .chain()
        .focus()
        .setYoutubeVideo({
          src: videoId,
          width: 640,
          height: 360,
        })
        .run();

      setYoutubeDialogOpen(false);
    }
  }, [editor, youtubeUrl, setYoutubeDialogOpen]);

  // === Table Handlers ===
  const handleOpenTableDialog = useCallback(() => {
    setTableRows(3);
    setTableCols(3);
    setTableDialogOpen(true);
  }, [setTableRows, setTableCols, setTableDialogOpen]);

  const handleSaveTable = useCallback(() => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true })
      .run();

    setTableDialogOpen(false);
  }, [editor, tableRows, tableCols, setTableDialogOpen]);

  // === Image Handlers ===
  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!editor || !event.target.files || event.target.files.length === 0)
        return;

      const file = event.target.files[0];
      const loadingDiv = createLoadingIndicator("tiptap-loading-indicator");
      document.body.appendChild(loadingDiv);

      try {
        const imageUrl = await uploadImageToSupabase(file);
        console.log(
          "[handleImageUpload] URL recibida:",
          imageUrl ? imageUrl.substring(0, 50) : "null"
        );

        editor
          .chain()
          .focus()
          .setImageWithCaption({
            src: imageUrl,
            alt: file.name,
            title: file.name,
          })
          .run();

        // Limpiar input de archivo
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Error al subir imagen:", error);
        alert("Error al subir la imagen. Por favor, inténtalo de nuevo.");
      } finally {
        loadingDiv.remove();
      }
    },
    [editor, fileInputRef]
  );

  const handleRemoveImage = useCallback(() => {
    if (!editor || selectedImagePos === null) return;

    editor
      .chain()
      .focus()
      .deleteRange({ from: selectedImagePos, to: selectedImagePos + 1 })
      .run();

    setSelectedImagePos(null);
  }, [editor, selectedImagePos, setSelectedImagePos]);

  const handleRemoveYoutube = useCallback(() => {
    if (!editor || selectedYoutubePos === null) return;

    editor
      .chain()
      .focus()
      .deleteRange({ from: selectedYoutubePos, to: selectedYoutubePos + 1 })
      .run();

    setSelectedYoutubePos(null);
  }, [editor, selectedYoutubePos, setSelectedYoutubePos]);

  return {
    handleOpenYoutubeDialog,
    handleSaveYoutube,
    handleOpenTableDialog,
    handleSaveTable,
    handleImageUpload,
    handleRemoveImage,
    handleRemoveYoutube,
  };
}
