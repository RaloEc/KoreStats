"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type SaveBuildParams = {
  matchId: string;
  targetPuuid: string;
  note?: string;
};

type SaveBuildApiResponse =
  | { success: true; buildId: string }
  | { success: false; message: string };

function isSaveBuildError(
  data: SaveBuildApiResponse
): data is { success: false; message: string } {
  return data.success === false;
}

export function useSaveBuild() {
  const [isSaving, setIsSaving] = useState(false);
  const [savedKeyMap, setSavedKeyMap] = useState<Record<string, true>>({});
  const queryClient = useQueryClient();

  const savedBuildKeys = useMemo(() => Object.keys(savedKeyMap), [savedKeyMap]);

  const saveBuild = async ({
    matchId,
    targetPuuid,
    note,
  }: SaveBuildParams): Promise<boolean> => {
    const key = `${matchId}:${targetPuuid}`;

    if (savedKeyMap[key]) {
      toast.info("Ya guardaste esta build");
      return false;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/riot/builds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          targetPuuid,
          note,
        }),
      });

      const data = (await response.json()) as SaveBuildApiResponse;

      if (!response.ok) {
        if (response.status === 409) {
          toast.info(
            isSaveBuildError(data) ? data.message : "Ya guardaste esta build"
          );
          setSavedKeyMap((prev) => ({ ...prev, [key]: true }));
          return false;
        }

        if (isSaveBuildError(data)) {
          throw new Error(data.message);
        }

        throw new Error("Error al guardar la build");
      }

      setSavedKeyMap((prev) => ({ ...prev, [key]: true }));
      toast.success("Build guardada");

      queryClient.invalidateQueries({ queryKey: ["saved-builds"] });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveBuild,
    isSaving,
    savedBuildKeys,
  };
}
