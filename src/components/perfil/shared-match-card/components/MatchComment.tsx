"use client";

import React from "react";

interface MatchCommentProps {
  comment: string | null;
}

export const MatchComment: React.FC<MatchCommentProps> = ({ comment }) => {
  if (!comment) return null;

  return (
    <div className="bg-white/90 border border-slate-200 rounded p-3 text-sm text-slate-800 italic shadow-sm dark:bg-white/10 dark:border-white/20 dark:text-white/90">
      &quot;{comment}&quot;
    </div>
  );
};
