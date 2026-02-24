"use client";

import Image from "next/image";
import {
  getChampionImageUrl,
  getSummonerSpellUrl,
  getRuneIconUrl,
} from "./helpers";
import {
  getKeystonePerkId,
  RunesTooltip,
  type RunePerks,
} from "./RunesTooltip";
import { useRunesReforged } from "@/hooks/use-runes-reforged";

interface PlayerSummaryData {
  championName: string;
  summoner1Id?: number;
  summoner2Id?: number;
  primaryRune?: number;
  secondaryRune?: number;
  perks?: RunePerks;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  csTotal?: number;
  csPerMinute?: number;
  label?: string;
  rankingPosition?: number | null;
}

interface PlayerSummaryProps {
  data: PlayerSummaryData;
  version: string;
  reverse?: boolean;
  priority?: boolean;
}

function getRankingBadgeClass(position?: number | null) {
  if (!position) {
    return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
  }
  if (position === 1) {
    return "bg-amber-400 text-slate-900 dark:bg-amber-300";
  }
  if (position <= 3) {
    return "bg-sky-400 text-slate-900 dark:bg-sky-300";
  }
  return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
}

export function PlayerSummaryClient({
  data,
  version,
  reverse = false,
  priority = false,
}: PlayerSummaryProps) {
  const keystonePerkId = getKeystonePerkId(data.perks);
  const { getRuneIconUrl: fetchRuneIconUrl } = useRunesReforged();
  const keystoneIconUrl = keystonePerkId
    ? fetchRuneIconUrl(keystonePerkId)
    : null;

  const avatarBlock = (
    <div className="flex flex-col items-center gap-1.5 w-[72px]">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-800">
        <Image
          src={getChampionImageUrl(data.championName, version)}
          alt={data.championName}
          fill
          sizes="64px"
          className="object-cover"
          priority={priority}
        />
      </div>

      {(data.summoner1Id || data.summoner2Id) && (
        <div className="flex gap-1">
          {data.summoner1Id && (
            <div className="relative w-7 h-7 rounded border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-800 overflow-hidden">
              {getSummonerSpellUrl(data.summoner1Id, version) && (
                <Image
                  src={getSummonerSpellUrl(data.summoner1Id, version)}
                  alt="Spell 1"
                  fill
                  sizes="28px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          )}
          {data.summoner2Id && (
            <div className="relative w-7 h-7 rounded border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-800 overflow-hidden">
              {getSummonerSpellUrl(data.summoner2Id, version) && (
                <Image
                  src={getSummonerSpellUrl(data.summoner2Id, version)}
                  alt="Spell 2"
                  fill
                  sizes="28px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const runeBlock = (
    <div className={`flex flex-col gap-1.5 ${reverse ? "items-end" : ""}`}>
      <RunesTooltip perks={data.perks}>
        <div className={`flex flex-col gap-1.5 ${reverse ? "items-end" : ""}`}>
          {keystoneIconUrl ? (
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-900">
              <Image
                src={keystoneIconUrl}
                alt="Keystone"
                fill
                sizes="28px"
                className="object-cover p-0.5"
                unoptimized
              />
            </div>
          ) : data.primaryRune ? (
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-900">
              <Image
                src={getRuneIconUrl(data.primaryRune)}
                alt="Primary Style"
                fill
                sizes="28px"
                className="object-cover p-0.5"
                unoptimized
              />
            </div>
          ) : null}

          {data.secondaryRune && (
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-900">
              <Image
                src={getRuneIconUrl(data.secondaryRune)}
                alt="Secondary Style"
                fill
                sizes="28px"
                className="object-cover p-0.5"
                unoptimized
              />
            </div>
          )}
        </div>
      </RunesTooltip>
      {typeof data.rankingPosition === "number" && data.rankingPosition > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow ${getRankingBadgeClass(
            data.rankingPosition,
          )}`}
          title={`Ranking global #${data.rankingPosition}`}
        >
          #{data.rankingPosition}
        </span>
      )}
    </div>
  );

  const statsBlock = (
    <div
      className={`flex flex-col gap-1 w-[80px] flex-shrink-0 ${
        reverse ? "items-center text-center" : "items-center text-center"
      }`}
    >
      {data.label && (
        <span className="text-[10px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
          {data.label}
        </span>
      )}
      <div className="text-sm font-bold text-slate-600 dark:text-slate-100">
        {data.kills} / {data.deaths} / {data.assists}
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-400 text-center">
        {data.kda.toFixed(2)}
      </div>
      {typeof data.csTotal === "number" && (
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-100 text-center">
          {data.csTotal} CS
        </div>
      )}
      {typeof data.csPerMinute === "number" && (
        <div className="text-[11px] text-slate-600 dark:text-slate-400 text-center">
          {data.csPerMinute.toFixed(1)} CS/min
        </div>
      )}
    </div>
  );

  return (
    <div className="flex items-start gap-3">
      {reverse ? (
        <>
          {statsBlock}
          {runeBlock}
          {avatarBlock}
        </>
      ) : (
        <>
          {avatarBlock}
          {runeBlock}
          {statsBlock}
        </>
      )}
    </div>
  );
}
