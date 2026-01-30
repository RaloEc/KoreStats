import Mention from "@tiptap/extension-mention";
import {
  mergeAttributes,
  ReactRenderer,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import tippy, { Instance, Props } from "tippy.js";
import { MentionList } from "./MentionList";
import { UserMentionNode } from "../components/UserMentionNode";
import { searchUsers } from "./user-service";

export const UserMention = Mention.extend({
  name: "userMention",

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
        default: "user",
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
    const label = node.attrs.label || node.attrs.id;

    // Simple rendering: Only username text (no image)
    return ["span", merged, label];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UserMentionNode);
  },

  addStorage() {
    return {
      searchOptions: null,
    };
  },
}).configure({
  suggestion: {
    char: "@",
    items: async ({ query, editor }) => {
      // Get search options from editor storage if available
      const searchOptions = editor.storage.userMention?.searchOptions;

      // Search users using existing service
      const users = await searchUsers(query, searchOptions);
      return users.map((u) => ({
        id: u.name,
        name: u.name,
        type: "user",
        image: u.image || "",
        description: "Usuario", // For filtering/display
      }));
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
