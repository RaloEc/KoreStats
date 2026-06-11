"use client";

import React, { useEffect, useState } from "react";
import parse, {
  domToReact,
  HTMLReactParserOptions,
  Element,
  DOMNode,
} from "html-react-parser";
import { UserHoverCard } from "./UserHoverCard";
import { WeaponHoverCard } from "./WeaponHoverCard";
import { cn } from "@/lib/utils";

interface RichTextRendererProps {
  content: string;
  className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className,
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      // Check if node is an element
      if (domNode instanceof Element && domNode.type === "tag") {
        const { name, attribs, children } = domNode;

        // Replace <p> with <div> to prevent "div inside p" hydration errors
        // when interactive components (like tooltips) are rendered inside.
        if (name === "p") {
          return (
            <div className={cn("mb-3 last:mb-0", attribs.class)}>
              {domToReact(children as DOMNode[], options)}
            </div>
          );
        }

        // Check for user-mention span
        if (
          name === "span" &&
          (attribs["data-type"] === "userMention" ||
            attribs.class?.includes("user-mention"))
        ) {
          const label = attribs["data-label"] || attribs["data-id"];
          const displayText =
            children && children.length > 0 && (children[0] as any).data
              ? (children[0] as any).data
              : label;

          const originalClass = attribs.class || "";

          return (
            <UserHoverCard username={label || displayText || ""}>
              <span
                className={cn(
                  originalClass,
                  "cursor-pointer transition-colors hover:text-blue-800 dark:hover:text-blue-200 inline-block", // inline-block helps with hover area
                )}
                data-id={attribs["data-id"]}
                data-type="userMention"
              >
                {domToReact(children as DOMNode[], options)}
              </span>
            </UserHoverCard>
          );
        }

        // Check for weapon-mention span
        if (
          name === "span" &&
          (attribs["data-type"] === "weaponMention" ||
            attribs.class?.includes("weapon-mention"))
        ) {
          const label = attribs["data-label"] || attribs["data-id"] || "";
          const cleanText = label.startsWith("#") ? label : `#${label}`;

          const cleanClass = 
            "weapon-mention inline-flex items-center align-middle bg-[#0eea8e]/10 dark:bg-[#0eea8e]/5 border border-[#0eea8e]/20 rounded px-1.5 py-0.5 mx-0.5 select-all font-semibold text-xs leading-none text-[#03ba6d] dark:text-[#0eea8e] cursor-pointer hover:opacity-80 transition-all";

          return (
            <WeaponHoverCard weaponName={label}>
              <span
                className={cleanClass}
                data-id={attribs["data-id"]}
                data-type="weaponMention"
                data-label={label}
              >
                {cleanText}
              </span>
            </WeaponHoverCard>
          );
        }
      }
    },
  };

  if (!isClient) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <div className={className}>{parse(content, options)}</div>;
};
