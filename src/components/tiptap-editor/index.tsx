"use client";

// Extender la interfaz Window para incluir resizingFrame
declare global {
  interface Window {
    resizingFrame: number | null;
  }
}

import React, { useRef } from "react";
import { useEditor, EditorContent, FloatingMenu } from "@tiptap/react";
import dynamic from "next/dynamic";
import { getDefaultExtensions } from "./extensions";
import { Toolbar, FloatingToolbar } from "./toolbar";
import { YoutubeDialog, TableDialog } from "./dialogs";
import { calculateCharacterCount } from "./utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hooks modularizados
import {
  useEditorState,
  useClipboardPaste,
  useEditorHandlers,
  useEditorEvents,
} from "./hooks";

// Importar estilos
import EditorStyles from "./styles";
import "./youtube-styles.css";
import "./editor-styles.css";
import "./code-block-styles.css";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  editable?: boolean;
  userColor?: string;
  onImageChange?: (hasTemporaryImages: boolean) => void;
  statusSlot?: React.ReactNode;
}

// Componente base del editor
const TiptapEditorBase = ({
  value,
  onChange,
  placeholder = "Escribe tu contenido aquí...",
  className = "",
  onImageChange,
  statusSlot,
}: TiptapEditorProps) => {
  // Referencias
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados centralizados
  const state = useEditorState();

  // Inicializar el editor
  const editor = useEditor({
    extensions: getDefaultExtensions(state.mentionSuggestions),
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      const stats = calculateCharacterCount(html);
      state.setCharacterCount(stats);
    },
    editorProps: {
      attributes: {
        class: "editor-content",
        "data-placeholder": placeholder,
      },
    },
    immediatelyRender: false,
  });

  // Hooks modularizados para lógica del editor
  useClipboardPaste({ editor, onImageChange });

  useEditorEvents({
    editor,
    onImageChange,
    setImages: state.setImages,
    setYoutubeVideos: state.setYoutubeVideos,
    setCharacterCount: state.setCharacterCount,
    setSelectedImagePos: state.setSelectedImagePos,
    setSelectedYoutubePos: state.setSelectedYoutubePos,
  });

  const handlers = useEditorHandlers({
    editor,
    fileInputRef: fileInputRef as React.RefObject<HTMLInputElement>,
    youtubeUrl: state.youtubeUrl,
    setYoutubeUrl: state.setYoutubeUrl,
    setYoutubeDialogOpen: state.setYoutubeDialogOpen,
    tableRows: state.tableRows,
    tableCols: state.tableCols,
    setTableRows: state.setTableRows,
    setTableCols: state.setTableCols,
    setTableDialogOpen: state.setTableDialogOpen,
    selectedImagePos: state.selectedImagePos,
    setSelectedImagePos: state.setSelectedImagePos,
    selectedYoutubePos: state.selectedYoutubePos,
    setSelectedYoutubePos: state.setSelectedYoutubePos,
  });

  // Renderizar el editor
  return (
    <div className="tiptap-editor">
      <div className="editor-container">
        {/* Barra de herramientas */}
        <Toolbar
          editor={editor}
          onImageClick={() => fileInputRef.current?.click()}
          onColorClick={() => {}}
          onHighlightColorClick={() => {}}
          onLinkClick={() => {}}
          onYoutubeClick={handlers.handleOpenYoutubeDialog}
          onTableClick={handlers.handleOpenTableDialog}
          currentFontFamily={state.currentFontFamily}
          setCurrentFontFamily={state.setCurrentFontFamily}
          onClearFormatting={() => {
            editor?.chain().focus().unsetAllMarks().clearNodes().run();
          }}
          statusSlot={statusSlot}
        />

        {/* Contenido del editor */}
        <EditorContent
          editor={editor}
          className={`w-full border border-neutral-800/60 rounded-lg px-4 py-3 text-slate-100 bg-transparent ${
            className ?? ""
          }`}
        />
      </div>

      {/* Menú flotante (aparece al inicio de una línea vacía) */}
      {editor && (
        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <FloatingToolbar editor={editor} />
        </FloatingMenu>
      )}

      {/* Toolkit para imágenes seleccionadas */}
      {state.selectedImagePos !== null && (
        <div
          className="image-toolkit"
          style={{ position: "absolute", zIndex: 100 }}
        >
          <Button
            variant="destructive"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlers.handleRemoveImage();
            }}
            title="Eliminar imagen"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Toolkit para videos de YouTube seleccionados */}
      {state.selectedYoutubePos !== null && (
        <div className="youtube-toolkit">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlers.handleRemoveYoutube}
            title="Eliminar video"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input oculto para subir imágenes */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlers.handleImageUpload}
        multiple
      />

      {/* Diálogo para insertar videos de YouTube */}
      <YoutubeDialog
        open={state.youtubeDialogOpen}
        url={state.youtubeUrl}
        onClose={() => state.setYoutubeDialogOpen(false)}
        onUrlChange={state.setYoutubeUrl}
        onSave={handlers.handleSaveYoutube}
      />

      {/* Diálogo para insertar tablas */}
      <TableDialog
        open={state.tableDialogOpen}
        rows={state.tableRows}
        cols={state.tableCols}
        onClose={() => state.setTableDialogOpen(false)}
        onRowsChange={state.setTableRows}
        onColsChange={state.setTableCols}
        onSave={handlers.handleSaveTable}
      />

      <EditorStyles />
    </div>
  );
};

// Exportar el componente con carga dinámica para evitar SSR
export default dynamic(() => Promise.resolve(TiptapEditorBase), {
  ssr: false,
});
