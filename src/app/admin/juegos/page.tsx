"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
    JuegoFormDialog,
    useJuegos,
    type Juego,
    type JuegoListado,
} from "@/components/admin/eventos";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
    Gamepad2,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Puzzle,
    ToggleLeft,
    ToggleRight,
    RefreshCw,
    ExternalLink,
    Settings,
} from "lucide-react";

// Tipos de módulos disponibles
const MODULE_TYPES = [
    { key: "profiles", label: "Perfiles", description: "Perfiles de jugadores" },
    { key: "matches", label: "Partidas", description: "Historial de partidas" },
    { key: "builds", label: "Builds", description: "Builds y loadouts" },
    { key: "champions", label: "Campeones", description: "Catálogo de campeones" },
    { key: "weapons", label: "Armas", description: "Catálogo de armas" },
    { key: "news", label: "Noticias", description: "Noticias del juego" },
    { key: "events", label: "Eventos", description: "Eventos y parches" },
    { key: "rotations", label: "Rotaciones", description: "Rotaciones gratuitas" },
    { key: "pro_players", label: "Pro Players", description: "Jugadores profesionales" },
];

interface GameModule {
    id: string;
    game_id: string;
    module_type: string;
    enabled: boolean;
    config: Record<string, unknown>;
}

export default function AdminJuegosPage() {
    const supabase = createClient();
    const router = useRouter();
    const {
        juegos,
        isLoadingJuegos,
        fetchJuegos,
        handleEliminarJuego,
        guardarJuego,
        juegoEliminandoId,
    } = useJuegos();

    const [modules, setModules] = useState<GameModule[]>([]);
    const [loadingModules, setLoadingModules] = useState(false);
    const [togglingModule, setTogglingModule] = useState<string | null>(null);
    const [isJuegoDialogOpen, setIsJuegoDialogOpen] = useState(false);
    const [juegoEditando, setJuegoEditando] = useState<Juego | null>(null);
    const [expandedGame, setExpandedGame] = useState<string | null>(null);

    // Cargar módulos
    const fetchModules = useCallback(async () => {
        try {
            setLoadingModules(true);
            const { data, error } = await supabase
                .from("game_modules")
                .select("id, game_id, module_type, enabled, config")
                .order("module_type");

            if (error) throw error;
            setModules(data || []);
        } catch (error) {
            console.error("[fetchModules]", error);
        } finally {
            setLoadingModules(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchJuegos();
        fetchModules();
    }, [fetchJuegos, fetchModules]);

    // Toggle módulo
    const handleToggleModule = async (
        gameId: string,
        moduleType: string,
        currentlyEnabled: boolean
    ) => {
        const moduleKey = `${gameId}-${moduleType}`;
        setTogglingModule(moduleKey);

        try {
            const existingModule = modules.find(
                (m) => m.game_id === gameId && m.module_type === moduleType
            );

            if (existingModule) {
                // Update existing
                const { error } = await supabase
                    .from("game_modules")
                    .update({ enabled: !currentlyEnabled, updated_at: new Date().toISOString() })
                    .eq("id", existingModule.id);

                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from("game_modules")
                    .insert({
                        game_id: gameId,
                        module_type: moduleType,
                        enabled: true,
                        config: {},
                    });

                if (error) throw error;
            }

            await fetchModules();

            toast({
                title: currentlyEnabled ? "Módulo desactivado" : "Módulo activado",
                description: `${moduleType} fue ${currentlyEnabled ? "desactivado" : "activado"} correctamente.`,
            });
        } catch (error) {
            console.error("[toggleModule]", error);
            toast({
                title: "Error",
                description: "No se pudo cambiar el estado del módulo.",
                variant: "destructive",
            });
        } finally {
            setTogglingModule(null);
        }
    };

    // Helpers
    const getGameModules = (gameId: string) =>
        modules.filter((m) => m.game_id === gameId);

    const isModuleEnabled = (gameId: string, moduleType: string) => {
        const mod = modules.find(
            (m) => m.game_id === gameId && m.module_type === moduleType
        );
        return mod?.enabled ?? false;
    };

    const handleNuevoJuego = () => {
        setJuegoEditando(null);
        setIsJuegoDialogOpen(true);
    };

    const handleEditarJuego = (juego: JuegoListado) => {
        setJuegoEditando(juego);
        setIsJuegoDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Gamepad2 className="h-6 w-6" />
                        Gestión de Juegos
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Administra los juegos y sus módulos activos en la plataforma.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchJuegos();
                            fetchModules();
                        }}
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Recargar
                    </Button>
                    <Button onClick={handleNuevoJuego}>
                        <Plus className="h-4 w-4 mr-1" />
                        Nuevo Juego
                    </Button>
                </div>
            </div>

            {/* Loading */}
            {isLoadingJuegos ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : juegos.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Gamepad2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-lg">
                            No hay juegos registrados
                        </p>
                        <Button onClick={handleNuevoJuego} className="mt-4">
                            <Plus className="h-4 w-4 mr-1" />
                            Crear primer juego
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {juegos.map((juego) => {
                        const gameModules = getGameModules(juego.id);
                        const enabledCount = gameModules.filter((m) => m.enabled).length;
                        const isExpanded = expandedGame === juego.id;

                        return (
                            <Card key={juego.id} className="overflow-hidden">
                                {/* Game Header */}
                                <CardHeader
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() =>
                                        setExpandedGame(isExpanded ? null : juego.id)
                                    }
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {juego.iconoPublicUrl ? (
                                                <img
                                                    src={juego.iconoPublicUrl}
                                                    alt={juego.nombre}
                                                    className="h-10 w-10 rounded-lg object-contain bg-muted/50 p-1"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                                    <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {juego.nombre}
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-2 mt-0.5">
                                                    <Link
                                                        href={`/games/${juego.slug}`}
                                                        target="_blank"
                                                        className="text-xs bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                                                    >
                                                        /games/{juego.slug}
                                                    </Link>
                                                    {juego.desarrollador && (
                                                        <span>• {juego.desarrollador}</span>
                                                    )}
                                                </CardDescription>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                asChild
                                            >
                                                <Link
                                                    href={`/games/${juego.slug}`}
                                                    target="_blank"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Badge variant="secondary" className="text-xs">
                                                <Puzzle className="h-3 w-3 mr-1" />
                                                {enabledCount} módulos
                                            </Badge>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    router.push(`/admin/juegos/${juego.slug}`);
                                                }}
                                            >
                                                <Settings className="h-3.5 w-3.5" />
                                                Configurar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditarJuego(juego);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                disabled={juegoEliminandoId === juego.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEliminarJuego(juego);
                                                }}
                                            >
                                                {juegoEliminandoId === juego.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                {/* Modules Grid (expandable) */}
                                {isExpanded && (
                                    <CardContent className="border-t bg-muted/20 pt-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Puzzle className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                Módulos disponibles
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {MODULE_TYPES.map((modType) => {
                                                const enabled = isModuleEnabled(
                                                    juego.id,
                                                    modType.key
                                                );
                                                const isToggling =
                                                    togglingModule === `${juego.id}-${modType.key}`;

                                                return (
                                                    <div
                                                        key={modType.key}
                                                        className={`
                              flex items-center justify-between p-3 rounded-lg border transition-all
                              ${enabled
                                                                ? "bg-primary/5 border-primary/20"
                                                                : "bg-muted/30 border-muted"
                                                            }
                            `}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p
                                                                className={`text-sm font-medium ${enabled
                                                                    ? "text-foreground"
                                                                    : "text-muted-foreground"
                                                                    }`}
                                                            >
                                                                {modType.label}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {modType.description}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                handleToggleModule(
                                                                    juego.id,
                                                                    modType.key,
                                                                    enabled
                                                                )
                                                            }
                                                            disabled={isToggling}
                                                            className="ml-3 flex-shrink-0 focus:outline-none"
                                                        >
                                                            {isToggling ? (
                                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                            ) : enabled ? (
                                                                <ToggleRight className="h-8 w-8 text-primary" />
                                                            ) : (
                                                                <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Dialog reutilizado */}
            <JuegoFormDialog
                open={isJuegoDialogOpen}
                onOpenChange={setIsJuegoDialogOpen}
                juegoEditando={juegoEditando}
                onSuccess={fetchJuegos}
                guardarJuego={guardarJuego}
            />
        </div>
    );
}
