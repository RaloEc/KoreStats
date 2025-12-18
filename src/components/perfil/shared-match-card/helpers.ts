import type { MatchTag } from "@/lib/riot/match-analyzer";
import { RUNE_STYLE_LABELS, TAG_INFO_MAP } from "./constants";

export const toSafeNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const getRuneStyleLabel = (styleId?: number) => {
  if (!styleId) return "Runas";
  return RUNE_STYLE_LABELS[styleId] ?? "Runas";
};

const normalizeRole = (value?: string) =>
  value?.toUpperCase().replace(/\s+/g, "") ?? "";

export const getLaneAbbreviation = (
  role?: string,
  lane?: string
): string | null => {
  const priority = [role, lane]
    .map((val, index) =>
      index === 0 ? normalizeRole(val) : normalizeRole(val)
    )
    .filter(Boolean);

  const supportRoles = new Set(["DUOSUPPORT", "SUPPORT", "SUPP", "UTILITY"]);

  if (supportRoles.has(priority[0])) return "SUPP";

  const map: Record<string, string> = {
    TOP: "TOP",
    JUNGLE: "JG",
    JUNGLER: "JG",
    JG: "JG",
    MID: "MID",
    MIDDLE: "MID",
    MIDLANE: "MID",
    BOTTOM: "ADC",
    BOT: "ADC",
    ADC: "ADC",
    DUOCARRY: "ADC",
    CARRY: "ADC",
    MARKSMAN: "ADC",
    SUPPORT: "SUPP",
    SUP: "SUPP",
    SUPP: "SUPP",
    DUOSUPPORT: "SUPP",
    UTILITY: "SUPP",
  };

  for (const value of priority) {
    if (!value) continue;
    if (supportRoles.has(value)) return "SUPP";
    if (map[value]) return map[value];
  }

  return null;
};

export const getTagInfo = (tag: MatchTag) => {
  return TAG_INFO_MAP[tag] || { color: "bg-gray-100", label: tag };
};

export const getScoreColor = (score: number | null) => {
  if (!score) return "text-slate-400";
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 75) return "text-blue-600 dark:text-blue-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 45) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};

export const isPerkJsonEntry = (
  value: unknown
): value is { id: number; name: string; iconPath: string } => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "number" &&
    typeof obj.name === "string" &&
    typeof obj.iconPath === "string"
  );
};

export const iconPathToUrl = (iconPath: string): string | null => {
  const prefix = "/lol-game-data/assets/";
  if (!iconPath.startsWith(prefix)) return null;
  const relative = iconPath.slice(prefix.length).toLowerCase();
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${relative}`;
};
