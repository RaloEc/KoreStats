import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { LoLItem } from "./lol-service";
import UserAvatar from "@/components/UserAvatar";

interface MentionListProps {
  items: LoLItem[];
  command: (props: any) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({
        id: item.id,
        label: item.name,
        // We pass custom attributes that our mention extension will read
        image: item.image,
        type: item.type,
      });
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length,
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (!props.items?.length) {
    return null;
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950 min-w-[200px] max-h-[300px] overflow-y-auto z-50">
      {props.items.map((item, index) => (
        <button
          key={item.id + index} // index added just in case of dupes
          className={`group flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-left
            ${
              index === selectedIndex
                ? "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
          onClick={() => selectItem(index)}
        >
          {item.type === "user" ? (
            <UserAvatar
              username={item.name}
              avatarUrl={item.image}
              size="sm"
              className="h-8 w-8 text-xs border border-zinc-200 dark:border-zinc-700"
            />
          ) : (
            item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="h-8 w-8 rounded object-cover shadow-sm bg-zinc-800"
              />
            )
          )}
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="font-medium truncate">{item.name}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate capitalize">
              {item.type === "ability"
                ? "Habilidad"
                : item.type === "champion"
                  ? "Campeón"
                  : item.type}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = "MentionList";
