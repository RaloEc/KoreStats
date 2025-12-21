"use client";

import React from "react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRuneIconUrl } from "@/components/riot/match-card/helpers";
import type { RuneStyle } from "../types";
import { toSafeNumber, getRuneStyleLabel } from "../helpers";

interface MatchRunesProps {
  primaryStyle?: RuneStyle;
  secondaryStyle?: RuneStyle;
  statPerks?: {
    offense?: number;
    flex?: number;
    defense?: number;
  };
  perkPrimaryStyle: number;
  perkSubStyle: number;
  perkIconById: Record<number, string>;
  perkNameById: Record<number, string>;
}

export const MatchRunes: React.FC<MatchRunesProps> = ({
  primaryStyle,
  secondaryStyle,
  statPerks,
  perkPrimaryStyle,
  perkSubStyle,
  perkIconById,
  perkNameById,
}) => {
  const hasDetailedRunes = Boolean(
    (primaryStyle?.selections && primaryStyle.selections.length > 0) ||
      (secondaryStyle?.selections && secondaryStyle.selections.length > 0) ||
      statPerks?.offense ||
      statPerks?.flex ||
      statPerks?.defense
  );

  const renderRuneSelections = (style?: RuneStyle) => {
    if (!style?.selections?.length) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {style.selections.map((selection, index) => {
          const perkId = toSafeNumber(selection.perk);
          const icon =
            typeof perkId === "number" ? perkIconById[perkId] : undefined;
          const perkName =
            typeof perkId === "number" ? perkNameById[perkId] : undefined;
          const key = `${style.style}-${perkId ?? "x"}-${index}`;
          return (
            <div
              key={key}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-900/60 border border-white/10"
            >
              {icon ? (
                <Image
                  src={icon}
                  alt={perkName ?? "Runa seleccionada"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-slate-800" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderShardIcons = () => {
    if (!statPerks) return null;
    const shards = [
      toSafeNumber(statPerks.offense),
      toSafeNumber(statPerks.flex),
      toSafeNumber(statPerks.defense),
    ].filter((value): value is number => typeof value === "number");
    if (shards.length === 0) return null;
    return (
      <div className="flex items-center gap-2 mt-2">
        {shards.map((shardId, index) => {
          const icon =
            typeof shardId === "number" ? perkIconById[shardId] : undefined;
          const perkName =
            typeof shardId === "number" ? perkNameById[shardId] : undefined;
          const key = `shard-${shardId}-${index}`;
          return (
            <div
              key={key}
              className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-900/60 border border-white/10"
            >
              {icon ? (
                <Image
                  src={icon}
                  alt={perkName ?? "Fragmento"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-slate-800" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const RuneTooltipContent = () => {
    if (!hasDetailedRunes) return null;
    return (
      <div className="space-y-3 text-xs">
        {primaryStyle && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Primaria • {getRuneStyleLabel(primaryStyle.style)}
            </p>
            {renderRuneSelections(primaryStyle)}
          </div>
        )}
        {secondaryStyle && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Secundaria • {getRuneStyleLabel(secondaryStyle.style)}
            </p>
            {renderRuneSelections(secondaryStyle)}
          </div>
        )}
        {renderShardIcons() && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Fragmentos
            </p>
            {renderShardIcons()}
          </div>
        )}
      </div>
    );
  };

  const keystonePerkId = toSafeNumber(primaryStyle?.selections?.[0]?.perk);
  const keystoneIcon =
    typeof keystonePerkId === "number" ? perkIconById[keystonePerkId] : null;
  const keystoneName =
    typeof keystonePerkId === "number" ? perkNameById[keystonePerkId] : null;

  const runeIcons = (
    <>
      {keystoneIcon ? (
        <div className="group/rune relative w-full h-full rounded overflow-hidden bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 border border-white/40 dark:border-white/20 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md">
          <Image
            src={keystoneIcon}
            alt={keystoneName ?? "Keystone"}
            fill
            className="object-cover"
            unoptimized
          />
          {/* Brillo superior */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      ) : (
        perkPrimaryStyle > 0 && (
          <div className="group/rune relative w-full h-full rounded overflow-hidden bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 border border-white/40 dark:border-white/20 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md">
            <Image
              src={getRuneIconUrl(perkPrimaryStyle)}
              alt="Estilo primario"
              fill
              className="object-cover"
              unoptimized
            />
            {/* Brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        )
      )}
      {perkSubStyle > 0 && (
        <div className="group/rune relative w-full h-full rounded overflow-hidden bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 border border-white/40 dark:border-white/20 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md">
          <Image
            src={getRuneIconUrl(perkSubStyle)}
            alt="Estilo secundario"
            fill
            className="object-cover"
            unoptimized
          />
          {/* Brillo superior */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      )}
    </>
  );

  if (hasDetailedRunes) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{runeIcons}</TooltipTrigger>
        <TooltipContent className="w-64 p-3 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <RuneTooltipContent />
        </TooltipContent>
      </Tooltip>
    );
  }

  return runeIcons;
};
