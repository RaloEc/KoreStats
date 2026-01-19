"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  LinkIcon,
  AlertCircle,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

interface ManualRiotLinkFormProps {
  onSuccess?: () => void | Promise<void>;
}

interface SearchResult {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
  tier: string | null;
  rank: string | null;
  leaguePoints: number;
  wins: number;
  losses: number;
}

const REGIONS = [
  { value: "la1", label: "LAN (Latinoamérica Norte)" },
  { value: "la2", label: "LAS (Latinoamérica Sur)" },
  { value: "na1", label: "NA (Norteamérica)" },
  { value: "br1", label: "BR (Brasil)" },
  { value: "euw1", label: "EUW (Europa Oeste)" },
  { value: "eun1", label: "EUNE (Europa Este)" },
  { value: "kr", label: "KR (Corea)" },
  { value: "jp1", label: "JP (Japón)" },
];

const ROUTING_REGIONS: Record<string, string> = {
  la1: "americas",
  la2: "americas",
  na1: "americas",
  br1: "americas",
  euw1: "europe",
  eun1: "europe",
  kr: "asia",
  jp1: "asia",
};

export function ManualRiotLinkForm({ onSuccess }: ManualRiotLinkFormProps) {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("la1");
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const routingRegion = ROUTING_REGIONS[region] || "americas";

  const handleSearch = async () => {
    if (!gameName.trim() || !tagLine.trim()) {
      setError("Ingresa el nombre y tag de la cuenta");
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResult(null);

    try {
      const response = await fetch(
        `/api/riot/account/search?gameName=${encodeURIComponent(
          gameName,
        )}&tagLine=${encodeURIComponent(
          tagLine,
        )}&region=${routingRegion}&platformRegion=${region}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al buscar la cuenta");
        return;
      }

      setSearchResult(data);
    } catch (err) {
      console.error("[ManualRiotLinkForm] Error en búsqueda:", err);
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async () => {
    if (!searchResult) return;

    setIsLinking(true);
    setError(null);

    try {
      const response = await fetch("/api/riot/account/link-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          puuid: searchResult.puuid,
          gameName: searchResult.gameName,
          tagLine: searchResult.tagLine,
          region,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al vincular la cuenta");
        return;
      }

      toast.success("¡Cuenta vinculada exitosamente!");

      // Resetear formulario
      setGameName("");
      setTagLine("");
      setRegion("la1");
      setSearchResult(null);
      setError(null);

      // Llamar al callback para invalidar caché y refetch
      if (onSuccess) {
        await onSuccess();
      }
    } catch (err) {
      console.error("[ManualRiotLinkForm] Error al vincular:", err);
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLinking(false);
    }
  };

  const getProfileIconUrl = (iconId: number) => {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <Trophy size={48} className="text-amber-500 dark:text-amber-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white amoled:text-white mb-2">
          Vincula tu cuenta de Riot
        </h3>
        <p className="text-gray-600 dark:text-gray-400 amoled:text-gray-400 text-center max-w-md mb-6">
          Busca tu cuenta de League of Legends por nombre, tag y región para
          vincularla a tu perfil.
        </p>
      </div>

      {/* Formulario */}
      <div className="bg-white dark:bg-black amoled:bg-black rounded-xl border-2 border-gray-200 dark:border-gray-800 amoled:border-gray-800 p-6 space-y-4">
        {/* Inputs de búsqueda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="gameName"
              className="text-gray-900 dark:text-gray-100 amoled:text-gray-100"
            >
              Nombre de Invocador
            </Label>
            <Input
              id="gameName"
              placeholder="Ej: Faker"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={isSearching || isLinking}
              className="bg-gray-50 dark:bg-gray-900 amoled:bg-gray-900 border-gray-300 dark:border-gray-700 amoled:border-gray-700 text-gray-900 dark:text-white amoled:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="tagLine"
              className="text-gray-900 dark:text-gray-100 amoled:text-gray-100"
            >
              Tag
            </Label>
            <Input
              id="tagLine"
              placeholder="Ej: LAN"
              value={tagLine}
              onChange={(e) => setTagLine(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={isSearching || isLinking}
              className="bg-gray-50 dark:bg-gray-900 amoled:bg-gray-900 border-gray-300 dark:border-gray-700 amoled:border-gray-700 text-gray-900 dark:text-white amoled:text-white"
            />
          </div>
        </div>

        {/* Selector de región */}
        <div className="space-y-2">
          <Label className="text-gray-900 dark:text-gray-100 amoled:text-gray-100">
            Región
          </Label>
          <Select
            value={region}
            onValueChange={setRegion}
            disabled={isSearching || isLinking}
          >
            <SelectTrigger className="bg-gray-50 dark:bg-gray-900 amoled:bg-gray-900 border-gray-300 dark:border-gray-700 amoled:border-gray-700 text-gray-900 dark:text-white amoled:text-white">
              <SelectValue placeholder="Selecciona región" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 amoled:bg-black border-gray-200 dark:border-gray-700 amoled:border-gray-800">
              {REGIONS.map((r) => (
                <SelectItem
                  key={r.value}
                  value={r.value}
                  className="text-gray-900 dark:text-gray-100 amoled:text-gray-100 focus:bg-gray-100 dark:focus:bg-gray-800 amoled:focus:bg-gray-800"
                >
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botón de búsqueda */}
        <Button
          onClick={handleSearch}
          disabled={
            isSearching || isLinking || !gameName.trim() || !tagLine.trim()
          }
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          variant="default"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Buscar Cuenta
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 amoled:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Resultado de búsqueda */}
        {searchResult && (
          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-500/30 dark:border-blue-500/40 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500/30 dark:border-blue-500/50">
                <img
                  src={getProfileIconUrl(searchResult.profileIconId)}
                  alt="Ícono de perfil"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getProfileIconUrl(29);
                  }}
                />
                {/* Badge de nivel */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-black amoled:bg-black border border-blue-500/50 rounded px-1.5 py-0.5 text-xs font-bold text-white">
                  {searchResult.summonerLevel}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white amoled:text-white text-lg">
                  {searchResult.gameName}
                  <span className="text-gray-600 dark:text-gray-400 amoled:text-gray-400">
                    #{searchResult.tagLine}
                  </span>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 amoled:text-gray-400">
                  {REGIONS.find((r) => r.value === region)?.label}
                </p>
                {/* Mostrar rango si existe */}
                {searchResult.tier && searchResult.rank ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-500 amoled:text-amber-500">
                      {searchResult.tier} {searchResult.rank}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 amoled:text-gray-400">
                      {searchResult.leaguePoints} LP
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 amoled:text-gray-500">
                      ({searchResult.wins}W {searchResult.losses}L)
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-500 amoled:text-gray-500 mt-1">
                    Sin rango
                  </p>
                )}
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 amoled:text-green-500 flex-shrink-0" />
            </div>

            <Button
              onClick={handleLink}
              disabled={isLinking}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Vincular esta Cuenta
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
