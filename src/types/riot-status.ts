/**
 * Tipos para la API de estado del servidor de Riot Games
 * Endpoint: /lol/status/v4/platform-data
 */

export interface RiotLocaleContent {
  locale: string;
  content: string;
}

export interface RiotStatusUpdate {
  id: number;
  created_at: string;
  updated_at: string;
  publish: boolean;
  author: string;
  translations: RiotLocaleContent[];
  publish_locations: string[];
}

export interface RiotIncident {
  id: number;
  created_at: string;
  updated_at: string;
  archive_at: string | null;
  titles: RiotLocaleContent[];
  updates: RiotStatusUpdate[];
  platforms: string[];
  maintenance_status: string | null;
  incident_severity: "critical" | "warning" | "info";
}

export interface RiotMaintenance {
  id: number;
  created_at: string;
  updated_at: string;
  archive_at: string | null;
  titles: RiotLocaleContent[];
  updates: RiotStatusUpdate[];
  platforms: string[];
  maintenance_status: "scheduled" | "in_progress" | "complete";
  incident_severity: null;
}

export interface RiotPlatformStatus {
  id: string;
  name: string;
  locales: string[];
  maintenances: RiotMaintenance[];
  incidents: RiotIncident[];
}

// Tipo simplificado para uso en componentes
export interface ServerStatusItem {
  id: number;
  type: "incident" | "maintenance";
  severity: "critical" | "warning" | "info" | "maintenance";
  title: string;
  description: string;
  platforms: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServerStatusResponse {
  region: string;
  regionName: string;
  hasIssues: boolean;
  incidents: ServerStatusItem[];
  maintenances: ServerStatusItem[];
  lastUpdated: string;
}
