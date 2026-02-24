"use server";

import { createClient, getServiceClient } from "@/lib/supabase/server";
import { getAccountByRiotId } from "@/lib/riot/account";
import { getOrUpdateSummonerRank } from "@/lib/riot/league";
import { PublicProfileInsert } from "@/types/public-profile";
import { revalidatePath } from "next/cache";

export async function createPublicProfile(formData: FormData) {
  try {
    const supabase = await createClient();
    const serviceClient = getServiceClient();

    // 1. Verificar autenticación y rol de admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "No autenticado" };
    }

    // Verificar rol admin en tabla perfiles
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (perfilError || perfil?.role !== "admin") {
      return { error: "No tienes permisos de administrador" };
    }

    // 2. Obtener datos del formulario
    const riotId = formData.get("riotId") as string; // "GameName#TAG"
    const category = formData.get("category") as any;
    const teamName = formData.get("teamName") as string;
    const avatarUrl = formData.get("avatarUrl") as string;
    const mainRole = formData.get("mainRole") as any;

    // Parse social links
    const socialLinksRaw = {
      twitter: formData.get("twitter") as string,
      twitch: formData.get("twitch") as string,
      youtube: formData.get("youtube") as string,
      instagram: formData.get("instagram") as string,
    };

    // Limpiar strings vacíos
    const socialLinks: any = {};
    Object.entries(socialLinksRaw).forEach(([key, value]) => {
      if (value && value.trim() !== "") socialLinks[key] = value.trim();
    });

    if (!riotId || !riotId.includes("#")) {
      return { error: "Formato de Riot ID inválido. Debe ser: Nombre#TAG" };
    }

    const [gameName, tagLine] = riotId.split("#");

    // 3. Consultar Riot API para obtener PUUID
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) return { error: "RIOT_API_KEY no configurada en el servidor" };

    const riotAccount = await getAccountByRiotId(gameName, tagLine, apiKey);

    if (!riotAccount) {
      return { error: `No se encontró el usuario ${riotId} en Riot Games` };
    }

    // 4. Actualizar tabla caché 'summoners' y obtener ranking inicial
    // Usamos la región seleccionada en el formulario
    const region = (formData.get("region") as string) || "la1";

    await getOrUpdateSummonerRank(riotAccount.puuid, region, apiKey);

    // Obtener datos detallados (Icono, Nivel) de Summoner-V4
    const { getSummonerByPuuid } = await import("@/lib/riot/summoner");
    const summonerData = await getSummonerByPuuid(
      riotAccount.puuid,
      region,
      apiKey,
    );

    // Asegurarnos que el summoner existe con el nombre correcto y DATOS visuales
    const { error: summonerError } = await serviceClient
      .from("summoners")
      .upsert(
        {
          puuid: riotAccount.puuid,
          summoner_name: riotAccount.gameName,
          game_name: riotAccount.gameName,
          tag_line: riotAccount.tagLine,
          profile_icon_id: summonerData?.profileIconId,
          summoner_level: summonerData?.summonerLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "puuid" },
      );

    if (summonerError) {
      console.error("Error upsert summoner:", summonerError);
      return { error: "Error al registrar invocador en base de datos" };
    }

    // 5. Crear el Public Profile
    // Generar slug a partir del nombre si no se provee uno (asumimos display name)
    let rawSlug = (formData.get("slug") as string)?.trim();
    if (!rawSlug) {
      rawSlug = riotAccount.gameName;
    }

    const slug = rawSlug
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const profileData: PublicProfileInsert = {
      puuid: riotAccount.puuid,
      slug: slug,
      display_name: riotAccount.gameName, // O usar un campo display_name del form
      category: category,
      region: region,
      main_role: mainRole || null,
      team_name: teamName || null,
      avatar_url: avatarUrl || null,
      social_links: socialLinks,
      is_active: true,
      created_by: user.id,
    };

    const { error: insertError } = await serviceClient
      .from("public_profiles")
      .insert(profileData);

    if (insertError) {
      if (insertError.code === "23505") {
        // Unique violation
        return {
          error: "Ya existe un perfil público para este jugador o este slug.",
        };
      }
      console.error("Error insert public_profile:", insertError);
      return { error: "Error al crear perfil público: " + insertError.message };
    }

    // 6. Sincronización inicial (Fire and Forget)
    try {
      const { syncMatchHistory } = await import("@/lib/riot/matches");
      syncMatchHistory(riotAccount.puuid, region, apiKey, 20).catch((err) =>
        console.error("[createPublicProfile] Sync inicial falló:", err),
      );
    } catch (e) {
      console.error("[createPublicProfile] Error al importar sync:", e);
    }

    revalidatePath("/admin/perfiles-publicos");
    return { success: true };
  } catch (error: any) {
    console.error("Exception in createPublicProfile:", error);
    return { error: "Error interno del servidor: " + error.message };
  }
}

export async function deletePublicProfile(id: string) {
  const supabase = await createClient(); // Auth check
  const serviceClient = getServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Verificar rol admin
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (perfil?.role !== "admin") return { error: "No autorizado" };

  const { error } = await serviceClient
    .from("public_profiles")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/perfiles-publicos");
  return { success: true };
}

export async function updatePublicProfile(id: string, formData: FormData) {
  try {
    const supabase = await createClient();
    const serviceClient = getServiceClient();

    // 1. Verificar autenticación y rol de admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "No autenticado" };
    }

    // Verificar rol admin en tabla perfiles
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (perfilError || perfil?.role !== "admin") {
      return { error: "No tienes permisos de administrador" };
    }

    // 2. Obtener datos del formulario
    const displayName = formData.get("display_name") as string;
    const category = formData.get("category") as any;
    const teamName = formData.get("teamName") as string;
    const mainRole = formData.get("mainRole") as any;
    const slug = formData.get("slug") as string;
    const avatarFile = formData.get("avatarFile") as File;

    let finalAvatarUrl = formData.get("avatarUrl") as string;

    // 3. Subir imagen si se proporcionó un archivo
    if (avatarFile && avatarFile.size > 0 && avatarFile.name !== "undefined") {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public-profiles/${fileName}`;

      const { data: uploadData, error: uploadError } =
        await serviceClient.storage
          .from("avatars")
          .upload(filePath, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
          });

      if (uploadError) {
        console.error("Error uploading avatar:", uploadError);
        return { error: "Error al subir la imagen: " + uploadError.message };
      }

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = serviceClient.storage.from("avatars").getPublicUrl(filePath);

      finalAvatarUrl = publicUrl;
    }

    // Parse social links
    const socialLinksRaw = {
      twitter: formData.get("twitter") as string,
      twitch: formData.get("twitch") as string,
      youtube: formData.get("youtube") as string,
      instagram: formData.get("instagram") as string,
    };

    // Limpiar strings vacíos
    const socialLinks: any = {};
    Object.entries(socialLinksRaw).forEach(([key, value]) => {
      if (value && value.trim() !== "") socialLinks[key] = value.trim();
    });

    // 4. Actualizar el Public Profile
    const updateData: any = {
      display_name: displayName,
      category: category,
      main_role: mainRole || null,
      team_name: teamName || null,
      avatar_url: finalAvatarUrl || null,
      social_links: socialLinks,
      updated_at: new Date().toISOString(),
    };

    if (slug) {
      updateData.slug = slug.toLowerCase().trim().replace(/\s+/g, "-");
    }

    const { error: updateError } = await serviceClient
      .from("public_profiles")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Error update public_profile:", updateError);
      return {
        error: "Error al actualizar perfil público: " + updateError.message,
      };
    }

    const finalSlug = updateData.slug || id;

    revalidatePath("/admin/perfiles-publicos");
    revalidatePath(`/pro/${finalSlug}`);

    return { success: true, newSlug: updateData.slug };
  } catch (error: any) {
    console.error("Exception in updatePublicProfile:", error);
    return { error: "Error interno del servidor: " + error.message };
  }
}
