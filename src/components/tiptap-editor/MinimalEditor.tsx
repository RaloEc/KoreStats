"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { LolMention } from "./extensions/lol-mention";
import { UserMention } from "./extensions/user-mention";
import { Bold, Italic, Link as LinkIcon } from "lucide-react";
import "./editor-styles.css";

interface MinimalEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  restrictMentionsToFriends?: boolean;
  currentUserId?: string;
}

const MinimalEditor = ({
  value,
  onChange,
  placeholder = "Escribe algo...",
  className = "",
  restrictMentionsToFriends = false,
  currentUserId,
}: MinimalEditorProps) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300",
        },
      }),
      LolMention.configure({
        HTMLAttributes: {
          class:
            "lol-mention inline-flex items-center px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-medium mx-0.5 border border-amber-200 dark:border-amber-800",
        },
      }),
      UserMention.configure({
        HTMLAttributes: {
          class:
            "user-mention inline-flex items-center px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium mx-0.5 border border-blue-200 dark:border-blue-800",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose dark:prose-invert max-w-none focus:outline-none px-4 py-3 ${className}`,
        "data-placeholder": placeholder,
      },
    },
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      // Configure user mention search options
      if (editor.storage.userMention) {
        editor.storage.userMention.searchOptions = {
          onlyFriends: restrictMentionsToFriends,
          currentUserId: currentUserId,
        };
      }
    },
  });

  // Sync content if value changes externally (e.g. clearing form)
  useEffect(() => {
    if (editor && value === "") {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  const handleAddLink = () => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="minimal-editor-wrapper bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden transition-colors focus-within:border-blue-500/50">
      {/* Toolbar minimalista */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/40">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${
            editor.isActive("bold")
              ? "bg-gray-200 dark:bg-white/10 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
          title="Negrita (Ctrl+B)"
        >
          <Bold size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${
            editor.isActive("italic")
              ? "bg-gray-200 dark:bg-white/10 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
          title="Cursiva (Ctrl+I)"
        >
          <Italic size={16} />
        </button>

        <button
          type="button"
          onClick={() => setShowLinkInput(!showLinkInput)}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${
            editor.isActive("link")
              ? "bg-gray-200 dark:bg-white/10 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
          title="Añadir enlace"
        >
          <LinkIcon size={16} />
        </button>

        <div className="flex-1" />

        <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
          <span className="font-medium">#</span> LoL •{" "}
          <span className="font-medium">@</span> Usuario
        </div>
      </div>

      {/* Input de enlace */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://ejemplo.com"
            className="flex-1 bg-white dark:bg-black/40 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddLink();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddLink}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Añadir
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Editor de contenido */}
      <EditorContent editor={editor} className="minimal-editor-content" />

      <style jsx global>{`
        .minimal-editor-content .ProseMirror {
          min-height: 80px;
          max-height: 300px;
          overflow-y: auto;
        }

        .minimal-editor-content
          .ProseMirror
          p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .minimal-editor-content .ProseMirror:focus {
          outline: none;
        }

        /* Menciones */
        .minimal-editor-content .lol-mention,
        .minimal-editor-content .user-mention {
          font-size: 0.875rem;
          line-height: 1.1;
          vertical-align: middle;
        }

        .minimal-editor-content .lol-mention img {
          flex-shrink: 0;
          margin: 0 !important; /* Override prose img styles */
          display: inline-block !important; /* Ensure content flow */
        }
      `}</style>
    </div>
  );
};

export default MinimalEditor;
