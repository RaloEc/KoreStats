import { useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  findAllImages,
  findAllYoutubeVideos,
  calculateCharacterCount,
} from "../utils";
import { imageCache } from "../ImageCache";

interface UseEditorEventsOptions {
  editor: Editor | null;
  onImageChange?: (hasTemporaryImages: boolean) => void;
  setImages: (images: { node: unknown; pos: number }[]) => void;
  setYoutubeVideos: (videos: { node: unknown; pos: number }[]) => void;
  setCharacterCount: (count: { characters: number; words: number }) => void;
  setSelectedImagePos: (pos: number | null) => void;
  setSelectedYoutubePos: (pos: number | null) => void;
}

/**
 * Hook que maneja la sincronización de contenido y eventos de click en imágenes/videos.
 */
export function useEditorEvents({
  editor,
  onImageChange,
  setImages,
  setYoutubeVideos,
  setCharacterCount,
  setSelectedImagePos,
  setSelectedYoutubePos,
}: UseEditorEventsOptions): void {
  // Sincronizar imágenes, videos y conteo de caracteres cuando cambie el editor
  useEffect(() => {
    if (!editor) return;

    const foundImages = findAllImages(editor);
    setImages(foundImages);
    setYoutubeVideos(findAllYoutubeVideos(editor));

    // Actualizar conteo de caracteres
    const stats = calculateCharacterCount(editor.getHTML());
    setCharacterCount(stats);

    // Verificar si hay imágenes temporales y notificar al componente padre
    if (onImageChange) {
      const hasTemporaryImages = foundImages.some(
        (img) => img.node.attrs.src && imageCache.isTempUrl(img.node.attrs.src)
      );
      onImageChange(hasTemporaryImages);
    }
  }, [editor, onImageChange, setImages, setYoutubeVideos, setCharacterCount]);

  // Handler para seleccionar una imagen
  const handleImageClick = useCallback(
    (event: MouseEvent) => {
      if (!editor) return;

      const target = event.target as HTMLElement;
      if (target.tagName === "IMG") {
        const images = findAllImages(editor);
        const clickedImage = images.find((img) => {
          const imgElement = document.querySelector(
            `img[src="${img.node.attrs.src}"]`
          );
          return imgElement === target;
        });

        if (clickedImage) {
          setSelectedImagePos(clickedImage.pos);

          // Posicionar el toolkit junto a la imagen
          setTimeout(() => {
            const toolkit = document.querySelector(
              ".image-toolkit"
            ) as HTMLElement;
            if (toolkit) {
              const imgRect = target.getBoundingClientRect();
              toolkit.style.top = `${imgRect.top + window.scrollY - 40}px`;
              toolkit.style.left = `${imgRect.left + window.scrollY}px`;
            }
          }, 10);
        }
      } else if (!target.closest(".image-toolkit")) {
        setSelectedImagePos(null);
      }
    },
    [editor, setSelectedImagePos]
  );

  // Handler para seleccionar un video de YouTube
  const handleYoutubeClick = useCallback(
    (event: MouseEvent) => {
      if (!editor) return;

      const target = event.target as HTMLElement;
      if (target.tagName === "IFRAME") {
        const videos = findAllYoutubeVideos(editor);
        const clickedVideo = videos.find((video) => {
          const videoElement = document.querySelector(
            `iframe[src*="${video.node.attrs.src}"]`
          );
          return videoElement === target;
        });

        if (clickedVideo) {
          setSelectedYoutubePos(clickedVideo.pos);
        }
      } else if (!target.closest(".youtube-toolkit")) {
        setSelectedYoutubePos(null);
      }
    },
    [editor, setSelectedYoutubePos]
  );

  // Agregar event listeners para clicks
  useEffect(() => {
    document.addEventListener("click", handleImageClick);
    document.addEventListener("click", handleYoutubeClick);

    return () => {
      document.removeEventListener("click", handleImageClick);
      document.removeEventListener("click", handleYoutubeClick);
    };
  }, [handleImageClick, handleYoutubeClick]);
}
