"use client";

import React from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookmarkPlus, ChevronDown, Trash2 } from "lucide-react";
import {
  getChampionImg,
  getItemImg,
  getRuneStyleImg,
  getSpellImg,
} from "@/lib/riot/helpers";
import {
  getKeystonePerkId,
  usePerkAssets,
  type RunePerks,
} from "@/components/riot/match-card/RunesTooltip";

const EMPTY_BUILDS: SavedBuild[] = [];

type SavedBuild = {
  id: string;
  match_id: string | null;
  source_puuid: string | null;
  source_summoner_name: string | null;
  champion_id: number;
  champion_name: string;
  role: string | null;
  queue_id: number | null;
  game_version: string | null;
  win: boolean | null;
  items: number[];
  perk_primary_style: number | null;
  perk_sub_style: number | null;
  keystone_perk_id: number | null;
  perks: unknown;
  summoner1_id: number | null;
  summoner2_id: number | null;
  note: string | null;
  created_at: string;
};

const WARD_ITEM_IDS = new Set([
  3340, 3363, 3364, 2055, 2056, 2057, 2138, 2139, 2140,
]);

type ListBuildsResponse =
  | { success: true; builds: SavedBuild[] }
  | { success: false; message: string };

type DeleteBuildResponse =
  | { success: true }
  | { success: false; message: string };

function isListBuildsError(
  data: ListBuildsResponse
): data is { success: false; message: string } {
  return data.success === false;
}

function isDeleteBuildError(
  data: DeleteBuildResponse
): data is { success: false; message: string } {
  return data.success === false;
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((n) => Number.isFinite(n));
}

function normalizePerks(perks: unknown): RunePerks | null {
  if (!perks || typeof perks !== "object") return null;
  return perks as RunePerks;
}

export function SavedBuildsPanel() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);

  const buildsQuery = useQuery({
    queryKey: ["saved-builds"],
    queryFn: async (): Promise<SavedBuild[]> => {
      const res = await fetch("/api/riot/builds");
      const data = (await res.json()) as ListBuildsResponse;
      if (!res.ok || isListBuildsError(data)) {
        throw new Error(
          isListBuildsError(data)
            ? data.message
            : "No se pudieron cargar las builds"
        );
      }
      return data.builds.map((b) => ({
        ...b,
        items: toNumberArray(b.items),
      }));
    },
    staleTime: 1000 * 30,
  });

  const deleteMutation = useMutation({
    mutationFn: async (buildId: string): Promise<void> => {
      const res = await fetch(`/api/riot/builds/${buildId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as DeleteBuildResponse;
      if (!res.ok || isDeleteBuildError(data)) {
        throw new Error(
          isDeleteBuildError(data)
            ? data.message
            : "No se pudo eliminar la build"
        );
      }
    },
    onSuccess: async () => {
      toast.success("Build eliminada");
      await queryClient.invalidateQueries({ queryKey: ["saved-builds"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    },
  });

  const builds = buildsQuery.data ?? EMPTY_BUILDS;

  const perkIdsNeeded = React.useMemo(() => {
    const ids = new Set<number>();
    for (const build of builds) {
      const perks = normalizePerks(build.perks);
      const keystoneId =
        (typeof build.keystone_perk_id === "number" && build.keystone_perk_id
          ? build.keystone_perk_id
          : getKeystonePerkId(perks)) ?? null;
      if (keystoneId) ids.add(keystoneId);
    }
    return Array.from(ids);
  }, [builds]);

  const { perkIconById, perkNameById } = usePerkAssets(perkIdsNeeded);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookmarkPlus className="w-4 h-4 text-blue-600 dark:text-blue-300" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Builds guardadas
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({builds.length})
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-slate-200/80 dark:border-slate-800">
          {buildsQuery.isLoading ? (
            <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
              Cargando builds...
            </div>
          ) : buildsQuery.isError ? (
            <div className="p-4 text-sm text-rose-600 dark:text-rose-300">
              {buildsQuery.error instanceof Error
                ? buildsQuery.error.message
                : "Error al cargar"}
            </div>
          ) : builds.length === 0 ? (
            <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
              Aún no tienes builds guardadas. Abre una partida y usa "Guardar
              build".
            </div>
          ) : (
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800/60 max-h-96 overflow-y-auto">
              {builds.map((build) => {
                const perks = normalizePerks(build.perks);
                const keystoneId =
                  (typeof build.keystone_perk_id === "number" &&
                  build.keystone_perk_id
                    ? build.keystone_perk_id
                    : getKeystonePerkId(perks)) ?? null;

                const keystoneIcon = keystoneId
                  ? perkIconById[keystoneId]
                  : null;
                const keystoneName = keystoneId
                  ? perkNameById[keystoneId]
                  : null;

                const secondaryRuneSrc = getRuneStyleImg(build.perk_sub_style);

                const spell1Src = build.summoner1_id
                  ? getSpellImg(
                      build.summoner1_id,
                      build.game_version ?? undefined
                    )
                  : null;
                const spell2Src = build.summoner2_id
                  ? getSpellImg(
                      build.summoner2_id,
                      build.game_version ?? undefined
                    )
                  : null;

                const mainItems = build.items
                  .slice(0, 6)
                  .filter((id) => id > 0 && !WARD_ITEM_IDS.has(id));
                const wardItem =
                  build.items.find((id) => id > 0 && WARD_ITEM_IDS.has(id)) ??
                  null;

                return (
                  <div key={build.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900/30 flex-shrink-0">
                        <Image
                          src={getChampionImg(
                            build.champion_name,
                            build.game_version ?? undefined
                          )}
                          alt={build.champion_name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {build.champion_name}
                              {build.source_summoner_name
                                ? ` • ${build.source_summoner_name}`
                                : ""}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(build.created_at).toLocaleString()}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(build.id)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            title="Eliminar build"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {/* Runas: Keystone + Secundaria */}
                          <div className="flex items-center gap-1">
                            {keystoneIcon ? (
                              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-900">
                                <Image
                                  src={keystoneIcon}
                                  alt={keystoneName ?? "Keystone"}
                                  fill
                                  sizes="28px"
                                  className="object-cover p-0.5"
                                  unoptimized
                                />
                              </div>
                            ) : null}
                            {secondaryRuneSrc ? (
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-900">
                                <img
                                  src={secondaryRuneSrc}
                                  alt="Runa secundaria"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : null}
                          </div>

                          {/* Divider */}
                          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />

                          {/* Hechizos de invocador */}
                          <div className="flex items-center gap-1">
                            {spell1Src ? (
                              <div className="relative w-6 h-6 rounded border border-slate-300 dark:border-slate-600 overflow-hidden bg-slate-900">
                                <Image
                                  src={spell1Src}
                                  alt="Hechizo 1"
                                  fill
                                  sizes="24px"
                                  className="object-cover"
                                />
                              </div>
                            ) : null}
                            {spell2Src ? (
                              <div className="relative w-6 h-6 rounded border border-slate-300 dark:border-slate-600 overflow-hidden bg-slate-900">
                                <Image
                                  src={spell2Src}
                                  alt="Hechizo 2"
                                  fill
                                  sizes="24px"
                                  className="object-cover"
                                />
                              </div>
                            ) : null}
                          </div>

                          {/* Divider */}
                          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />

                          {/* Items principales */}
                          <div className="flex items-center gap-1">
                            {mainItems.map((itemId, idx) => {
                              const src = getItemImg(
                                itemId,
                                build.game_version ?? undefined
                              );
                              return (
                                <div
                                  key={`${build.id}-item-${idx}`}
                                  className="relative w-7 h-7 rounded border border-slate-200 dark:border-slate-700 overflow-hidden bg-white/70 dark:bg-slate-900/40"
                                >
                                  {src ? (
                                    <Image
                                      src={src}
                                      alt={`Item ${itemId}`}
                                      fill
                                      sizes="28px"
                                      className="object-cover"
                                    />
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>

                          {/* Ward separado */}
                          {wardItem ? (
                            <>
                              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
                              <div className="relative w-6 h-6 rounded border border-yellow-400/50 dark:border-yellow-500/40 overflow-hidden bg-yellow-50/50 dark:bg-yellow-900/20">
                                <Image
                                  src={
                                    getItemImg(
                                      wardItem,
                                      build.game_version ?? undefined
                                    ) ?? ""
                                  }
                                  alt="Ward"
                                  fill
                                  sizes="24px"
                                  className="object-cover"
                                />
                              </div>
                            </>
                          ) : null}
                        </div>

                        {build.note ? (
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                            {build.note}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
