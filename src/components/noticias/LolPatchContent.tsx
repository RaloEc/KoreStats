"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Shield,
  Users,
  LayoutDashboard,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Interfaces ---

interface StatChange {
  stat: string;
  old: number;
  new: number;
  type: "buff" | "nerf" | "adjustment";
}

interface SpellAttributeChange {
  attribute:
    | "cooldown"
    | "cost"
    | "range"
    | "description"
    | "damage"
    | "bugfix";
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
    section?: string;
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
  displayVersion?: string;
  summary?: string;
  champions: ChampionChange[];
  items: ItemChange[];
  runes: RuneChange[];
  summoners: SummonerChange[];
  systemChanges?: Array<{
    name: string;
    details: string;
    type: "buff" | "nerf" | "adjustment";
  }>;
}

interface LolPatchContentProps {
  data: PatchData;
}

// --- Helpers ---

const getStatLabel = (stat: string) => {
  const statMap: Record<string, string> = {
    // Estadísticas base de campeones
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

    // Estadísticas de objetos (DDragon names)
    FlatHPPoolMod: "Vida",
    FlatMPPoolMod: "Maná",
    FlatPhysicalDamageMod: "DA Físico",
    FlatMagicDamageMod: "DA Mágico",
    FlatArmorMod: "Armadura",
    FlatSpellBlockMod: "RM",
    FlatHPRegenMod: "Reg. Vida",
    FlatMPRegenMod: "Reg. Maná",
    FlatCritChanceMod: "% Crítico",
    FlatCritDamageMod: "Daño Crítico",
    FlatAttackSpeedMod: "Vel. Ataque",
    PercentMovementSpeedMod: "% Vel. Mov.",
    PercentAttackSpeedMod: "% Vel. Ataque",
    PercentLifeStealMod: "% Robo de Vida",
    PercentSpellVampMod: "% Vampirismo Mágico",
    PercentArmorMod: "% Armadura",
    PercentSpellBlockMod: "% RM",
    PercentHPPoolMod: "% Vida",
    PercentMPPoolMod: "% Maná",
    PercentHPRegenMod: "% Reg. Vida",
    PercentMPRegenMod: "% Reg. Maná",
    PercentPhysicalDamageMod: "% DA Físico",
    PercentMagicDamageMod: "% DA Mágico",
    PercentCritChanceMod: "% Crítico",
    PercentCritDamageMod: "% Daño Crítico",
    PercentArmorPenetration: "% Pen. Armadura",
    PercentMagicPenetration: "% Pen. RM",
    FlatMagicPenetration: "Pen. RM Plana",
    FlatArmorPenetration: "Pen. Armadura Plana",
    PercentCooldownReduction: "% Red. Enfriamiento",
    PercentEXPBonus: "% EXP Bono",
    PercentHealPower: "% Poder de Curación",
    PercentHealShieldPower: "% Poder de Curación/Escudo",
    PercentTenacity: "% Tenacidad",
    PercentSlowResistance: "% Resistencia a Ralentización",
    PercentHealOnHit: "% Curación al Golpear",
    PercentManaRestoreOnHit: "% Maná al Golpear",
    PercentOmnivamp: "% Omnivamp",
    PercentAbilityHaste: "% Celeridad de Habilidad",
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
  return map[attr] || attr;
};

const cleanSpellName = (spellName: string, championName: string) => {
  return spellName.replace(new RegExp(`^${championName}\\s*`, "i"), "").trim();
};

const parseChangeLine = (
  line: string,
): { label: string | null; content: string } => {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1 || colonIndex === line.length - 1) {
    return { label: null, content: line };
  }

  const label = line.substring(0, colonIndex).trim();
  const content = line.substring(colonIndex + 1).trim();

  if (label.includes("\n")) return { label: null, content: line };

  return { label, content };
};

// --- Componentes Visuales ---

const ChangeTypeIcon = ({ type }: { type: "buff" | "nerf" | "adjustment" }) => {
  if (type === "buff") {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  }
  if (type === "nerf") {
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  }
  return <Minus className="w-4 h-4 text-orange-500" />;
};

const ChampionCard = ({
  champ,
  version,
  forceExpanded = false,
}: {
  champ: ChampionChange;
  version: string;
  forceExpanded?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(forceExpanded);

  // Efecto para expandir automáticamente si se solicita externamente
  React.useEffect(() => {
    if (forceExpanded) setIsExpanded(true);
  }, [forceExpanded]);

  // Determinar tipo general de cambios
  const hasBuffs =
    champ.stats.some((s) => s.type === "buff") ||
    champ.spells.some((sp) => sp.changes.some((c) => c.type === "buff"));
  const hasNerfs =
    champ.stats.some((s) => s.type === "nerf") ||
    champ.spells.some((sp) => sp.changes.some((c) => c.type === "nerf"));

  let cardBorderColor = "border-border";
  if (hasBuffs && !hasNerfs) cardBorderColor = "border-green-500/30";
  else if (hasNerfs && !hasBuffs) cardBorderColor = "border-red-500/30";
  else if (hasBuffs && hasNerfs) cardBorderColor = "border-orange-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group relative overflow-hidden rounded-xl border-2 ${cardBorderColor} bg-gradient-to-br from-card via-card to-card/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300`}
    >
      {/* Background Splash Art */}
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ.id}_0.jpg`}
          alt={champ.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.image}`}
              alt={champ.name}
              className="w-16 h-16 rounded-full border-4 border-primary/20 shadow-lg object-cover group-hover:scale-110 transition-transform duration-300"
            />
            {/* Indicador de tipo de cambio */}
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border-2 border-background">
              {hasBuffs && !hasNerfs && (
                <TrendingUp className="w-4 h-4 text-green-500" />
              )}
              {hasNerfs && !hasBuffs && (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              {hasBuffs && hasNerfs && (
                <Minus className="w-4 h-4 text-orange-500" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {champ.name}
            </h3>
            <div className="flex gap-2 mt-1">
              {champ.stats.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {champ.stats.length} stats
                </Badge>
              )}
              {champ.spells.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {champ.spells.length} habilidades
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Developer Context */}
        {champ.developerContext && (
          <div className="space-y-3">
            {champ.developerContext.summary && (
              <div className="relative pl-4 py-2 border-l-4 border-primary/50 bg-primary/5 rounded-r">
                <p className="text-sm font-medium text-foreground/90">
                  {champ.developerContext.summary}
                </p>
              </div>
            )}
            {champ.developerContext.context && (
              <blockquote className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-lg border-l-4 border-muted-foreground/20">
                "{champ.developerContext.context}"
              </blockquote>
            )}
          </div>
        )}

        {/* Botón Expandir/Colapsar */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
        >
          <span className="text-sm font-semibold">
            {isExpanded
              ? "Ocultar cambios detallados"
              : "Ver cambios detallados"}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Cambios Detallados */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Official Changes List */}
              {champ.developerContext?.changes &&
                champ.developerContext.changes.length > 0 && (
                  <div>
                    <ul className="space-y-3 bg-muted/20 p-4 rounded-lg">
                      {champ.developerContext.changes.map((change, idx) => {
                        // Detectar si es un encabezado/subtítulo (ej: **Severum**)
                        const headerMatch = change.match(/^\*\*(.*)\*\*$/);
                        if (headerMatch) {
                          const weaponName = headerMatch[1].trim();

                          // Mapeo de iconos para Aphelios usando Community Dragon (Direct Assets)
                          // Estos son los iconos de la habilidad Q activa por arma, que es la mejor representación visual.
                          const cdragonUrl =
                            "https://raw.communitydragon.org/latest/game/assets/characters/aphelios/hud/icons2d";
                          const weaponIcons: Record<string, string> = {
                            Calibrum: "q_calibrum.png",
                            Severum: "q_severum.png",
                            Gravitum: "q_gravitum.png",
                            Infernum: "q_infernum.png",
                            Crescendum: "q_crescendum.png",
                            "Vigilia de Luz Lunar": "apheliosr.png",
                          };

                          const iconFile = weaponIcons[weaponName];
                          const iconUrl = iconFile
                            ? `${cdragonUrl}/${iconFile}`
                            : null;

                          return (
                            <li
                              key={idx}
                              className="mt-4 first:mt-0 mb-2 list-none"
                            >
                              {iconUrl ? (
                                // Estilo para Armas (Aphelios) con Icono
                                <div className="flex items-center gap-3 p-2 bg-primary/5 rounded-lg border-l-4 border-primary">
                                  <img
                                    src={iconUrl}
                                    alt={weaponName}
                                    className="w-10 h-10 rounded shadow-md border border-primary/20"
                                  />
                                  <h4 className="text-lg font-bold text-primary">
                                    {weaponName}
                                  </h4>
                                </div>
                              ) : (
                                // Estilo para Títulos de Sección Genéricos (Ej: Estadísticas básicas)
                                <h4 className="text-sm font-black uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1 mb-2 mt-4">
                                  {weaponName}
                                </h4>
                              )}
                            </li>
                          );
                        }
                        const parsed = parseChangeLine(change);
                        return (
                          <li key={idx} className="flex gap-3 items-start">
                            <span className="select-none text-primary mt-1.5 text-lg">
                              •
                            </span>
                            <div className="flex flex-col gap-1.5 w-full">
                              {parsed.label && (
                                <Badge
                                  variant="outline"
                                  className="w-fit text-xs px-2 py-0.5 font-semibold bg-primary/10"
                                >
                                  {parsed.label}
                                </Badge>
                              )}
                              <span className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                {parsed.content}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

              {/* Passive */}
              {champ.passive && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">
                    Pasiva
                  </h4>
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-transparent rounded-lg border border-purple-500/20">
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/passive/${champ.passive.image}`}
                      alt={champ.passive.name}
                      className="w-12 h-12 shrink-0 rounded border-2 border-purple-500/30 object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">
                        {champ.passive.name}
                      </p>
                      {(() => {
                        const parsed = parseChangeLine(
                          champ.passive.descriptionChange?.new || "",
                        );
                        return (
                          <div className="space-y-1">
                            {parsed.label && (
                              <Badge variant="secondary" className="text-xs">
                                {parsed.label}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {parsed.content}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Abilities */}
              {champ.spells.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">
                    Habilidades
                  </h4>
                  <div className="space-y-3">
                    {champ.spells.map((spell, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-muted/20 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/${
                              spell.key === "Pasiva" || spell.key === "P"
                                ? "passive"
                                : "spell"
                            }/${spell.image}`}
                            alt={spell.key}
                            className="w-10 h-10 shrink-0 rounded border border-border object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-sm">
                              <span className="text-primary">{spell.key}</span>{" "}
                              - {cleanSpellName(spell.name, champ.name)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 pl-13">
                          {spell.changes.map((change, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex flex-col sm:flex-row sm:items-center gap-2"
                            >
                              <Badge
                                variant="outline"
                                className="w-fit text-xs px-2 py-0.5 shrink-0 font-semibold"
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
                                  <span className="text-xs text-muted-foreground">
                                    {change.old}
                                  </span>
                                  <ArrowRight className="w-3 h-3 shrink-0 text-primary" />
                                  <span className="text-xs font-bold text-primary">
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
              {champ.stats.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">
                    Estadísticas Base
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {champ.stats.map((stat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50"
                      >
                        <span className="text-xs font-medium flex items-center gap-1">
                          <ChangeTypeIcon type={stat.type} />
                          {getStatLabel(stat.stat)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {stat.old}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span
                            className={`text-xs font-bold ${
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const ItemCard = ({
  item,
  version,
}: {
  item: ItemChange & { _customIcon?: string };
  version: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="group p-4 rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          {item._customIcon ? (
            <img
              src={item._customIcon}
              alt={item.name}
              className="w-12 h-12 rounded border border-border bg-black/50 object-cover group-hover:scale-110 transition-transform p-1.5"
            />
          ) : item.image ? (
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.image}`}
              alt={item.name}
              className="w-12 h-12 rounded border border-border bg-black/50 object-cover group-hover:scale-110 transition-transform"
              onError={(e) => {
                // Si falla la carga, ocultamos la imagen rota
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded border border-border bg-muted flex items-center justify-center">
              <Shield className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm">
            <ChangeTypeIcon type={item.type} />
          </div>
        </div>
        <h3 className="text-base font-bold flex-1">{item.name}</h3>
      </div>

      {item.goldChange && (
        <div className="flex justify-between items-center text-sm p-2 mb-2 bg-yellow-500/10 rounded border border-yellow-500/20">
          <span className="font-medium text-yellow-600 dark:text-yellow-400 text-xs">
            Oro
          </span>
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <span className="text-xs">{item.goldChange.old}g</span>
            <ArrowRight className="w-3 h-3" />
            <span className="font-bold text-xs">{item.goldChange.new}g</span>
          </div>
        </div>
      )}

      {(item.statChanges.length > 0 || item.developerContext) && (
        <div className="space-y-3">
          {/* 1. Estadísticas Técnicas (Data Dragon diff) */}
          {item.statChanges.length > 0 && (
            <div className="grid grid-cols-1 gap-2 text-sm p-3 bg-card/50 rounded-md border border-border/50">
              {item.statChanges.map((stat, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center group"
                >
                  <span className="text-xs flex items-center gap-1 text-muted-foreground font-medium capitalize group-hover:text-foreground transition-colors">
                    {/* Icono opcional según tipo */}
                    {stat.type === "buff" && (
                      <ArrowUp className="w-3 h-3 text-green-500" />
                    )}
                    {stat.type === "nerf" && (
                      <ArrowDown className="w-3 h-3 text-red-500" />
                    )}
                    {stat.stat.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground line-through opacity-50 text-xs">
                      {stat.old}
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span
                      className={`font-bold ${
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

          {/* 2. Contexto y Cambios de Texto (Scraping) */}
          {item.developerContext && (
            <div className="text-sm space-y-2">
              {item.developerContext.context && (
                <p className="text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                  {item.developerContext.context}
                </p>
              )}

              {item.developerContext.changes &&
                item.developerContext.changes.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {item.developerContext.changes.map((changeLine, idx) => (
                      <li key={idx} className="flex gap-2 text-foreground/90">
                        <span className="text-primary">•</span>
                        <span className="whitespace-pre-wrap">
                          {changeLine.replace(/\*\*/g, "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
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

  // Calcular estadísticas
  const totalBuffs = champions.filter(
    (c) =>
      c.stats.some((s) => s.type === "buff") ||
      c.spells.some((sp) => sp.changes.some((ch) => ch.type === "buff")),
  ).length;

  const totalNerfs = champions.filter(
    (c) =>
      c.stats.some((s) => s.type === "nerf") ||
      c.spells.some((sp) => sp.changes.some((ch) => ch.type === "nerf")),
  ).length;

  // Estado para controlar la tab activa
  const [currentTab, setCurrentTab] = useState("summary");
  // Estado para controlar qué tarjeta expandir automáticamente
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Lógica de Filtrado: Objetos Nuevos vs Regulares
  const newItems = items.filter(
    (i) =>
      i.developerContext?.section?.toLowerCase().includes("nuevo") ||
      i.developerContext?.section?.toLowerCase().includes("new"),
  );
  const regularItems = items.filter((i) => !newItems.includes(i));

  // Función para navegar a un detalle específico
  const handleNavigate = (tab: string, elementId: string) => {
    setCurrentTab(tab);
    setExpandedId(elementId);

    // Esperar un tick para que se renderice la nueva tab
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Opcional: añadir efecto de highlight temporal
        element.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          // Limpiar el ID expandido después de un tiempo para permitir cerrarlo manualmente después
          // setExpandedId(null);
        }, 1500);
      }
    }, 100);
  };

  return (
    <div className="space-y-8">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="flex items-center w-full h-auto p-1.5 gap-1.5 bg-background/60 dark:bg-black/40 border border-border/50 backdrop-blur-xl sticky top-4 z-40 rounded-2xl shadow-xl overflow-x-auto no-scrollbar">
          <TabsTrigger
            value="summary"
            className="flex-1 min-w-[100px] rounded-xl py-2.5 transition-all duration-300 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            title="Resumen"
          >
            <LayoutDashboard className="w-4 h-4 mr-2 opacity-70 group-data-[state=active]:opacity-100" />
            <span className="font-semibold text-sm">Resumen</span>
          </TabsTrigger>

          <TabsTrigger
            value="champions"
            className="flex-1 min-w-[110px] rounded-xl py-2.5 transition-all duration-300 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            title="Campeones"
          >
            <Users className="w-4 h-4 mr-2 opacity-70 group-data-[state=active]:opacity-100" />
            <span className="font-semibold text-sm">Campeones</span>
            <Badge
              variant="secondary"
              className="ml-2 h-5 px-1.5 text-[10px] bg-primary/20 text-primary border-none font-bold"
            >
              {champions.length}
            </Badge>
          </TabsTrigger>

          {newItems.length > 0 && (
            <TabsTrigger
              value="new_items"
              className="flex-1 min-w-[100px] rounded-xl py-2.5 transition-all duration-300 data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-500 data-[state=active]:shadow-inner border border-transparent data-[state=active]:border-yellow-500/20 hover:bg-yellow-500/5 group text-yellow-600/80 dark:text-yellow-400/80"
              title="Nuevos Objetos"
            >
              <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
              <span className="font-semibold text-sm">Nuevos</span>
              <Badge
                variant="secondary"
                className="ml-2 h-5 px-1.5 text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-none font-bold"
              >
                {newItems.length}
              </Badge>
            </TabsTrigger>
          )}

          <TabsTrigger
            value="items"
            className="flex-1 min-w-[100px] rounded-xl py-2.5 transition-all duration-300 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            title="Objetos"
          >
            <Shield className="w-4 h-4 mr-2 opacity-70 group-data-[state=active]:opacity-100" />
            <span className="font-semibold text-sm">Objetos</span>
            <Badge
              variant="secondary"
              className="ml-2 h-5 px-1.5 text-[10px] bg-primary/20 text-primary border-none font-bold"
            >
              {regularItems.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="runes"
            className="flex-1 min-w-[90px] rounded-xl py-2.5 transition-all duration-300 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            title="Runas"
          >
            <Zap className="w-4 h-4 mr-2 opacity-70 group-data-[state=active]:opacity-100" />
            <span className="font-semibold text-sm">Runas</span>
            <Badge
              variant="secondary"
              className="ml-2 h-5 px-1.5 text-[10px] bg-primary/20 text-primary border-none font-bold"
            >
              {runes.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="summary"
          className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-2"
        >
          {/* Header Resumen */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/20 p-6 rounded-2xl border border-white/5">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-500 fill-yellow-500/20" />
                Resumen del Parche
              </h2>
              <p className="text-muted-foreground mt-1">
                Todos los cambios importantes en un solo vistazo. Haz clic en
                los iconos para ver detalles.
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-2xl px-6 py-2 font-bold border-2 bg-background/50"
            >
              {data.displayVersion || data.version}
            </Badge>
          </div>

          {/* Resumen Ejecutivo de la IA */}
          {data.summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden bg-primary/5 border border-primary/20 p-6 rounded-2xl"
            >
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Sparkles className="w-12 h-12" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Resumen Ejecutivo (AI)
              </h3>
              <p className="text-lg text-foreground/90 leading-relaxed font-medium italic">
                "{data.summary}"
              </p>
            </motion.div>
          )}

          {/* 1. Campeones */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
              <Users className="w-5 h-5" />
              Campeones Modificados
              <Badge variant="secondary" className="ml-2">
                {champions.length}
              </Badge>
            </h3>
            <div className="flex flex-wrap gap-3 p-4 bg-muted/10 rounded-xl border border-white/5">
              {champions.map((champ) => {
                // Detectar buff/nerf simple
                const isBuff =
                  champ.stats.some((s) => s.type === "buff") ||
                  champ.spells.some((s) =>
                    s.changes.some((c) => c.type === "buff"),
                  );
                const isNerf =
                  champ.stats.some((s) => s.type === "nerf") ||
                  champ.spells.some((s) =>
                    s.changes.some((c) => c.type === "nerf"),
                  );
                const borderClass = isBuff
                  ? "group-hover:border-green-500"
                  : isNerf
                    ? "group-hover:border-red-500"
                    : "group-hover:border-orange-500";

                return (
                  <button
                    key={champ.id}
                    onClick={() => handleNavigate("champions", champ.id)}
                    className={`group relative w-14 h-14 rounded-lg overflow-hidden border-2 border-transparent bg-black transition-all hover:scale-110 hover:shadow-lg hover:z-10 ${borderClass}`}
                    title={`Ver cambios de ${champ.name}`}
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/champion/${champ.image}`}
                      alt={champ.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    {/* Indicador de esquina */}
                    {isBuff && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-bl-lg" />
                    )}
                    {isNerf && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-lg" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Objetos Nuevos */}
          {newItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
                <Sparkles className="w-5 h-5" />
                Objetos Nuevos
                <Badge
                  variant="secondary"
                  className="ml-2 bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                >
                  {newItems.length}
                </Badge>
              </h3>
              <div className="flex flex-wrap gap-3 p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/10">
                {newItems.map((item, idx) => (
                  <button
                    key={`${item.name}-new-${idx}`}
                    onClick={() =>
                      handleNavigate(
                        "new_items",
                        `new-item-${item.name.replace(/\s+/g, "-")}`,
                      )
                    }
                    className="group relative w-14 h-14 rounded-lg overflow-hidden border-2 border-transparent bg-black transition-all hover:scale-110 hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-500/20 hover:z-10"
                    title={`Ver nuevo objeto: ${item.name}`}
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/item/${item.image}`}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg group-hover:ring-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Ajustes de Objetos */}
          {regularItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                <Shield className="w-5 h-5 text-blue-400" />
                Ajustes de Objetos
                <Badge variant="secondary" className="ml-2">
                  {regularItems.length}
                </Badge>
              </h3>
              <div className="flex flex-wrap gap-3 p-4 bg-muted/10 rounded-xl border border-white/5">
                {regularItems.map((item, idx) => (
                  <button
                    key={`${item.name}-${idx}`}
                    onClick={() =>
                      handleNavigate(
                        "items",
                        `item-${item.name.replace(/\s+/g, "-")}`,
                      )
                    }
                    className="group relative w-12 h-12 rounded-lg overflow-hidden border border-border bg-black transition-all hover:scale-110 hover:border-blue-400 hover:shadow-lg hover:z-10"
                    title={`Ver cambios de ${item.name}`}
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/item/${item.image}`}
                      alt={item.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Runas */}
          {data.runes && data.runes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                <Zap className="w-5 h-5 text-yellow-400" />
                Ajustes de Runas
                <Badge variant="secondary" className="ml-2">
                  {data.runes.length}
                </Badge>
              </h3>
              <div className="flex flex-wrap gap-3 p-4 bg-muted/10 rounded-xl border border-white/5">
                {data.runes.map((rune, idx) => (
                  <button
                    key={`${rune.name}-${idx}`}
                    onClick={() => handleNavigate("runes", `rune-${rune.id}`)}
                    className="group relative w-12 h-12 rounded-lg overflow-hidden border border-border bg-black transition-all hover:scale-110 hover:border-yellow-400 hover:shadow-lg hover:z-10"
                    title={`Ver cambios de ${rune.name}`}
                  >
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon.replace(/^\/?/, "")}`}
                      alt={rune.name}
                      className="w-full h-full object-contain p-1 opacity-80 group-hover:opacity-100 transition-opacity filter brightness-110"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Cambios al Sistema */}
          {data.systemChanges && data.systemChanges.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-orange-400">
                <Zap className="w-5 h-5" />
                Cambios al Sistema
                <Badge variant="secondary" className="ml-2">
                  {data.systemChanges.length}
                </Badge>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.systemChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-white/5 bg-muted/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ChangeTypeIcon type={change.type} />
                      <h4 className="font-bold text-foreground">
                        {change.name}
                      </h4>
                    </div>
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      {change.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="champions" className="mt-6 space-y-4">
          {/* ... (Contenido de campeones igual que antes) ... */}
          <div className="grid grid-cols-1 gap-4">
            {champions.map((champ) => (
              <div id={champ.id} key={champ.id} className="scroll-mt-24">
                <ChampionCard
                  champ={champ}
                  version={data.version}
                  forceExpanded={expandedId === champ.id}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tab Content: Objetos Nuevos */}
        {newItems.length > 0 && (
          <TabsContent
            value="new_items"
            className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newItems.map((item, idx) => (
                <div
                  key={`${item.name}-new-${idx}`}
                  id={`new-item-${item.name.replace(/\s+/g, "-")}`}
                  className="scroll-mt-24"
                >
                  <ItemCard item={item} version={data.version} />
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Tab Content: Resto de Objetos (Agrupados) */}
        <TabsContent value="items" className="mt-6 space-y-8">
          {(() => {
            // Agrupar items REGULARES por sección
            const groupedItems = regularItems.reduce(
              (acc, item) => {
                const section =
                  item.developerContext?.section || "Ajustes Generales";
                if (!acc[section]) acc[section] = [];
                acc[section].push(item);
                return acc;
              },
              {} as Record<string, typeof regularItems>,
            );

            const sections = Object.keys(groupedItems).sort((a, b) => {
              if (a === "Ajustes Generales") return 1;
              if (b === "Ajustes Generales") return -1;
              return a.localeCompare(b);
            });

            // Si no hay secciones (ej: todos eran nuevos y se movieron), mostrar mensaje
            if (regularItems.length === 0) {
              return (
                <div className="text-center text-muted-foreground py-10">
                  Todos los cambios de objetos están en la pestaña "Nuevos".
                </div>
              );
            }

            return sections.map((sectionTitle) => (
              <div key={sectionTitle} className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-primary/90 border-b border-white/5 pb-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  {sectionTitle.charAt(0).toUpperCase() + sectionTitle.slice(1)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedItems[sectionTitle].map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      id={`item-${item.name.replace(/\s+/g, "-")}`}
                      className="scroll-mt-24"
                    >
                      <ItemCard item={item} version={data.version} />
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </TabsContent>

        {/* Runes Tab */}
        <TabsContent value="runes" className="space-y-3">
          {runes.map((rune) => (
            <motion.div
              key={rune.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card hover:border-primary/30 transition-colors"
            >
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon.replace(/^\/?/, "")}`}
                alt={rune.name}
                className="w-12 h-12 filter brightness-110 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Si falla, intentamos con la ruta de la versión por si acaso
                  if (!target.src.includes(`/${data.version}/`)) {
                    target.src = `https://ddragon.leagueoflegends.com/cdn/${data.version}/img/${rune.icon.replace(/^\/?/, "")}`;
                  }
                }}
              />
              <div className="flex-1">
                <p className="font-semibold">{rune.name}</p>
                <p className="text-sm text-muted-foreground">
                  {rune.descriptionChange
                    ? "Descripción actualizada"
                    : "Cambios menores"}
                </p>
              </div>
            </motion.div>
          ))}
        </TabsContent>

        {/* Summoners Tab */}
        <TabsContent value="summoners" className="space-y-4">
          {summoners.map((sum) => (
            <motion.div
              key={sum.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${data.version}/img/spell/${sum.image}`}
                alt={sum.name}
                className="w-12 h-12 rounded border border-border bg-black"
              />
              <div className="flex-1">
                <p className="font-semibold">{sum.name}</p>
                {sum.cooldownChange && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{sum.cooldownChange.old}s</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-bold text-primary">
                      {sum.cooldownChange.new}s
                    </span>
                  </div>
                )}
                {sum.descriptionChange && (
                  <p className="text-sm text-muted-foreground italic mt-1">
                    Descripción actualizada
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
