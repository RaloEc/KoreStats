import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatchById, getMatchTimeline } from "@/lib/riot/matches";
import { MatchAnalysis } from "@/components/riot/analysis/MatchAnalysis";
import { MatchPageHeader } from "@/components/riot/MatchPageHeader";
import { ScoreboardTable } from "@/components/riot/ScoreboardTable";
import { getQueueName, formatGameVersion } from "@/lib/riot/helpers";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Helper to format duration
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Helper to determine skin deterministically
async function getDeterministicSkin(
  matchId: string,
  championName: string,
  supabase: any,
) {
  try {
    let name = championName;
    if (name === "FiddleSticks") name = "Fiddlesticks";
    if (name === "Wukong") name = "MonkeyKing";

    const { data } = await supabase
      .from("lol_champions")
      .select("skins")
      .eq("id", name)
      .single();

    if (!data || !data.skins || !Array.isArray(data.skins)) return 0;

    const skins = data.skins
      .map((s: any) => s.num)
      .filter((n: any) => typeof n === "number");

    if (skins.length === 0) return 0;

    const hash = crypto.createHash("md5").update(matchId).digest("hex");
    const hashNum = parseInt(hash.substring(0, 8), 16);
    return skins[hashNum % skins.length];
  } catch (e) {
    console.error("Error getting deterministic skin", e);
    return 0;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { matchId: string };
}): Promise<Metadata> {
  const matchId = params.matchId;
  const data = await getMatchById(matchId);

  if (!data) {
    return { title: "Partida no encontrada | KoreStats" };
  }

  const { match } = data;
  const mode = match.game_mode || "Partida";

  return {
    title: `${mode} - ${formatDuration(match.game_duration)} | KoreStats`,
    description: `Detalles de la partida ${matchId} en KoreStats`,
  };
}

export default async function MatchPage({
  params,
}: {
  params: { matchId: string };
}) {
  const { matchId } = params;
  const region = matchId.split("_")[0].toLowerCase();

  // Parallel fetch
  const [matchData, timeline] = await Promise.all([
    getMatchById(matchId),
    getMatchTimeline(matchId, region, process.env.RIOT_API_KEY!),
  ]);

  if (!matchData) {
    notFound();
  }

  const { match, participants } = matchData;
  const rawVersion = match.full_json?.info?.gameVersion || match.game_version;
  const gameVersion = formatGameVersion(rawVersion);
  const mapParticipants = match.full_json?.info?.participants || [];

  // Get current user session to find linked account
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.debug("[MatchPage] Session obtenida:", {
    userId: session?.user?.id,
    email: session?.user?.email,
  });

  let currentUserPuuid = undefined;
  let currentUserGameName = undefined;
  let currentUserTagLine = undefined;
  let userProfileColor: string | null = null;

  if (session?.user) {
    // Obtener cuenta Riot y color del perfil
    const [riotResult, profileResult] = await Promise.all([
      supabase
        .from("linked_accounts_riot")
        .select("puuid, game_name, tag_line")
        .eq("user_id", session.user.id)
        .single(),
      supabase
        .from("perfiles")
        .select("color")
        .eq("id", session.user.id)
        .single(),
    ]);

    const { data: riotAccount, error: accountError } = riotResult;
    const { data: profileData } = profileResult;

    console.debug("[MatchPage] Búsqueda de cuenta Riot:", {
      userId: session.user.id,
      encontrada: !!riotAccount,
      error: accountError?.message,
      riotAccount: riotAccount
        ? {
            puuid: riotAccount.puuid,
            game_name: riotAccount.game_name,
            tag_line: riotAccount.tag_line,
          }
        : null,
    });

    if (riotAccount) {
      currentUserPuuid = riotAccount.puuid;
      currentUserGameName = riotAccount.game_name;
      currentUserTagLine = riotAccount.tag_line;
    }

    if (profileData?.color) {
      userProfileColor = profileData.color;
    }
  }

  const normalize = (value?: string) => (value ?? "").trim().toLowerCase();
  const normalizedUserGameName = normalize(currentUserGameName);
  const normalizedUserTag = normalize(currentUserTagLine);

  const focusParticipant =
    mapParticipants.find((p: any) => {
      if (currentUserPuuid && p.puuid === currentUserPuuid) {
        return true;
      }

      if (!normalizedUserGameName || !normalizedUserTag) {
        return false;
      }

      const participantGameName = normalize(
        p.riotIdGameName || p.gameName || p.summonerName,
      );
      const participantTag = normalize(p.riotIdTagline || p.tagLine);

      return (
        participantGameName === normalizedUserGameName &&
        participantTag === normalizedUserTag
      );
    }) ||
    mapParticipants.sort((a: any, b: any) => {
      const kdaA = (a.kills + a.assists) / Math.max(1, a.deaths);
      const kdaB = (b.kills + b.assists) / Math.max(1, b.deaths);
      return kdaB - kdaA;
    })[0];
  const focusTeamId =
    focusParticipant?.teamId || mapParticipants[0]?.teamId || 100;
  const highlightParticipantId = focusParticipant?.participantId;

  console.debug("[MatchPage] Jugador enfocado", {
    currentUserPuuid,
    currentUserGameName,
    currentUserTagLine,
    focusParticipantId: focusParticipant?.participantId,
    focusTeamId,
  });

  const team1 = participants.filter((p: any) => p.win);
  const team2 = participants.filter((p: any) => !p.win);

  const team1Kills = team1.reduce((acc: number, p: any) => acc + p.kills, 0);
  const team2Kills = team2.reduce((acc: number, p: any) => acc + p.kills, 0);
  const team1Gold = team1.reduce(
    (acc: number, p: any) => acc + p.gold_earned,
    0,
  );
  const team2Gold = team2.reduce(
    (acc: number, p: any) => acc + p.gold_earned,
    0,
  );

  const skinId = focusParticipant
    ? await getDeterministicSkin(
        matchId,
        focusParticipant.championName,
        supabase,
      )
    : 0;

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl pb-20">
      {/* Header */}
      <MatchPageHeader
        match={match}
        focusParticipant={focusParticipant}
        userProfileColor={userProfileColor}
        skinId={skinId}
        queueName={getQueueName(match.queue_id)}
        gameVersion={gameVersion}
      />

      <section className="space-y-4">
        <ScoreboardTable
          participants={participants}
          currentUserPuuid={currentUserPuuid}
          gameVersion={gameVersion}
          gameDuration={match.game_duration}
          matchInfo={match}
        />
      </section>

      <div className="pt-8 border-t border-white/5">
        <MatchAnalysis
          match={match}
          timeline={timeline}
          currentUserPuuid={currentUserPuuid}
        />
      </div>
    </div>
  );
}
