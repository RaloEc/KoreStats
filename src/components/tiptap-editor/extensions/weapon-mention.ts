import Mention from "@tiptap/extension-mention";
import { mergeAttributes, ReactRenderer } from "@tiptap/react";
import tippy, { Instance, Props } from "tippy.js";
import { MentionList } from "./MentionList";
import { searchWeaponsContent } from "./weapon-service";

export const WeaponMention = Mention.extend({
  name: "weaponMention",

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { "data-id": attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) return {};
          return { "data-label": attributes.label };
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
        default: "weaponMention",
        parseHTML: (element) => element.getAttribute("data-type") || "weaponMention",
        renderHTML: (attributes) => {
          return { "data-type": attributes.type || "weaponMention" };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const merged = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);

    return [
      "span",
      mergeAttributes(merged, {
        class:
          "weapon-mention inline-flex items-center align-middle bg-[#0eea8e]/10 dark:bg-[#0eea8e]/5 border border-[#0eea8e]/20 rounded px-1.5 py-0.5 mx-0.5 select-all font-semibold text-xs leading-none text-[#03ba6d] dark:text-[#0eea8e]",
      }),
      `#${node.attrs.label ?? node.attrs.id}`,
    ];
  },
}).configure({
  suggestion: {
    char: "#",
    items: async ({ query }) => {
      // Buscar en el servicio de armas
      return await searchWeaponsContent(query);
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
            zIndex: 9999,
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
