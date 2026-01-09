export interface RiotParticipant {
  summonerName: string;
  riotIdGameName?: string;
  championName: string;
  teamId: number;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  [key: string]: any; // Permitir propiedades adicionales
}

export interface OrganizedParticipants {
  blueTeam: RiotParticipant[];
  redTeam: RiotParticipant[];
}

const ROLE_PRIORITY: Record<string, number> = {
  TOP: 0,
  JUNGLE: 1,
  MIDDLE: 2,
  BOTTOM: 3,
  UTILITY: 4,
};

/**
 * Organiza los participantes de una partida en equipos (Azul y Rojo)
 * y los ordena estrictamente por rol: TOP -> JUNGLE -> MID -> ADC -> SUPPORT.
 *
 * @param participants Array de participantes del endpoint match/v5
 * @returns Objeto con arrays blueTeam y redTeam ordenados
 */
export function organizeMatchParticipants(
  participants: RiotParticipant[]
): OrganizedParticipants {
  const blueTeam: RiotParticipant[] = [];
  const redTeam: RiotParticipant[] = [];

  // 1. Separar por equipos
  // Soportar tanto teamId (API Riot) como team_id (base de datos)
  for (const p of participants) {
    const teamIdValue = p.teamId ?? p.team_id;
    if (teamIdValue === 100) {
      blueTeam.push(p);
    } else if (teamIdValue === 200) {
      redTeam.push(p);
    }
  }

  // Función de ordenamiento
  const sortByRole = (a: RiotParticipant, b: RiotParticipant) => {
    const roleA = (a.teamPosition || "").toUpperCase();
    const roleB = (b.teamPosition || "").toUpperCase();

    // Si ambos tienen un rol válido definido en nuestra jerarquía
    const priorityA = ROLE_PRIORITY[roleA];
    const priorityB = ROLE_PRIORITY[roleB];

    if (priorityA !== undefined && priorityB !== undefined) {
      return priorityA - priorityB;
    }

    // Manejo de casos ARAM / Modos sin rol fijo / Roles desconocidos
    // Si uno tiene rol válido y el otro no, priorizar el válido (aunque raro en la misma partida)
    if (priorityA !== undefined) return -1;
    if (priorityB !== undefined) return 1;

    // Si ninguno tiene rol válido (ej. ARAM), mantener orden original (estable)
    return 0;
  };

  // 2. Ordenar cada equipo
  blueTeam.sort(sortByRole);
  redTeam.sort(sortByRole);

  return {
    blueTeam,
    redTeam,
  };
}
