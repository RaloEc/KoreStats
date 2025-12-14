"use client";

import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import "./toolbar-styles.css";
import { ColorPopover, LinkPopover } from "./dialogs";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Upload,
  Underline as UnderlineIcon,
  Strikethrough,
  Type,
  Undo,
  Redo,
  Palette,
  Code,
  Highlighter,
  Grid,
  Table as TableIcon,
  Youtube as YoutubeIcon,
  Minus,
  TextSelect,
  Hash,
  MessageSquare,
  MoreHorizontal,
  ChevronDown,
  Eraser,
  Copy,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ToolbarButton from "./toolbar-button";
// import { VideoButton } from "./video-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  editor: Editor | null;
  onImageClick: () => void;
  onColorClick: () => void;
  onHighlightColorClick: () => void;
  onLinkClick: () => void;
  onYoutubeClick: () => void;
  onTableClick: () => void;
  currentFontFamily: string;
  setCurrentFontFamily: (font: string) => void;
  onClearFormatting: () => void;
  statusSlot?: React.ReactNode;
}

// Usar React.memo para evitar renderizaciones innecesarias
export const Toolbar = React.memo(function Toolbar(props: ToolbarProps) {
  const {
    editor,
    onImageClick,
    onColorClick,
    onHighlightColorClick,
    onLinkClick,
    onYoutubeClick,
    onTableClick,
    currentFontFamily,
    setCurrentFontFamily,
    onClearFormatting,
    statusSlot,
  } = props;

  // Estados para los menús desplegables
  const [colorPopoverOpen, setColorPopoverOpen] = useState<boolean>(false);
  const [highlightPopoverOpen, setHighlightPopoverOpen] =
    useState<boolean>(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState<boolean>(false);
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const [currentHighlightColor, setCurrentHighlightColor] =
    useState<string>("#ffcc00");
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [linkText, setLinkText] = useState<string>("");
  const [linkTarget, setLinkTarget] = useState<string>("_blank");

  // Estado para el menú desplegable de fuentes
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Referencias
  const toolbarScrollRef = useRef<HTMLDivElement>(null);

  // Manejador de scroll optimizado
  const handleWheel = React.useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      // Verificar si algún menú está abierto
      const isAnyMenuOpen = moreMenuOpen || fontMenuOpen;

      // Solo actuar si se está desplazando verticalmente y ningún menú está abierto
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !isAnyMenuOpen) {
        e.preventDefault();

        if (toolbarScrollRef.current) {
          // Aplicar desplazamiento suave
          toolbarScrollRef.current.scrollTo({
            left: toolbarScrollRef.current.scrollLeft + e.deltaY,
            behavior: "smooth",
          });
        }
      }
    },
    [moreMenuOpen, fontMenuOpen]
  );

  if (!editor) {
    return null;
  }

  // Función para aplicar el estilo
  const applyStyle = (styleFunction: () => void, e: React.MouseEvent) => {
    e.preventDefault(); // Prevenir el envío del formulario
    e.stopPropagation(); // Detener la propagación del evento
    styleFunction(); // Aplicar el estilo
  };

  const fontFamilies = [
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Times New Roman", value: "Times New Roman, serif" },
    { name: "Courier New", value: "Courier New, monospace" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Verdana", value: "Verdana, sans-serif" },
    { name: "Roboto", value: "Roboto, sans-serif" },
    { name: "Open Sans", value: "Open Sans, sans-serif" },
    { name: "Lato", value: "Lato, sans-serif" },
    { name: "Montserrat", value: "Montserrat, sans-serif" },
    { name: "Minecraft", value: "Minecraft, sans-serif" },
  ];

  // Definir interfaces para las herramientas
  interface ToolItem {
    icon: React.ElementType;
    onClick: (e: React.MouseEvent) => void;
    isActive?: boolean;
    title: string;
    disabled?: boolean;
    shortcut?: string;
    renderCustomButton?: (props: ToolItem) => React.ReactNode;
  }

  // Definir herramientas esenciales (siempre visibles)
  const essentialTools: ToolItem[] = [
    {
      icon: Bold,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleBold().run(), e),
      isActive: editor.isActive("bold"),
      title: "Negrita",
      shortcut: "Ctrl+B",
    },
    {
      icon: Italic,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleItalic().run(), e),
      isActive: editor.isActive("italic"),
      title: "Cursiva",
      shortcut: "Ctrl+I",
    },
    {
      icon: UnderlineIcon,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleUnderline().run(), e),
      isActive: editor.isActive("underline"),
      title: "Subrayado",
      shortcut: "Ctrl+U",
    },
    {
      icon: ImageIcon,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onImageClick();
      },
      title: "Insertar imagen",
    },
    // El botón de enlace ahora es un componente especial con popover integrado
    {
      icon: LinkIcon,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Obtener el texto seleccionado
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, " ");

        // Configurar el estado inicial del popover
        setLinkText(selectedText);
        setLinkUrl("");
        setLinkTarget("_blank");

        // Si ya hay un enlace activo, obtener sus propiedades
        if (editor.isActive("link")) {
          const attrs = editor.getAttributes("link");
          if (attrs.href) setLinkUrl(attrs.href);
          if (attrs.target) setLinkTarget(attrs.target);
        }

        // Abrir el popover
        setLinkPopoverOpen(true);
      },
      isActive: editor.isActive("link"),
      title: "Insertar enlace",
      shortcut: "Ctrl+K",
      renderCustomButton: (props) => {
        // Botón personalizado que sirve como disparador del popover
        const linkButton = (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            title={props.title}
            className={cn(
              "toolbar-button focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
              props.isActive && "is-active"
            )}
            onClick={props.onClick}
          >
            <props.icon className="h-4 w-4" />
          </Button>
        );

        return (
          <LinkPopover
            open={linkPopoverOpen}
            url={linkUrl}
            text={linkText}
            target={linkTarget}
            onOpenChange={setLinkPopoverOpen}
            onUrlChange={setLinkUrl}
            onTextChange={setLinkText}
            onTargetChange={setLinkTarget}
            onSave={() => {
              if (linkUrl) {
                // Si hay texto seleccionado, validar que no contenga espacios
                const hasSelection = editor.state.selection.content().size > 0;

                if (hasSelection && linkText) {
                  // Si hay texto seleccionado y se proporcionó un texto, reemplazar la selección
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .setLink({ href: linkUrl, target: linkTarget })
                    .run();
                } else if (hasSelection) {
                  // Si hay texto seleccionado pero no se proporcionó un texto, usar la selección
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .setLink({ href: linkUrl, target: linkTarget })
                    .run();
                } else if (linkText) {
                  // Si no hay texto seleccionado pero se proporcionó un texto, insertar nuevo enlace
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "text",
                      text: linkText,
                      marks: [
                        {
                          type: "link",
                          attrs: { href: linkUrl, target: linkTarget },
                        },
                      ],
                    })
                    .run();
                }
              }

              // Cerrar el popover y limpiar el estado
              setLinkPopoverOpen(false);
              setLinkUrl("");
              setLinkText("");
              setLinkTarget("_blank");

              // Devolver el foco al editor
              setTimeout(() => {
                editor.commands.focus();
              }, 100);
            }}
            triggerButton={linkButton}
          />
        );
      },
    },
    {
      icon: List,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleBulletList().run(), e),
      isActive: editor.isActive("bulletList"),
      title: "Lista con viñetas",
    },
    {
      icon: ListOrdered,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleOrderedList().run(), e),
      isActive: editor.isActive("orderedList"),
      title: "Lista numerada",
    },
  ];

  // Definir herramientas adicionales (en menú desplegable)
  const additionalTools: ToolItem[] = [
    {
      icon: Strikethrough,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleStrike().run(), e),
      isActive: editor.isActive("strike"),
      title: "Tachado",
    },
    {
      icon: Copy,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleClickToCopy().run(), e),
      isActive: editor.isActive("clickToCopy"),
      title: "Texto copiable",
    },
    {
      icon: Code,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleCode().run(), e),
      isActive: editor.isActive("code"),
      title: "Código inline (selecciona texto primero)",
    },
    {
      icon: Grid,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().toggleCodeBlock().run(), e),
      isActive: editor.isActive("codeBlock"),
      title: "Bloque de código",
    },
    {
      icon: TableIcon,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onTableClick();
      },
      title: "Insertar tabla",
    },
    {
      icon: Heading1,
      onClick: (e: React.MouseEvent) =>
        applyStyle(
          () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          e
        ),
      isActive: editor.isActive("heading", { level: 1 }),
      title: "Encabezado 1",
    },
    {
      icon: Heading2,
      onClick: (e: React.MouseEvent) =>
        applyStyle(
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          e
        ),
      isActive: editor.isActive("heading", { level: 2 }),
      title: "Encabezado 2",
    },
    {
      icon: Heading3,
      onClick: (e: React.MouseEvent) =>
        applyStyle(
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          e
        ),
      isActive: editor.isActive("heading", { level: 3 }),
      title: "Encabezado 3",
    },
  ];

  // Botones para los menús desplegables de color
  const colorButton = (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      title="Color de texto"
      className="focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <Palette className="h-4 w-4" />
    </Button>
  );

  const highlightButton = (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      title="Color de resaltado"
      className="focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <Highlighter className="h-4 w-4" />
    </Button>
  );

  // Definir herramientas de alineación
  const alignmentTools: ToolItem[] = [
    {
      icon: AlignLeft,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().setTextAlign("left").run(), e),
      isActive: editor.isActive({ textAlign: "left" }),
      title: "Alinear a la izquierda",
    },
    {
      icon: AlignCenter,
      onClick: (e: React.MouseEvent) =>
        applyStyle(
          () => editor.chain().focus().setTextAlign("center").run(),
          e
        ),
      isActive: editor.isActive({ textAlign: "center" }),
      title: "Centrar",
    },
    {
      icon: AlignRight,
      onClick: (e: React.MouseEvent) =>
        applyStyle(() => editor.chain().focus().setTextAlign("right").run(), e),
      isActive: editor.isActive({ textAlign: "right" }),
      title: "Alinear a la derecha",
    },
    {
      icon: AlignJustify,
      onClick: (e: React.MouseEvent) =>
        applyStyle(
          () => editor.chain().focus().setTextAlign("justify").run(),
          e
        ),
      isActive: editor.isActive({ textAlign: "justify" }),
      title: "Justificar",
    },
  ];

  return (
    <div className="tiptap-toolbar flex items-center gap-3">
      {/* Contenedor con scroll horizontal */}
      <div
        className="toolbar-scroll flex-1 min-w-0"
        ref={toolbarScrollRef}
        onWheel={handleWheel}
      >
        {/* Grupo de Deshacer/Rehacer */}
        <div className="toolbar-group">
          <ToolbarButton
            icon={Undo}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Deshacer"
            shortcut="Ctrl+Z"
          />
          <ToolbarButton
            icon={Redo}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rehacer"
            shortcut="Ctrl+Shift+Z"
          />
        </div>

        {/* Herramientas esenciales */}
        <div className="toolbar-group">
          {essentialTools.map((tool, index) =>
            tool.renderCustomButton ? (
              <React.Fragment key={`essential-custom-${index}`}>
                {tool.renderCustomButton(tool)}
              </React.Fragment>
            ) : (
              <ToolbarButton
                key={`essential-${index}`}
                icon={tool.icon}
                onClick={tool.onClick}
                isActive={tool.isActive}
                title={tool.title}
                shortcut={tool.shortcut}
                disabled={tool.disabled}
              />
            )
          )}
        </div>

        {/* Herramientas de color */}
        <div className="toolbar-group">
          {/* Menú desplegable para color de texto */}
          <ColorPopover
            open={colorPopoverOpen}
            title="Color de texto"
            color={currentColor}
            onOpenChange={setColorPopoverOpen}
            onChange={(val) => setCurrentColor(val)}
            onSave={() => {
              editor.chain().focus().setColor(currentColor).run();
              setColorPopoverOpen(false);
            }}
            onClear={() => {
              editor.chain().focus().unsetColor().run();
              setColorPopoverOpen(false);
            }}
            triggerButton={colorButton}
          />

          {/* Menú desplegable para color de resaltado */}
          <ColorPopover
            open={highlightPopoverOpen}
            title="Color de resaltado"
            color={currentHighlightColor}
            onOpenChange={setHighlightPopoverOpen}
            onChange={(val) => setCurrentHighlightColor(val)}
            onSave={() => {
              editor
                .chain()
                .focus()
                .toggleHighlight({ color: currentHighlightColor })
                .run();
              setHighlightPopoverOpen(false);
            }}
            onClear={() => {
              editor.chain().focus().unsetHighlight().run();
              setHighlightPopoverOpen(false);
            }}
            triggerButton={highlightButton}
          />

          {/* Quitar todos los formatos */}
          <ToolbarButton
            icon={Eraser}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              props.onClearFormatting();
            }}
            title="Quitar todos los formatos"
          />

          {/* El menú desplegable para enlaces ahora se maneja directamente en el botón de enlace */}
        </div>

        {/* Selector de fuente */}
        <div className="toolbar-group font-selector-wrapper">
          <DropdownMenu
            open={fontMenuOpen}
            onOpenChange={setFontMenuOpen}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="font-selector-button text-xs px-2 h-8 flex items-center gap-1"
                type="button"
              >
                <span className="max-w-[80px] truncate">
                  {currentFontFamily}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="w-48 bg-black text-white border border-gray-700 rounded-md shadow-lg"
              sideOffset={5}
              onInteractOutside={(e) => {
                // Permite que cierre normalmente, excepto si se clickea el botón trigger
                if (
                  (e.target as HTMLElement).closest(".font-selector-button")
                ) {
                  e.preventDefault();
                }
              }}
            >
              {fontFamilies.map((font) => (
                <DropdownMenuItem
                  key={font.name}
                  className={cn(
                    "cursor-pointer hover:bg-gray-800 hover:text-white transition-colors",
                    currentFontFamily === font.name && "bg-gray-800 text-white"
                  )}
                  onSelect={(e) => {
                    e.preventDefault(); // evita que Radix cierre el menú
                    setCurrentFontFamily(font.name);
                    editor.chain().focus().setFontFamily(font.value).run();
                  }}
                >
                  <span style={{ fontFamily: font.value }} className="text-sm">
                    {font.name}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Botón de video deshabilitado temporalmente */}
        {/* <div className="toolbar-group">
          <VideoButton editor={editor} />
        </div> */}

        {/* Menú desplegable para herramientas adicionales */}
        <div className="toolbar-group" style={{ borderRight: "none" }}>
          <DropdownMenu
            open={moreMenuOpen}
            onOpenChange={setMoreMenuOpen}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                title="Más opciones"
                className="focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="w-56 bg-black text-white border border-gray-700 rounded-md shadow-lg"
              sideOffset={5}
              onInteractOutside={(e) => {
                if (
                  (e.target as HTMLElement).closest(
                    "[data-radix-dropdown-menu-trigger]"
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <DropdownMenuGroup>
                {additionalTools.map((tool, index) => (
                  <DropdownMenuItem
                    key={`additional-${index}`}
                    className={cn(
                      "cursor-pointer hover:bg-gray-800 hover:text-white transition-colors",
                      tool.isActive && "bg-gray-800 text-white"
                    )}
                    onSelect={(e) => {
                      e.preventDefault(); // 🔥 evita que Radix cierre
                      tool.onClick(e as unknown as React.MouseEvent);
                    }}
                  >
                    <tool.icon className="mr-2 h-4 w-4" />
                    <span>{tool.title}</span>
                    {tool.shortcut && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {tool.shortcut}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {statusSlot && (
        <div className="text-xs text-muted-foreground whitespace-nowrap pr-1">
          {statusSlot}
        </div>
      )}
    </div>
  );
});

export const BubbleToolbar = React.memo(function BubbleToolbar(props: {
  editor: Editor | null;
}) {
  const { editor } = props;
  if (!editor) {
    return null;
  }

  // Función para prevenir la acción por defecto y aplicar el estilo
  const applyStyle = (styleFunction: () => void, e: React.MouseEvent) => {
    e.preventDefault(); // Prevenir el envío del formulario
    e.stopPropagation(); // Detener la propagación del evento
    styleFunction(); // Aplicar el estilo
  };

  return (
    <div className="bubble-menu">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(() => editor.chain().focus().toggleBold().run(), e)
        }
        className={editor.isActive("bold") ? "is-active" : ""}
        type="button" // Especificar explícitamente que es un botón, no un submit
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(() => editor.chain().focus().toggleItalic().run(), e)
        }
        className={editor.isActive("italic") ? "is-active" : ""}
        type="button"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(() => editor.chain().focus().toggleUnderline().run(), e)
        }
        className={editor.isActive("underline") ? "is-active" : ""}
        type="button"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(() => editor.chain().focus().toggleStrike().run(), e)
        }
        className={editor.isActive("strike") ? "is-active" : ""}
        type="button"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
    </div>
  );
});

export const FloatingToolbar = React.memo(function FloatingToolbar(props: {
  editor: Editor | null;
}) {
  const { editor } = props;
  if (!editor) {
    return null;
  }

  // Función para prevenir la acción por defecto y aplicar el estilo
  const applyStyle = (styleFunction: () => void, e: React.MouseEvent) => {
    e.preventDefault(); // Prevenir el envío del formulario
    e.stopPropagation(); // Detener la propagación del evento
    styleFunction(); // Aplicar el estilo
  };

  return (
    <div className="floating-menu">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(
            () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            e
          )
        }
        type="button"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            e
          )
        }
        type="button"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(() => editor.chain().focus().toggleBulletList().run(), e)
        }
        type="button"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(() => editor.chain().focus().toggleOrderedList().run(), e)
        }
        type="button"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) =>
          applyStyle(() => editor.chain().focus().toggleCodeBlock().run(), e)
        }
        type="button"
      >
        <Code className="h-4 w-4" />
      </Button>
    </div>
  );
});
