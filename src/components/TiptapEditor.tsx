"use client";

// Este archivo ahora simplemente reexporta el componente modular
// y define las props correctas para evitar errores de tipo.

import TiptapEditor from "./tiptap-editor";

export interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImageChange?: (hasTemporaryImages: boolean) => void;
}

// Función para procesar el contenido del editor antes de guardarlo
// Esta función puede ser usada para limpiar o transformar el HTML antes de guardarlo
export const processEditorContent = (content: string): string => {
  if (!content) return "";

  // Eliminar espacios en blanco innecesarios
  let processed = content.trim();

  // Asegurarse de que el contenido tenga al menos un párrafo válido
  if (!processed || processed === "<p></p>") {
    return "";
  }

  return processed;
};

export default TiptapEditor;
