"use client";

import React, { useEffect, useState } from "react";
import parse, {
  domToReact,
  HTMLReactParserOptions,
  Element,
  DOMNode,
} from "html-react-parser";
import { UserHoverCard } from "./UserHoverCard";
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
