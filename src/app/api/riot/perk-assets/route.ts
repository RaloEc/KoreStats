import { NextRequest, NextResponse } from "next/server";

type PerkAssetsResponse =
  | {
      success: true;
      icons: Record<number, string>;
      names: Record<number, string>;
    }
  | {
      success: false;
      message: string;
    };

type PerkJsonEntry = {
  id: number;
  name: string;
  iconPath: string;
};

const isPerkJsonEntry = (value: unknown): value is PerkJsonEntry => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "number" &&
    typeof obj.name === "string" &&
    typeof obj.iconPath === "string"
  );
};

const iconPathToUrl = (iconPath: string): string | null => {
  const prefix = "/lol-game-data/assets/";
  if (!iconPath.startsWith(prefix)) return null;
  const relative = iconPath.slice(prefix.length).toLowerCase();
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${relative}`;
};

let perkIndexPromise: Promise<{
  icons: Record<number, string>;
  names: Record<number, string>;
}> | null = null;

async function loadPerkIndex(): Promise<{
  icons: Record<number, string>;
  names: Record<number, string>;
}> {
  if (perkIndexPromise) return perkIndexPromise;

  perkIndexPromise = (async () => {
    const response = await fetch(
      "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json",
      {
        next: { revalidate: 60 * 60 },
      }
    );

    if (!response.ok) {
      return { icons: {}, names: {} };
    }

    const raw: unknown = await response.json();
    if (!Array.isArray(raw)) {
      return { icons: {}, names: {} };
    }

    const icons: Record<number, string> = {};
    const names: Record<number, string> = {};

    for (const entry of raw) {
      if (!isPerkJsonEntry(entry)) continue;
      const url = iconPathToUrl(entry.iconPath);
      if (!url) continue;
      icons[entry.id] = url;
      names[entry.id] = entry.name;
    }

    return { icons, names };
  })();

  return perkIndexPromise;
}

function parseIdsParam(value: string | null): number[] {
  if (!value) return [];
  const ids = value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const unique: number[] = [];
  for (const id of ids) {
    if (!unique.includes(id)) unique.push(id);
  }

  return unique;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<PerkAssetsResponse>> {
  try {
    const ids = parseIdsParam(request.nextUrl.searchParams.get("ids"));
    if (ids.length === 0) {
      return NextResponse.json(
        { success: true, icons: {}, names: {} },
        { status: 200 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Demasiados ids (máximo 50)",
        },
        { status: 400 }
      );
    }

    const index = await loadPerkIndex();

    const icons: Record<number, string> = {};
    const names: Record<number, string> = {};

    for (const id of ids) {
      const icon = index.icons[id];
      const name = index.names[id];
      if (icon) icons[id] = icon;
      if (name) names[id] = name;
    }

    return NextResponse.json({ success: true, icons, names }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/riot/perk-assets] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
