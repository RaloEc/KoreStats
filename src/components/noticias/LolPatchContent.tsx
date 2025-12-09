"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Sparkles } from "lucide-react";

// --- Interfaces ---

interface StatChange {
  stat: string;
  old: number;
  new: number;
  type: "buff" | "nerf" | "adjustment";
}

interface SpellAttributeChange {
  attribute: "cooldown" | "cost" | "range" | "description" | "damage";
  old: string;
  new: string;
  type?: "buff" | "nerf" | "adjustment";
}

interface SpellChange {
  name: string;
  image: string;
  key: string;
  changes: SpellAttributeChange[];
}

interface PassiveChange {
  name: string;
  image: string;
  descriptionChange: { old: string; new: string };
  type: "adjustment";
}

interface ChampionChange {
  id: string;
  name: string;
  image: string;
  stats: StatChange[];
  spells: SpellChange[];
  passive?: PassiveChange;
  developerContext?: {
    summary?: string;
    context?: string;
    changes?: string[];
  };
}

interface ItemChange {
  id: string;
  name: string;
  image: string;
  statChanges: StatChange[];
  goldChange?: { old: number; new: number };
  descriptionChange?: { old: string; new: string };
  type: "buff" | "nerf" | "adjustment";
  developerContext?: {
    summary?: string;
    context?: string;
    changes?: string[];
  };
}

interface RuneChange {
  id: number;
  name: string;
  icon: string;
  descriptionChange?: { old: string; new: string };
}

interface SummonerChange {
  id: string;
  name: string;
  image: string;
  descriptionChange?: { old: string; new: string };
  cooldownChange?: { old: string; new: string };
}

interface PatchData {
  version: string;
  champions: ChampionChange[];
  items: ItemChange[];
  runes: RuneChange[];
  summoners: SummonerChange[];
}

interface LolPatchContentProps {
  data: PatchData;
}

// --- Helpers ---

const getStatLabel = (stat: string) => {
  const statMap: Record<string, string> = {
    hp: "Vida",
    hpperlevel: "Vida/Nv",
    mp: "Maná",
    mpperlevel: "Maná/Nv",
    movespeed: "Vel. Mov.",
    armor: "Armadura",
    armorperlevel: "Arm/Nv",
    spellblock: "RM",
    spellblockperlevel: "RM/Nv",
    attackrange: "Rango",
    hpregen: "Reg. Vida",
    hpregenperlevel: "RV/Nv",
    mpregen: "Reg. Maná",
    mpregenperlevel: "RM/Nv",
    crit: "Crit",
    critperlevel: "Crit/Nv",
    attackdamage: "AD",
    attackdamageperlevel: "AD/Nv",
    attackspeedperlevel: "AS/Nv",
    attackspeed: "AS",
  };
  return statMap[stat] || stat;
};

const getAttributeLabel = (attr: string) => {
  const map: Record<string, string> = {
    cooldown: "Enfriamiento",
    cost: "Costo",
    range: "Rango",
    description: "Descripción",
    damage: "Daño",
    healing: "Curación",
    shield: "Escudo",
    speed: "Velocidad",
    duration: "Duración",
    bugfix: "Corrección de error",
  };
  // Si no está en el mapa, devolver el texto tal cual (ya viene limpio del parser)
  return map[attr] || attr;
};

const cleanSpellName = (spellName: string, championName: string) => {
  // Eliminar el nombre del campeón del nombre de la habilidad
  // Por ejemplo: "Sejuani Q" -> "Q" o "Arctic Assault" -> "Arctic Assault"
  return spellName.replace(new RegExp(`^${championName}\\s*`, "i"), "").trim();
};

export default function LolPatchContent({ data }: LolPatchContentProps) {
  if (!data) return null;

  const { champions = [], items = [], runes = [], summoners = [] } = data;

  if (
    champions.length === 0 &&
    items.length === 0 &&
    runes.length === 0 &&
    summoners.length === 0
  ) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No se encontraron cambios relevantes en este parche.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          Notas del Parche {data.version}
        </h2>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {data.version}
        </Badge>
      </div>

      <Tabs defaultValue="champions" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="champions" disabled={champions.length === 0}>
            Campeones ({champions.length})
          </TabsTrigger>
          <TabsTrigger value="items" disabled={items.length === 0}>
            Objetos ({items.length})
          </TabsTrigger>
          <TabsTrigger value="runes" disabled={runes.length === 0}>
            Runas ({runes.length})
          </TabsTrigger>
          <TabsTrigger value="summoners" disabled={summoners.length === 0}>
            Hechizos ({summoners.length})
          </TabsTrigger>
        </TabsList>

        {/* --- CHAMPIONS TAB --- */}
        <TabsContent value="champions" className="space-y-6">
          {champions.map((champ) => (
            <div
              key={champ.id}
              className="border border-border rounded-lg p-4 bg-card"
            >
              {/* Champion Header */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/champion/${champ.image}`}
                  alt={champ.name}
                  className="w-12 h-12 rounded-full border-2 border-border shrink-0 object-cover"
                />
                <h3 className="text-xl font-bold">{champ.name}</h3>
              </div>

              {/* Developer Context */}
              {champ.developerContext && (
                <div className="mb-4 space-y-2">
                  {champ.developerContext.summary && (
                    <p className="text-sm font-medium border-l-2 border-primary pl-3 py-1">
                      {champ.developerContext.summary}
                    </p>
                  )}
                  {champ.developerContext.context && (
                    <blockquote className="text-sm text-muted-foreground italic bg-muted/20 p-3 rounded">
                      "{champ.developerContext.context}"
                    </blockquote>
                  )}
                  {/* Official Changes List */}
                  {champ.developerContext.changes &&
                    champ.developerContext.changes.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
                          Cambios Oficiales
                        </h4>
                        <ul className="space-y-1 bg-muted/20 p-3 rounded text-sm">
                          {champ.developerContext.changes.map((change, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="select-none text-primary">
                                •
                              </span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {/* Passive */}
              {champ.passive && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
                    Pasiva
                  </h4>
                  <div className="flex items-center gap-3 p-2 bg-muted/20 rounded">
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/passive/${champ.passive.image}`}
                      alt={champ.passive.name}
                      className="w-10 h-10 shrink-0 rounded border border-border object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {champ.passive.name}
                      </p>
                      {champ.passive.descriptionChange?.old === "" ? (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                          {champ.passive.descriptionChange.new}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Descripción actualizada
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Abilities */}
              {(champ.spells || []).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
                    Habilidades
                  </h4>
                  <div className="space-y-2">
                    {(champ.spells || []).map((spell, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 p-2 bg-muted/20 rounded"
                      >
                        {/* Spell Header */}
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/spell/${spell.image}`}
                            alt={spell.key}
                            className="w-10 h-10 shrink-0 rounded border border-border object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-base">
                              {spell.key} -{" "}
                              {cleanSpellName(spell.name, champ.name)}
                            </p>
                          </div>
                        </div>

                        {/* Changes List */}
                        <div className="pl-13 space-y-1">
                          {(spell.changes || []).map((change, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 h-5 shrink-0"
                              >
                                {getAttributeLabel(change.attribute)}
                              </Badge>

                              {change.attribute === "description" ||
                              change.attribute === "bugfix" ? (
                                <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">
                                  {change.new}
                                </p>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-xs">
                                    {change.old}
                                  </span>
                                  <ArrowRight className="w-3 h-3 shrink-0" />
                                  <span className="font-bold text-primary text-xs">
                                    {change.new}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Base Stats */}
              {(champ.stats || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
                    Estadísticas Base
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(champ.stats || []).map((stat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded"
                      >
                        <span className="text-xs">
                          {getStatLabel(stat.stat)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">
                            {stat.old}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span
                            className={`font-bold text-xs ${
                              stat.type === "buff"
                                ? "text-green-500"
                                : stat.type === "nerf"
                                ? "text-red-500"
                                : "text-orange-500"
                            }`}
                          >
                            {stat.new}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        {/* --- ITEMS TAB --- */}
        <TabsContent value="items" className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-border rounded-lg p-4 bg-card"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/item/${item.image}`}
                  alt={item.name}
                  className="w-10 h-10 rounded border border-border bg-black shrink-0 object-cover"
                />
                <h3 className="text-lg font-bold">{item.name}</h3>
              </div>

              {item.goldChange && (
                <div className="flex justify-between items-center text-sm p-2 mb-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    Oro
                  </span>
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <span>{item.goldChange.old}g</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-bold">{item.goldChange.new}g</span>
                  </div>
                </div>
              )}

              {(item.statChanges || []).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {(item.statChanges || []).map((stat, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm p-2 bg-muted/20 rounded"
                    >
                      <span className="text-xs">{getStatLabel(stat.stat)}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-xs">
                          {stat.old}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                        <span
                          className={`font-bold text-xs ${
                            stat.type === "buff"
                              ? "text-green-500"
                              : stat.type === "nerf"
                              ? "text-red-500"
                              : "text-orange-500"
                          }`}
                        >
                          {stat.new}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        {/* --- RUNES TAB --- */}
        <TabsContent value="runes" className="space-y-3">
          {runes.map((rune) => (
            <div
              key={rune.id}
              className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card"
            >
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                alt={rune.name}
                className="w-10 h-10 filter brightness-110"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm">{rune.name}</p>
                <p className="text-xs text-muted-foreground">
                  {rune.descriptionChange
                    ? "Descripción actualizada"
                    : "Cambios menores"}
                </p>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* --- SUMMONERS TAB (if needed) */}
        <TabsContent value="summoners" className="space-y-4">
          {summoners.map((sum) => (
            <div
              key={sum.id}
              className="flex items-center gap-3 p-2 bg-muted/20 rounded border border-border"
            >
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/spell/${sum.image}`}
                alt={sum.name}
                className="w-10 h-10 rounded border border-border bg-black"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm">{sum.name}</p>
                {sum.cooldownChange && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{sum.cooldownChange.old}s</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-bold text-primary">
                      {sum.cooldownChange.new}s
                    </span>
                  </div>
                )}
                {sum.descriptionChange && (
                  <p className="text-xs text-muted-foreground italic">
                    Descripción actualizada
                  </p>
                )}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
