import { getServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Usamos el helper getServiceClient para obtener el cliente con rol de servicio
// esto evita errores de inicialización durante el build.

export async function POST(req: Request) {
    try {
        const { proProfileId, action, userId } = await req.json();

        if (!proProfileId || !action || !userId) {
            return NextResponse.json(
                { error: "Faltan parámetros requeridos" },
                { status: 400 }
            );
        }

        if (action === "follow") {
            const { error } = await getServiceClient()
                .from("user_follows_pro")
                .insert({
                    user_id: userId,
                    pro_profile_id: proProfileId,
                });
            
            if (error) {
                if (error.code === '23505') { // unique violation
                    return NextResponse.json({ success: true, message: "Ya sigues a este perfil" });
                }
                throw error;
            }
        } else if (action === "unfollow") {
            const { error } = await getServiceClient()
                .from("user_follows_pro")
                .delete()
                .match({
                    user_id: userId,
                    pro_profile_id: proProfileId,
                });
            
            if (error) throw error;
        } else {
            return NextResponse.json(
                { error: "Acción no válida" },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, action: action });

    } catch (error: any) {
        console.error("Error en toggle follow pro:", error);
        return NextResponse.json(
            { error: "Error interno del servidor", details: error.message },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const proProfileId = searchParams.get("proProfileId");

        if (!userId || !proProfileId) {
            return NextResponse.json({ isFollowing: false });
        }

        const { data, error } = await getServiceClient()
            .from("user_follows_pro")
            .select("created_at")
            .match({ user_id: userId, pro_profile_id: proProfileId })
            .maybeSingle();

        if (error) {
             throw error;
        }

        return NextResponse.json({ isFollowing: !!data });

    } catch (error: any) {
        console.error("Error fetching follow status:", error);
        return NextResponse.json(
            { isFollowing: false, error: "Error interno" },
            { status: 500 }
        );
    }
}
