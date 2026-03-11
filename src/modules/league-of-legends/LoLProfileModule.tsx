"use client";

/**
 * LoLProfileModule
 *
 * Adaptador que envuelve los componentes existentes de Riot/LoL
 * detrás de la interfaz genérica GameProfileModule.
 *
 * NO modifica la lógica interna de ProfileLolTabContent ni ningún
 * componente de /components/riot/. Solo los encapsula.
 */

import type { GameProfileModule, ProfileTabProps } from "@/modules/types";
import type { LinkedAccountRiot } from "@/types/riot";
import ProfileLolTabContent from "@/components/perfil/ProfileLolTabContent";
import { RiotAccountCardVisual } from "@/components/riot/RiotAccountCardVisual";

export const LoLProfileModule: GameProfileModule = {
    slug: "league-of-legends",
    displayName: "League of Legends",
    icon: "trophy",

    shouldShowTab: ({ hasLinkedAccount, isOwnProfile }) => {
        // Mostrar si tiene cuenta vinculada O si es su propio perfil
        return hasLinkedAccount || isOwnProfile;
    },

    renderProfileTab: (props: ProfileTabProps) => {
        // Cast de los datos genéricos a los datos de Riot
        const riotAccount = props.gameAccountData as LinkedAccountRiot | null;

        return (
            <ProfileLolTabContent
                riotAccount={riotAccount}
                userId={props.userId}
                isOwnProfile={props.isOwnProfile}
                unifiedSyncPending={props.syncPending}
                unifiedSyncCooldown={props.syncCooldown}
                onInvalidateCache={props.onInvalidateCache}
                profileColor={props.profileColor}
                isPublicProfile={props.isPublicProfile}
            />
        );
    },
};
