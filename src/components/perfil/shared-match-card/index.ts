// Re-export types
export type {
  SharedMatchData,
  SharedMatchCardProps,
  RuneSelection,
  RuneStyle,
  RunePerks,
  PerkJsonEntry,
} from "./types";

// Re-export constants
export { laneIconMap, RUNE_STYLE_LABELS, TAG_INFO_MAP } from "./constants";

// Re-export helpers
export {
  toSafeNumber,
  getRuneStyleLabel,
  getLaneAbbreviation,
  getTagInfo,
  getScoreColor,
  isPerkJsonEntry,
  iconPathToUrl,
} from "./helpers";

// Re-export hooks
export { useRuneIcons } from "./hooks/useRuneIcons";
export { useMobileCarousel } from "./hooks/useMobileCarousel";

// Re-export components
export { ComparativeBullet } from "./components/ComparativeBullet";
export { MatchItems } from "./components/MatchItems";
export { MatchRunes } from "./components/MatchRunes";
export { MatchStats } from "./components/MatchStats";
export { TeamComparison } from "./components/TeamComparison";
export { TeamPlayers } from "./components/TeamPlayers";
export { MatchHeader } from "./components/MatchHeader";
export { MatchFooter } from "./components/MatchFooter";
export { MatchComment } from "./components/MatchComment";
export { CarouselDots } from "./components/CarouselDots";

// Re-export utils
export {
  calculateTeamStats,
  calculatePlayerStats,
  calculateComparisons,
} from "./utils/calculations";

// Main component - Exportamos el componente refactorizado como principal
export { SharedMatchCardRefactored as SharedMatchCard } from "./SharedMatchCard";
