"use client";

import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ImageResize from "tiptap-extension-resize-image";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { YoutubeEmbed } from "./extensions/youtube-embed";
import FontFamily from "@tiptap/extension-font-family";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CharacterCount from "@tiptap/extension-character-count";
import { FloatingMenu as TiptapFloatingMenu } from "@tiptap/extension-floating-menu";

import { LolMention } from "./extensions/lol-mention";
import { UserMention } from "./extensions/user-mention";
import { Extension } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { ClickToCopy } from "./extensions/click-to-copy";
import { ImageWithCaption } from "./extensions/image-with-caption";
import { TwitterEmbed } from "./extensions/twitter-embed";
import { Video } from "./extensions/video";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CodeBlockComponent } from "./extensions/code-block-component";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { lowlight } from "./lowlight";
import "highlight.js/styles/atom-one-dark.css";

// Crear instancia de lowlight con lenguajes comunes

const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
});

// Función para crear reglas de pegado para enlaces
export const createLinkPasteRules = () => {
  return Extension.create({
    addPasteRules() {
      return [
        {
          find: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
          handler({ state, range, match }) {
            const from = range.from;
            const to = range.to;
            const url = match[0];

            // Verificar si la URL es segura
            if (!isAllowedUri(url)) {
              return false;
            }

            // Insertar enlace
            const transaction = state.tr.replaceWith(
              from,
              to,
              state.schema.text(url),
            );

            // Seleccionar el texto
            transaction.setSelection(
              new NodeSelection(transaction.doc.resolve(from)),
            );

            return true;
          },
        },
      ];
    },
  });
};

// Función para validar URLs
export const isAllowedUri = (url: string, ctx?: any) => {
  // Lista de dominios permitidos
  const allowedDomains = [
    "minecraft.net",
    "mojang.com",
    "curseforge.com",
    "spigotmc.org",
    "bukkit.org",
    "github.com",
    "youtube.com",
    "youtu.be",
    "imgur.com",
    "discord.com",
    "discord.gg",
    "twitter.com",
    "facebook.com",
    "instagram.com",
    "reddit.com",
    "planetminecraft.com",
    "minecraftforum.net",
    "twitch.tv",
    "modrinth.com",
    "mcpedl.com",
    "minecraft-heads.com",
    "minecraftskins.com",
    "namemc.com",
    "minecraft-maps.com",
  ];

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, "");

    // Verificar si el dominio está en la lista de permitidos
    return allowedDomains.some(
      (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
    );
  } catch (e) {
    return false;
  }
};

// Exportar configuración de extensiones por defecto
export const getDefaultExtensions = (
  mentionSuggestions: string[] /* Kept for compatibility but unused now */,
) => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: false,
    // Desactivar horizontalRule en StarterKit para evitar duplicados
    horizontalRule: false,
    // Habilitar listas
    bulletList: {
      HTMLAttributes: {
        class: "list-disc pl-6",
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal pl-6",
      },
    },
    listItem: {
      HTMLAttributes: {
        class: "list-item",
      },
    },
  }),
  Link.configure({
    protocols: ["http", "https", "mailto", "tel"],
    openOnClick: true,
    linkOnPaste: true,
    HTMLAttributes: {
      rel: "noopener noreferrer",
      class: "editor-link",
    },
  }),
  ImageResize.configure({
    HTMLAttributes: {
      class: "editor-image",
    },
  }),
  ImageWithCaption.configure({
    HTMLAttributes: {
      class: "image-with-caption-figure",
    },
  }),
  Underline,
  TextStyle,
  Color,
  TextAlign.configure({
    types: ["heading", "paragraph", "image"],
  }),
  Highlight.configure({
    multicolor: true,
  }),
  YoutubeEmbed.configure({
    width: 640,
    height: 360,
    HTMLAttributes: {
      class: "editor-youtube resizable-video",
      "data-resizable": "true",
    },
    // Deshabilitar controles de redimensionamiento predeterminados
    controls: false,
  }),
  FontFamily.configure({
    types: ["textStyle"],
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: "editor-table",
    },
  }),
  TableRow,
  TableCell,
  TableHeader,
  CharacterCount,
  TiptapFloatingMenu,
  UserMention.configure({
    HTMLAttributes: {
      class:
        "user-mention inline-flex items-center px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium mx-0.5 border border-blue-200 dark:border-blue-800",
    },
  }),
  LolMention.configure({
    HTMLAttributes: {
      class:
        "lol-mention inline-flex items-center px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-medium mx-0.5 border border-amber-200 dark:border-amber-800",
    },
  }),

  CodeBlock.configure({
    lowlight,
    // Asignar un lenguaje por defecto para mejorar el coloreado cuando el usuario no elige uno
    defaultLanguage: "javascript",
    HTMLAttributes: {
      class: "editor-code-block",
    },
  }),
  HorizontalRule.configure({
    HTMLAttributes: {
      class: "editor-hr",
    },
  }),
  createLinkPasteRules(),
  ClickToCopy.configure({
    HTMLAttributes: {},
  }),
  TwitterEmbed.configure({
    HTMLAttributes: {
      class: "twitter-embed-container",
    },
  }),
  Video.configure({
    HTMLAttributes: {
      class: "video-container",
    },
  }),
];
