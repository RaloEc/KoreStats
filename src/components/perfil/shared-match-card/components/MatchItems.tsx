import React from "react";
import Image from "next/image";
import { getItemImageUrl } from "@/components/riot/match-card/helpers";

interface MatchItemsProps {
  items: number[];
  dataVersion: string;
  runesComponent?: React.ReactNode;
}

export const MatchItems: React.FC<MatchItemsProps> = ({
  items,
  dataVersion,
  runesComponent,
}) => {
  return (
    <div className="flex items-center justify-center flex-wrap gap-2 mt-2">
      {/* Grid de runas/hechizos */}
      {runesComponent && (
        <>
          {runesComponent}

          {/* Divider vertical */}
          <div className="h-10 w-px bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent mx-1" />
        </>
      )}

      {/* Items */}
      {items.slice(0, 6).map((itemId, idx) => (
        <div
          key={idx}
          className="relative w-10 h-10 rounded border border-slate-200/80 overflow-hidden bg-white/95 shadow-sm dark:border-white/20 dark:bg-white/10"
        >
          {itemId > 0 && (
            <Image
              src={getItemImageUrl(itemId, dataVersion)}
              alt={`Item ${itemId}`}
              fill
              className="object-cover"
              unoptimized
            />
          )}
        </div>
      ))}
    </div>
  );
};
