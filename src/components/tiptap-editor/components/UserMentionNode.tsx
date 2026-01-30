import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import React from "react";
import { UserHoverCard } from "./UserHoverCard";

export const UserMentionNode = (props: any) => {
  const { node } = props;
  const label = node.attrs.label || node.attrs.id;

  // Clases por defecto que coinciden con extensions.ts para mantener consistencia visual
  const defaultClasses =
    "user-mention inline-flex items-center px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium mx-0.5 border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors hover:bg-blue-200 dark:hover:bg-blue-900/50";

  return (
    <NodeViewWrapper as="span" className="inline-block decoration-clone">
      <UserHoverCard username={label}>
        <span className={defaultClasses}>{label}</span>
      </UserHoverCard>
    </NodeViewWrapper>
  );
};
