"use client";

/**
 * Módulo de perfil para Delta Force.
 *
 * A diferencia del módulo de LoL, Delta Force no tiene
 * un sistema de cuentas vinculadas vía API.
 * Muestra los análisis de armas del usuario.
 */

import type { GameProfileModule, ProfileTabProps } from "@/modules/types";
import DeltaForceProfileTab from "./DeltaForceProfileTab";

export const DeltaForceProfileModule: GameProfileModule = {
    slug: "delta-force",
    displayName: "Delta Force",
    icon: "gamepad",

    shouldShowTab: ({ hasLinkedAccount, isOwnProfile }) => {
        // Delta Force no tiene linked accounts por ahora.
        // Mostrar siempre si es perfil propio, o si tiene registros de armas.
        // Por simplificación, el hasLinkedAccount vendrá como true si el usuario
        // tiene weapon_stats_records.
        return hasLinkedAccount || isOwnProfile;
    },

    renderProfileTab: (props: ProfileTabProps) => {
        return (
            <DeltaForceProfileTab
                userId={props.userId}
                isOwnProfile={props.isOwnProfile}
                profileColor={props.profileColor}
            />
        );
    },
};
