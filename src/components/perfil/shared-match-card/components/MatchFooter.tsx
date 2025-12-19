"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface MatchFooterProps {
  matchId: string;
}

export const MatchFooter: React.FC<MatchFooterProps> = ({ matchId }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Link
        href={`/match/${matchId}`}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition hover:bg-slate-800 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
      >
        Abrir análisis
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  );
};
