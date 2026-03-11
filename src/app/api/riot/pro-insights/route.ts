import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Obtener a quienes sigo
        const { data: follows, error: followsError } = await supabase
            .from("user_follows_pro")
            .select("pro_profile_id")
            .eq("user_id", user.id);

        if (followsError || !follows || follows.length === 0) {
            return NextResponse.json({ insights: [] });
        }

        const proIds = follows.map(f => f.pro_profile_id);

        const { data: pros, error: prosError } = await supabase
            .from("public_profiles")
            .select("id, puuid, display_name")
            .in("id", proIds);

        if (prosError || !pros || pros.length === 0) {
            return NextResponse.json({ insights: [] });
        }

        const puuids = pros.map(p => p.puuid).filter(Boolean);

        // Simulamos el radar en base a las partidas subidas de los pros. 
        // Normalmente necesitaríamos hacer JOIN con las estadisticas y encontrar trends.
        // Aquí generaremos datos dinámicos basados en sus partidas más recientes.
        const { data: recentMatches, error: matchesError } = await supabase
            .from("lol_match_history")
            .select("match_id, champion_name, kills, deaths, assists, win, puuid, created_at")
            .in("puuid", puuids)
            .order("created_at", { ascending: false })
            .limit(50);

        if (matchesError || !recentMatches || recentMatches.length === 0) {
            return NextResponse.json({ insights: [] });
        }

        const insights = [];

        // Insight 1: Campeón más exitoso reciente
        const championStats: Record<string, { wins: number, games: number, pros: Set<string> }> = {};
        
        recentMatches.forEach(match => {
            if (!championStats[match.champion_name]) {
                championStats[match.champion_name] = { wins: 0, games: 0, pros: new Set() };
            }
            championStats[match.champion_name].games++;
            if (match.win) championStats[match.champion_name].wins++;
            
            const proName = pros.find(p => p.puuid === match.puuid)?.display_name || "Desconocido";
            championStats[match.champion_name].pros.add(proName);
        });

        // Filtrar campeones con buen winrate y múltiples partidas
        const topChampions = Object.entries(championStats)
            .filter(([_, stats]) => stats.games >= 3 && (stats.wins / stats.games) >= 0.5)
            .sort((a, b) => b[1].wins - a[1].wins);

        if (topChampions.length > 0) {
            const [champ, stats] = topChampions[0];
            const proList = Array.from(stats.pros).slice(0, 2).join(" y ");
            insights.push({
                id: "insight-champ-1",
                type: "trend",
                title: `${champ} está dominando`,
                description: `${proList} han estado ganando consistente con este campeón. ¡Tienen ${stats.wins} victorias recientes entre ellos!`,
                champion: champ,
                date: new Date().toISOString()
            });
        }

        // Insight 2: Build recomendada (Simulado aquí por simplicidad)
        if (topChampions.length > 1) {
             const [champ2, stats2] = topChampions[1];
             const proName2 = Array.from(stats2.pros)[0];
             insights.push({
                 id: "insight-build-2",
                 type: "build",
                 title: `Nueva build de ${proName2}`,
                 description: `${proName2} está jugando mucho ${champ2}. ¿Has visto su KDA promedio reciente?`,
                 champion: champ2,
                 date: new Date().toISOString()
             });
        }

        // Insight 3: Novedad / Rendimiento brutal
        const bestPerformances = recentMatches.filter(m => m.kills >= 15);
        if (bestPerformances.length > 0) {
            const perf = bestPerformances[0];
            const proPerf = pros.find(p => p.puuid === perf.puuid)?.display_name || "Un Pro";
            insights.push({
                id: `insight-perf-${perf.match_id}`,
                type: "performance",
                title: `Actuación brutal de ${proPerf}`,
                description: `¡Acaba de terminar una partida con ${perf.kills} asesinatos usando ${perf.champion_name}!`,
                champion: perf.champion_name,
                matchId: perf.match_id,
                date: perf.created_at
            });
        }

        return NextResponse.json({ insights: insights });

    } catch (error: any) {
        console.error("Pro Insights error:", error);
        return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
    }
}
