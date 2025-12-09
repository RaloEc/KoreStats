import { useEffect } from "react";
import { Editor } from "@tiptap/react";
import { uploadImageToSupabase } from "../utils";
import { imageCache } from "../ImageCache";

interface UseClipboardPasteOptions {
  editor: Editor | null;
  onImageChange?: (hasTemporaryImages: boolean) => void;
}

/**
 * Detecta URLs de X/Twitter en el texto.
 */
function detectTwitterUrl(text: string): string | null {
  const twitterUrlPattern =
    /https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/g;
  const match = text.match(twitterUrlPattern);
  return match ? match[0] : null;
}

/**
 * Crea un indicador de carga visual.
 */
function createLoadingIndicator(): HTMLDivElement {
  const loadingDiv = document.createElement("div");
  loadingDiv.id = `tiptap-loading-indicator-${Date.now()}`;
  loadingDiv.textContent = "Subiendo imagen...";
  loadingDiv.style.cssText = `
    position: fixed;
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
 * Hook que maneja el pegado de imágenes y URLs de Twitter desde el portapapeles.
 */
export function useClipboardPaste({
  editor,
  onImageChange,
}: UseClipboardPasteOptions): void {
  useEffect(() => {
    if (!editor) return;

    const handlePaste = async (event: ClipboardEvent) => {
      if (!event.clipboardData) return;

      // Verificar si hay texto en el portapapeles (para URLs de Twitter)
      const text = event.clipboardData.getData("text/plain");
      if (text) {
        const twitterUrl = detectTwitterUrl(text);
        if (twitterUrl) {
          event.preventDefault();
          event.stopPropagation();
          try {
            editor.chain().focus().setTwitterEmbed({ url: twitterUrl }).run();
          } catch (error) {
            console.error("Error al insertar embed de Twitter:", error);
          }
          return;
        }
      }

      // Verificar si hay imágenes en el portapapeles
      const items = Array.from(event.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));

      if (imageItems.length === 0) return;

      event.preventDefault();
      event.stopPropagation();

      // Guardar la posición actual de desplazamiento
      const scrollPosition = window.scrollY;

      // Procesar cada imagen encontrada
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;

        const loadingDiv = createLoadingIndicator();
        document.body.appendChild(loadingDiv);

        try {
          const imageUrl = await uploadImageToSupabase(file, "foro/contenido");

          console.log(
            "[useClipboardPaste] URL recibida:",
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

          // Restaurar la posición de desplazamiento
          window.scrollTo(0, scrollPosition);
        } catch (error) {
          console.error("Error al subir la imagen pegada:", error);
          alert("Error al subir la imagen. Por favor, inténtalo de nuevo.");
        } finally {
          loadingDiv.remove();
        }
      }
    };

    // Agregar el event listener al elemento del editor
    const editorElement = document.querySelector(".ProseMirror");
    editorElement?.addEventListener("paste", handlePaste as EventListener);

    // Limpiar el event listener y el caché cuando se desmonte
    return () => {
      editorElement?.removeEventListener("paste", handlePaste as EventListener);
      imageCache.revokeUrls();
    };
  }, [editor, onImageChange]);
}
