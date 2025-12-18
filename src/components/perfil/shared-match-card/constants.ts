import {
  Mountain,
  Route,
  Swords,
  Target,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import type { MatchTag } from "@/lib/riot/match-analyzer";

export const laneIconMap: Record<string, LucideIcon> = {
  TOP: Mountain,
  JG: Route,
  MID: Swords,
  ADC: Target,
  SUPP: LifeBuoy,
};

export const RUNE_STYLE_LABELS: Record<number, string> = {
  8000: "Precisión",
  8100: "Dominación",
  8200: "Brujería",
  8300: "Inspiración",
  8400: "Valor",
};

export const TAG_INFO_MAP: Record<MatchTag, { color: string; label: string }> =
  {
    MVP: {
      color:
        "bg-amber-100 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
      label: "MVP",
    },
    Stomper: {
      color:
        "bg-rose-100 dark:bg-rose-200/80 text-slate-900 dark:text-slate-950",
      label: "Stomper",
    },
    Muralla: {
      color:
        "bg-slate-200 dark:bg-slate-300/80 text-slate-900 dark:text-slate-950",
      label: "Muralla",
    },
    Farmeador: {
      color:
        "bg-amber-200 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
      label: "Farmeador",
    },
    Visionario: {
      color:
        "bg-emerald-100 dark:bg-emerald-200/85 text-slate-900 dark:text-slate-950",
      label: "Visionario",
    },
    Objetivos: {
      color:
        "bg-blue-100 dark:bg-blue-200/85 text-slate-900 dark:text-slate-950",
      label: "Objetivos",
    },
    Implacable: {
      color:
        "bg-purple-100 dark:bg-fuchsia-200/85 text-slate-900 dark:text-slate-950",
      label: "Implacable",
    },
    Titan: {
      color:
        "bg-orange-100 dark:bg-orange-200/85 text-slate-900 dark:text-slate-950",
      label: "Titan",
    },
    Demoledor: {
      color:
        "bg-amber-100 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
      label: "Demoledor",
    },
    KS: {
      color:
        "bg-pink-100 dark:bg-pink-200/85 text-slate-900 dark:text-slate-950",
      label: "KS",
    },
    Sacrificado: {
      color:
        "bg-slate-200 dark:bg-slate-200/85 text-slate-900 dark:text-slate-950",
      label: "Sacrificado",
    },
    Ladron: {
      color: "bg-red-100 dark:bg-red-200/85 text-slate-900 dark:text-slate-950",
      label: "Ladron",
    },
    Desafortunado: {
      color:
        "bg-slate-100 dark:bg-slate-200/80 text-slate-900 dark:text-slate-950",
      label: "Desafortunado",
    },
    DiosDelCS: {
      color:
        "bg-yellow-100 dark:bg-yellow-200/85 text-slate-900 dark:text-slate-950",
      label: "Dios del CS",
    },
    SoloKill: {
      color: "bg-red-100 dark:bg-red-200/85 text-slate-900 dark:text-slate-950",
      label: "Solo Kill",
    },
    Remontada: {
      color:
        "bg-blue-100 dark:bg-blue-200/85 text-slate-900 dark:text-slate-950",
      label: "Remontada",
    },
    Destructor: {
      color:
        "bg-orange-200 dark:bg-orange-300/85 text-slate-900 dark:text-slate-950",
      label: "Destructor",
    },
    FuriaTemprana: {
      color:
        "bg-rose-200 dark:bg-rose-300/85 text-slate-900 dark:text-slate-950",
      label: "Furia Temprana",
    },
    MaestroDeCC: {
      color:
        "bg-purple-200 dark:bg-purple-300/85 text-slate-900 dark:text-slate-950",
      label: "Maestro de CC",
    },
    Duelista: {
      color: "bg-red-200 dark:bg-red-300/85 text-slate-900 dark:text-slate-950",
      label: "Duelista",
    },
    PrimeraSangre: {
      color:
        "bg-rose-100 dark:bg-rose-200/85 text-slate-900 dark:text-slate-950",
      label: "Primera Sangre",
    },
    PentaKill: {
      color:
        "bg-red-500 text-white dark:bg-red-600 dark:text-white font-bold animate-pulse",
      label: "PENTA KILL",
    },
    QuadraKill: {
      color: "bg-red-400 text-white dark:bg-red-500 dark:text-white font-bold",
      label: "QUADRA KILL",
    },
    TripleKill: {
      color:
        "bg-orange-400 text-white dark:bg-orange-500 dark:text-white font-bold",
      label: "TRIPLE KILL",
    },
    DobleKill: {
      color:
        "bg-amber-400 text-white dark:bg-amber-500 dark:text-white font-bold",
      label: "DOBLE KILL",
    },
  };
