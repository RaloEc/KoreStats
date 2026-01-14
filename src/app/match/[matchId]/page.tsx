import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, Eye } from "lucide-react";
import { getMatchById, getMatchTimeline } from "@/lib/riot/matches";
import { MatchMapAnalysis } from "@/components/riot/MatchDeathMap";
import { MatchAnalysis } from "@/components/riot/analysis/MatchAnalysis";
import { ScoreboardTable } from "@/components/riot/ScoreboardTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getChampionImg,
  getItemImg,
  formatGameVersion,
  getQueueName,
} from "@/lib/riot/helpers";
import { createClient } from "@/lib/supabase/server";
import { MatchShareButton } from "@/components/riot/MatchShareButton";
import crypto from "crypto";

// Helper to format duration
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Helper to format time ago
function formatTimeAgo(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `Hace ${days} ${days === 1 ? "día" : "días"}`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  return "Hace poco";
}

// Helper to determine skin deterministically
async function getDeterministicSkin(
  matchId: string,
  championName: string,
  supabase: any
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
  const gameVersion = match.full_json?.info?.gameVersion || match.game_version;
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

  const focusParticipant = mapParticipants.find((p: any) => {
    if (currentUserPuuid && p.puuid === currentUserPuuid) {
      return true;
    }

    if (!normalizedUserGameName || !normalizedUserTag) {
      return false;
    }

    const participantGameName = normalize(
      p.riotIdGameName || p.gameName || p.summonerName
    );
    const participantTag = normalize(p.riotIdTagline || p.tagLine);

    return (
      participantGameName === normalizedUserGameName &&
      participantTag === normalizedUserTag
    );
  });
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
    0
  );
  const team2Gold = team2.reduce(
    (acc: number, p: any) => acc + p.gold_earned,
    0
  );

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/perfil?tab=lol">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>

          <div className="space-y-2">
            {/* Queue Type */}
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {getQueueName(match.queue_id)}
            </h1>

            {/* Match Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatTimeAgo(match.game_creation)}</span>
              </div>

              <span className="text-slate-300 dark:text-slate-700">•</span>

              <div className="flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{formatDuration(match.game_duration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save PNG Button */}
        {focusParticipant && (
          <MatchShareButton
            match={{
              ...match,
              skinId: await getDeterministicSkin(
                matchId,
                focusParticipant.championName,
                supabase
              ),
            }}
            focusParticipant={focusParticipant}
            gameVersion={gameVersion}
            userColor={userProfileColor}
          />
        )}
      </div>

      <Tabs defaultValue="scoreboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 p-1 h-auto">
          <TabsTrigger
            value="scoreboard"
            className="py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400"
          >
            Scoreboard
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400"
          >
            Análisis
          </TabsTrigger>
        </TabsList>

        {/* Scoreboard Tab */}
        <TabsContent value="scoreboard" className="mt-6">
          <ScoreboardTable
            participants={participants}
            currentUserPuuid={currentUserPuuid}
            gameVersion={gameVersion}
            gameDuration={match.game_duration}
            matchInfo={match}
          />
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="mt-6">
          <MatchAnalysis
            match={match}
            timeline={timeline}
            currentUserPuuid={currentUserPuuid}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
