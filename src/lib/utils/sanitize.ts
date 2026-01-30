import DOMPurify from "isomorphic-dompurify";

export const sanitizeHtml = (html: string): string => {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ADD_TAGS: [
      "iframe",
      "img",
      "blockquote",
      "code",
      "pre",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "a",
      "p",
      "div",
      "span",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "figure",
      "figcaption",
    ],
    ADD_ATTR: [
      "target",
      "allow",
      "allowfullscreen",
      "frameborder",
      "scrolling",
      "style",
      "class",
      "src",
      "href",
      "rel",
      "alt",
      "title",
      "width",
      "height",
      "data-language", // For code blocks
      "data-theme", // For embeds potentially
      "data-id",
      "data-type",
      "data-click-to-copy",
      "data-image",
      "data-name",
    ],
    // Forbidding potentially dangerous tags even if they were in ADD_TAGS default (just to be safe)
    FORBID_TAGS: [
      "script",
      "style",
      "input",
      "form",
      "textarea",
      "select",
      "button",
    ],
    // Allowing iframes only from specific trusted sources could be done with a hook,
    // but for now we trust the iframe tag if it's there, assuming content comes from admins/trusted sources.
    // However, to be safer, we can use a hook to validate src.
  });
};
