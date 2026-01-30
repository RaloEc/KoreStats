import Mention from "@tiptap/extension-mention";
import { mergeAttributes, ReactRenderer } from "@tiptap/react";
import tippy, { Instance, Props } from "tippy.js";
import { MentionList } from "./MentionList";
import { searchLoLContent } from "./lol-service";

export const LolMention = Mention.extend({
  name: "lolMention",

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            "data-id": attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }
          return {
            "data-label": attributes.label,
          };
        },
      },
      image: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-image"),
        renderHTML: (attributes) => {
          if (!attributes.image) return {};
          return { "data-image": attributes.image };
        },
      },
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-type"),
        renderHTML: (attributes) => {
          if (!attributes.type) return {};
          return { "data-type": attributes.type };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const merged = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);

    // Custom rendering: Image + Text
    if (node.attrs.image) {
      return [
        "span",
        mergeAttributes(merged, {
          class:
            "lol-mention-container inline-flex items-center align-middle bg-primary/10 rounded px-1 py-0.5 mx-0.5",
        }),
        [
          "img",
          {
            src: node.attrs.image,
            alt: node.attrs.label,
            class:
              "lol-mention-img !w-5 !h-5 !min-w-5 !min-h-5 rounded-sm !my-0 !mr-1.5 select-none pointer-events-none object-contain",
          },
        ],
        [
          "span",
          { class: "font-medium text-sm leading-none" },
          `${node.attrs.label ?? node.attrs.id}`,
        ],
      ];
    }

    return ["span", merged, `#${node.attrs.label ?? node.attrs.id}`];
  },
}).configure({
  suggestion: {
    char: "#",
    items: async ({ query }) => {
      // Fetch from LoL service
      return await searchLoLContent(query);
    },
    render: () => {
      let component: ReactRenderer<any> | undefined;
      let popup: Instance<Props> | undefined;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          const instances = tippy("body", {
            getReferenceClientRect: props.clientRect as any,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            zIndex: 9999, // Ensure it's on top
          });

          if (Array.isArray(instances)) {
            popup = instances[0];
          } else {
            popup = instances as Instance<Props>;
          }
        },

        onUpdate(props) {
          component?.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.setProps({
            getReferenceClientRect: props.clientRect as any,
          });
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup?.hide();

            return true;
          }

          if (component?.ref) {
            const ref = component.ref as any;
            return ref.onKeyDown(props);
          }
          return false;
        },

        onExit() {
          if (popup) {
            popup.destroy();
            popup = undefined;
          }
          if (component) {
            component.destroy();
            component = undefined;
          }
        },
      };
    },
  },
});
