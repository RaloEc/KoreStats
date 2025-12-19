import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

const DEFAULT_GAP_HOURS = 2;
const DEFAULT_MAX_MATCHES = 120;
const DEFAULT_MIN_GAME_DURATION_SECONDS = 300;
const DEFAULT_EARLY_SURRENDER_MAX_SECONDS = 300;

const QUEUE_FILTERS: Record<string, number[]> = {
  normals: [400, 430],
  soloq: [420],
  flex: [440],
  aram: [450],
  urf: [900],
};

interface ParticipantMatchRow {
  match_id: string;
  win: boolean;
  matches: {
    game_creation: number | null;
    game_duration: number | null;
    queue_id: number | null;
    full_json?: unknown;
  } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractEarlySurrenderFlag(fullJson: unknown): boolean {
  if (!isRecord(fullJson)) return false;
  const info = fullJson["info"];
  if (!isRecord(info)) return false;
  return info["gameEndedInEarlySurrender"] === true;
}

function computeWinStreak(matches: Array<{ win: boolean }>): number {
  let streak = 0;
  for (const m of matches) {
    if (!m.win) break;
    streak += 1;
  }
  return streak;
}

function computeLossStreak(matches: Array<{ win: boolean }>): number {
  let streak = 0;
  for (const m of matches) {
    if (m.win) break;
    streak += 1;
  }
  return streak;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

function getStartOfDayUtcMsForOffset(
  now: Date,
  tzOffsetMinutes: number
): number {
  const shiftedMs = now.getTime() - tzOffsetMinutes * 60_000;
  const shiftedDate = new Date(shiftedMs);
  const startShiftedUtcMs = Date.UTC(
    shiftedDate.getUTCFullYear(),
    shiftedDate.getUTCMonth(),
    shiftedDate.getUTCDate(),
    0,
    0,
    0,
    0
  );
  return startShiftedUtcMs + tzOffsetMinutes * 60_000;
}

function summarize(matches: Array<{ win: boolean }>) {
  const wins = matches.reduce((acc, m) => acc + (m.win ? 1 : 0), 0);
  const losses = matches.length - wins;
  const winrate =
    matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;
  return { total: matches.length, wins, losses, winrate };
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { session },
    } = await authClient.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const tzOffsetMinutesParam = url.searchParams.get("tzOffsetMinutes");
    const gapHoursParam = url.searchParams.get("gapHours");
    const maxMatchesParam = url.searchParams.get("maxMatches");
    const minGameDurationParam = url.searchParams.get("minGameDurationSeconds");
    const earlySurrenderMaxParam = url.searchParams.get(
      "earlySurrenderMaxSeconds"
    );
    const queueParam = url.searchParams.get("queue")?.toLowerCase();

    const tzOffsetMinutes = Number.isFinite(Number(tzOffsetMinutesParam))
      ? clampInt(Number(tzOffsetMinutesParam), -840, 840)
      : 0;

    const gapHours = Number.isFinite(Number(gapHoursParam))
      ? clampInt(Number(gapHoursParam), 1, 12)
      : DEFAULT_GAP_HOURS;

    const gapMs = gapHours * 60 * 60 * 1000;

    const maxMatches = Number.isFinite(Number(maxMatchesParam))
      ? clampInt(Number(maxMatchesParam), 20, 400)
      : DEFAULT_MAX_MATCHES;

    const minGameDurationSeconds = Number.isFinite(Number(minGameDurationParam))
      ? clampInt(Number(minGameDurationParam), 0, 36000)
      : DEFAULT_MIN_GAME_DURATION_SECONDS;

    const earlySurrenderMaxSeconds = Number.isFinite(
      Number(earlySurrenderMaxParam)
    )
      ? clampInt(Number(earlySurrenderMaxParam), 0, 36000)
      : DEFAULT_EARLY_SURRENDER_MAX_SECONDS;

    const queueIds = queueParam ? QUEUE_FILTERS[queueParam] : undefined;

    const supabase = getServiceClient();

    const { data: riotAccount, error: accountError } = await supabase
      .from("linked_accounts_riot")
      .select("puuid")
      .eq("user_id", session.user.id)
      .single();

    if (accountError || !riotAccount?.puuid) {
      return NextResponse.json(
        { error: "No hay cuenta de Riot vinculada" },
        { status: 404 }
      );
    }

    let query = supabase
      .from("match_participants")
      .select(
        "match_id, win, matches!inner(game_creation, game_duration, queue_id, full_json)"
      )
      .eq("puuid", riotAccount.puuid)
      .order("matches(game_creation)", { ascending: false })
      .limit(maxMatches);

    if (queueIds && queueIds.length > 0) {
      query = query.in("matches.queue_id", queueIds);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener partidas", details: error.message },
        { status: 500 }
      );
    }

    const rows = (data as unknown as ParticipantMatchRow[] | null) ?? [];

    const normalized = rows
      .map((row) => {
        const gameCreation = row.matches?.game_creation;
        const durationSeconds = row.matches?.game_duration;
        if (typeof gameCreation !== "number") {
          return null;
        }

        const earlySurrender = extractEarlySurrenderFlag(
          row.matches?.full_json
        );
        const isShortGame =
          typeof durationSeconds === "number" &&
          durationSeconds < minGameDurationSeconds;
        const isEarlySurrenderRemake =
          earlySurrender &&
          typeof durationSeconds === "number" &&
          durationSeconds < earlySurrenderMaxSeconds;

        if (isShortGame || isEarlySurrenderRemake) {
          return null;
        }

        return {
          matchId: row.match_id,
          win: Boolean(row.win),
          gameCreation,
          queueId: row.matches?.queue_id ?? null,
        };
      })
      .filter(
        (
          m
        ): m is {
          matchId: string;
          win: boolean;
          gameCreation: number;
          queueId: number | null;
        } => m !== null
      );

    const now = new Date();
    const todayStartMs = getStartOfDayUtcMsForOffset(now, tzOffsetMinutes);

    console.log("[session-stats] 🔍 DEBUG:");
    console.log("  now:", now.toISOString());
    console.log("  now.getTime():", now.getTime());
    console.log("  tzOffsetMinutes:", tzOffsetMinutes);
    console.log("  todayStartMs:", todayStartMs);
    console.log("  todayStart (ISO):", new Date(todayStartMs).toISOString());
    console.log("  Total normalized matches:", normalized.length);

    if (normalized.length > 0) {
      console.log("  Primera partida:");
      console.log("    matchId:", normalized[0].matchId);
      console.log("    gameCreation:", normalized[0].gameCreation);
      console.log(
        "    gameCreation (ISO):",
        new Date(normalized[0].gameCreation).toISOString()
      );
      console.log(
        "    ¿Es de hoy?",
        normalized[0].gameCreation >= todayStartMs
      );
    }

    const todayMatches = normalized.filter(
      (m) => m.gameCreation >= todayStartMs
    );

    console.log("  Partidas de hoy encontradas:", todayMatches.length);

    // Logging detallado de todas las partidas para debugging
    console.log("\n📊 [session-stats] ANÁLISIS DETALLADO DE PARTIDAS:");
    console.log("=".repeat(70));
    normalized.forEach((match, index) => {
      const isToday = match.gameCreation >= todayStartMs;
      const matchDate = new Date(match.gameCreation);
      const hoursSinceToday =
        (match.gameCreation - todayStartMs) / (1000 * 60 * 60);

      console.log(`\n  Partida #${index + 1}:`);
      console.log(`    Match ID: ${match.matchId}`);
      console.log(`    Resultado: ${match.win ? "✅ VICTORIA" : "❌ DERROTA"}`);
      console.log(`    Timestamp: ${match.gameCreation}`);
      console.log(`    Fecha/Hora: ${matchDate.toISOString()}`);
      console.log(
        `    Fecha Local: ${matchDate.toLocaleString("es-ES", {
          timeZone: "America/Bogota",
        })}`
      );
      console.log(
        `    Horas desde inicio del día: ${hoursSinceToday.toFixed(2)}h`
      );
      console.log(`    ¿Cuenta como HOY?: ${isToday ? "✅ SÍ" : "❌ NO"}`);
      console.log(`    Queue ID: ${match.queueId}`);
    });

    console.log("\n" + "=".repeat(70));
    console.log("📈 RESUMEN DE PARTIDAS DE HOY:");
    console.log(`  Total: ${todayMatches.length}`);
    console.log(`  Victorias: ${todayMatches.filter((m) => m.win).length}`);
    console.log(`  Derrotas: ${todayMatches.filter((m) => !m.win).length}`);
    console.log("=".repeat(70) + "\n");

    const sessionMatches: typeof normalized = [];
    if (normalized.length > 0) {
      sessionMatches.push(normalized[0]);
      for (let i = 1; i < normalized.length; i += 1) {
        const prev = normalized[i - 1];
        const current = normalized[i];
        const delta = prev.gameCreation - current.gameCreation;
        if (delta <= gapMs) {
          sessionMatches.push(current);
        } else {
          break;
        }
      }
    }

    const sessionSummary = summarize(sessionMatches);
    const todaySummary = summarize(todayMatches);

    const sessionWinStreak = computeWinStreak(sessionMatches);
    const sessionLossStreak = computeLossStreak(sessionMatches);

    const sessionStartMs =
      sessionMatches.length > 0
        ? sessionMatches[sessionMatches.length - 1].gameCreation
        : null;
    const sessionEndMs =
      sessionMatches.length > 0 ? sessionMatches[0].gameCreation : null;

    return NextResponse.json({
      success: true,
      gapHours,
      tzOffsetMinutes,
      queue: queueParam ?? "all",
      session: {
        ...sessionSummary,
        startMs: sessionStartMs,
        endMs: sessionEndMs,
        winStreak: sessionWinStreak,
        lossStreak: sessionLossStreak,
      },
      today: {
        ...todaySummary,
        startMs: todayStartMs,
        endMs: now.getTime(),
      },
      lastMatch:
        normalized.length > 0
          ? {
              matchId: normalized[0].matchId,
              gameCreation: normalized[0].gameCreation,
            }
          : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: message },
      { status: 500 }
    );
  }
}
