"use client";

import { useState } from "react";
import {
  Twitch,
  MessageCircle,
  Gamepad2,
  Zap,
  Radio,
  ChevronDown,
  Plus,
} from "lucide-react";

// Icono SVG de League of Legends (Logo simplificado "L")
const LoLIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4.09 16.554h4.945c.44 0 .759-.265.759-.76 0-.422-.32-.686-.76-.686H6.126v-9.67c0-.735.037-1.446.06-2.17h-1.99c-.048.736.037 1.435.037 2.17v10.157c0 .543-.072.76-.145.96zM17.152 4.096c-1.35 0-2.35.253-2.928.52l.626 1.626c.458-.205 1.157-.422 2.157-.422 1.903 0 3.012.988 3.012 2.891v.964h-3.325c-3.145 0-4.663 1.542-4.663 3.663 0 2.229 1.602 3.662 3.976 3.662 1.626 0 2.82-.722 3.325-1.686h.108v1.542h1.832v-5.71c0-4.145-2.29-7.05-4.12-7.05zm.156 11.217c-1.12 0-2.072-.615-2.072-1.928 0-1.217.915-2.012 2.457-2.012h1.603v.795c0 1.94-1.133 3.145-1.988 3.145z" />
  </svg>
);

import {
  ConnectedAccountsData,
  AccountPlatform,
} from "@/hooks/useConnectedAccounts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectAccountModal } from "./ConnectAccountModal";

interface ConnectedAccountsProps {
  accounts: ConnectedAccountsData;
  isOwnProfile?: boolean;
  userColor?: string;
  riotAccount?: any;
}

const getPlatformIcon = (platform: AccountPlatform) => {
  const iconProps = { className: "w-5 h-5" };

  switch (platform) {
    case "twitch":
      return <Twitch {...iconProps} />;
    case "discord":
      return <MessageCircle {...iconProps} />;
    case "league_of_legends":
      return <LoLIcon {...iconProps} />;
    case "valorant":
      return <Zap {...iconProps} />;
    case "kick":
      return <Radio {...iconProps} />;
    case "delta_force":
      return <Gamepad2 {...iconProps} />;
    default:
      return null;
  }
};

const getPlatformLabel = (platform: AccountPlatform): string => {
  const labels: Record<AccountPlatform, string> = {
    twitch: "Twitch",
    discord: "Discord",
    league_of_legends: "League of Legends",
    valorant: "Valorant",
    kick: "Kick",
    delta_force: "Delta Force",
  };
  return labels[platform];
};

const getPlatformColor = (platform: AccountPlatform): string => {
  const colors: Record<AccountPlatform, string> = {
    twitch: "#9146FF",
    discord: "#5865F2",
    league_of_legends: "#0A8BD9",
    valorant: "#FA4454",
    kick: "#00D084",
    delta_force: "#FF6B35",
  };
  return colors[platform];
};

const AccountCard = ({
  platform,
  username,
  subtitle,
}: {
  platform: string;
  username: string;
  subtitle?: string;
}) => (
  <div
    className="flex items-center justify-center px-3 py-2 rounded-lg border transition-all hover:shadow-md"
    style={{
      borderColor: `${getPlatformColor(platform as AccountPlatform)}40`,
      backgroundColor: `${getPlatformColor(platform as AccountPlatform)}10`,
    }}
  >
    <div className="flex flex-col items-center text-center">
      <span className="text-xs font-medium text-muted-foreground">
        {getPlatformLabel(platform as AccountPlatform)}
      </span>
      <span className="text-sm font-semibold text-foreground">{username}</span>
      {subtitle && (
        <span className="text-xs text-muted-foreground font-medium">
          {subtitle}
        </span>
      )}
    </div>
  </div>
);

export const ConnectedAccounts = ({
  accounts,
  isOwnProfile = false,
  userColor,
  riotAccount,
}: ConnectedAccountsProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Parsear accounts si es string JSON
  let parsedAccounts: ConnectedAccountsData = {};
  if (accounts) {
    if (typeof accounts === "string") {
      try {
        parsedAccounts = JSON.parse(accounts);
      } catch (e) {
        console.error("[ConnectedAccounts] Error parsing accounts:", e);
        parsedAccounts = {};
      }
    } else if (typeof accounts === "object") {
      parsedAccounts = accounts;
    }
  }

  // Combinar cuentas manuales con cuenta de Riot
  const manualAccounts: [string, string, string?][] = Object.entries(
    parsedAccounts || {}
  );
  const allAccounts: [string, string, string?][] = [...manualAccounts];

  // Si hay cuenta de Riot, agregarla al principio
  if (riotAccount) {
    // Priorizar información de SoloQ (solo_tier/solo_rank) sobre la genérica
    const tier = riotAccount.solo_tier || riotAccount.tier;
    const rank = riotAccount.solo_rank || riotAccount.rank;

    let subtitle = "Unranked";
    if (tier && rank && tier !== "UNRANKED") {
      // Capitalizar Tier (ej: GOLD -> Gold)
      const formattedTier =
        tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
      subtitle = `${formattedTier} ${rank}`;
    }

    allAccounts.unshift([
      "league_of_legends",
      `${riotAccount.game_name} #${riotAccount.tag_line}`,
      subtitle,
    ]);
  }

  const hasAccounts = allAccounts.length > 0;

  if (!hasAccounts && !isOwnProfile) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Cuentas Conectadas
      </h3>

      {hasAccounts ? (
        <>
          {/* Desktop: mostrar todas */}
          <div className="hidden md:flex flex-wrap gap-2 items-center">
            {allAccounts.map(([platform, username, subtitle]) => (
              <AccountCard
                key={`${platform}-${username}`}
                platform={platform}
                username={username}
                subtitle={subtitle as string}
              />
            ))}

            {/* Botón para agregar más cuentas */}
            {isOwnProfile && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                title="Conectar otra cuenta"
              >
                <Plus className="w-5 h-5 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400" />
              </button>
            )}
          </div>

          {/* Mobile: Avatar Group con desplegable */}
          <div className="md:hidden">
            <div className="flex items-center gap-3">
              {/* Avatar Group */}
              <div className="flex items-center -space-x-2">
                {allAccounts.map(([platform, username]) => (
                  <Avatar
                    key={`${platform}-${username}`}
                    className="h-8 w-8 border-2 border-background dark:border-gray-950"
                  >
                    <AvatarFallback
                      style={{
                        backgroundColor: getPlatformColor(
                          platform as AccountPlatform
                        ),
                      }}
                      className="flex items-center justify-center text-white"
                    >
                      <div style={{ color: "white" }}>
                        {getPlatformIcon(platform as AccountPlatform)}
                      </div>
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>

              {/* Dropdown trigger */}
              <DropdownMenu
                open={isDropdownOpen}
                onOpenChange={setIsDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                    <span className="text-xs font-medium text-muted-foreground">
                      {allAccounts.length} plataforma
                      {allAccounts.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {allAccounts.map(([p, u, s]) => (
                    <DropdownMenuItem key={`${p}-${u}`} disabled>
                      <div className="flex items-center gap-2 w-full">
                        <div
                          style={{
                            color: getPlatformColor(p as AccountPlatform),
                          }}
                        >
                          {getPlatformIcon(p as AccountPlatform)}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground">
                            {getPlatformLabel(p as AccountPlatform)}
                          </span>
                          <span className="text-sm font-semibold text-foreground truncate">
                            {u}
                          </span>
                          {s && (
                            <span className="text-xs text-muted-foreground truncate">
                              {s as string}
                            </span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {isOwnProfile && (
                    <>
                      <div className="h-px bg-gray-200 dark:bg-gray-800 my-1" />
                      <DropdownMenuItem onSelect={() => setIsModalOpen(true)}>
                        <div className="flex items-center gap-2 w-full text-blue-500 cursor-pointer">
                          <Plus className="w-4 h-4" />
                          <span className="font-medium">
                            Conectar otra cuenta
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </>
      ) : isOwnProfile ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground italic">
            No tienes cuentas conectadas.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all w-full md:w-auto"
          >
            <Plus className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Conectar Cuenta
            </span>
          </button>
        </div>
      ) : null}

      {/* Modal de conexión de cuentas */}
      <ConnectAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
