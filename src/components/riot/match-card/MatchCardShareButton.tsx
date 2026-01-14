"use client";

import { Share2 } from "lucide-react";
import { useShareMatch } from "@/hooks/use-share-match";

interface MatchCardShareButtonProps {
  matchId: string;
}

export function MatchCardShareButton({ matchId }: MatchCardShareButtonProps) {
  const { shareMatch, isSharing, sharedMatches } = useShareMatch();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        shareMatch(matchId);
      }}
      disabled={isSharing || sharedMatches.includes(matchId)}
      className={`
        flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
        ${
          sharedMatches.includes(matchId)
            ? "bg-green-500/20 text-green-600 dark:text-green-400 cursor-default"
            : "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
        }
      `}
      title={
        sharedMatches.includes(matchId) ? "Compartida" : "Compartir en Activity"
      }
    >
      <Share2 className="w-3 h-3" />
      <span className="hidden sm:inline">
        {sharedMatches.includes(matchId) ? "Compartida" : "Compartir"}
      </span>
    </button>
  );
}
