import { getServiceClient } from "@/utils/supabase-service";

interface NotifyMentionsParams {
  content: string;
  authorId: string;
  authorName: string;
  sourceId: string;
  sourceType: "post" | "comment" | "reply" | "news_comment" | "thread_comment";
  sourceUrl: string;
  previewText?: string;
  excludeUserIds?: string[];
}

/**
 * Extrae los Usernames de usuarios mencionados de un contenido HTML.
 * Busca spans con data-type="user" y toma el data-id (que contiene el username).
 */
export function extractMentionedUsernames(htmlContent: string): string[] {
  if (!htmlContent) return [];

  const mentions = new Set<string>();

  // Regex para encontrar spans
  const spanRegex = /<span([\s\S]*?)>/gi;
  let match;

  while ((match = spanRegex.exec(htmlContent)) !== null) {
    const attributes = match[1];

    // Verificar si es tipo user
    if (/data-type="user"/i.test(attributes)) {
      // Extraer data-id (username)
      const idMatch = /data-id="([^"]+)"/i.exec(attributes);
      if (idMatch && idMatch[1]) {
        mentions.add(idMatch[1]);
      }
    }
  }

  return Array.from(mentions);
}

/**
 * Procesa notificaciones de menciones
 */
export async function notifyMentions({
  content,
  authorId,
  authorName,
  sourceType,
  sourceUrl,
  previewText,
  excludeUserIds = [],
}: NotifyMentionsParams) {
  console.log(
    `[NotificationService] Processing mentions for sourceType: ${sourceType}, author: ${authorName}`,
  );

  const mentionedUsernames = extractMentionedUsernames(content);
  console.log(
    `[NotificationService] Extracted usernames from content:`,
    mentionedUsernames,
  );

  if (mentionedUsernames.length === 0) {
    console.log(`[NotificationService] No mentions found. Aborting.`);
    return;
  }

  try {
    const supabase = getServiceClient();

    // Resolver Usernames a UUIDs
    const { data: users, error: userError } = await supabase
      .from("perfiles")
      .select("id, username")
      .in("username", mentionedUsernames);

    if (userError || !users) {
      console.error(
        "[NotificationService] Error resolving mentioned users:",
        userError,
      );
      return;
    }

    console.log(
      `[NotificationService] Resolved users from DB:`,
      users.map((u) => u.username),
    );

    // Filtrar targets válidos (excluir autor y excluidos explícitos)
    const targets = users
      .filter((u) => u.id !== authorId && !excludeUserIds.includes(u.id))
      .map((u) => u.id);

    console.log(
      `[NotificationService] Final targets after filtering (author/excludes):`,
      targets,
    );

    if (targets.length === 0) {
      console.log(
        `[NotificationService] No valid targets remaining. Aborting.`,
      );
      return;
    }

    // Preparar notificaciones
    const notifications = targets.map((userId) => {
      let title = "Nueva mención";
      let message = `${authorName} te mencionó`;

      switch (sourceType) {
        case "post":
          message = `${authorName} te mencionó en una publicación`;
          break;
        case "comment":
        case "news_comment":
        case "thread_comment":
          message = `${authorName} te mencionó en un comentario`;
          break;
        case "reply":
          message = `${authorName} te mencionó en una respuesta`;
          break;
      }

      if (previewText) {
        const truncated =
          previewText.length > 50
            ? previewText.substring(0, 50) + "..."
            : previewText;
        message += `: "${truncated}"`;
      }

      return {
        user_id: userId,
        title,
        message,
        // Removed 'link' as the column does not exist
        type: "info",
        read: false,
        data: {
          source_type: sourceType,
          author_id: authorId,
          original_type: "mention",
          link: sourceUrl, // Added link here for frontend consumption
        },
      };
    });

    console.log(
      `[NotificationService] Attempting to insert ${notifications.length} notifications...`,
    );

    // Usar cliente de servicio para insertar (saltar RLS si es necesario)
    const { error: insertError, data: insertData } = await supabase
      .from("notifications")
      .insert(notifications)
      .select();

    if (insertError) {
      console.error(
        "[NotificationService] Error sending mention notifications:",
        insertError,
      );
    } else {
      console.log(
        `[NotificationService] Successfully sent ${notifications.length} mention notifications. Inserted IDs:`,
        insertData?.map((n) => n.id),
      );
    }
  } catch (error) {
    console.error("[NotificationService] Unexpected error:", error);
  }
}

interface NotifyProfilePostParams {
  targetUserId: string;
  authorId: string;
  authorName: string;
  sourceUrl: string;
  previewText?: string;
}

/**
 * Notifica a un usuario que alguien publicó en su perfil
 */
export async function notifyProfilePost({
  targetUserId,
  authorId,
  authorName,
  sourceUrl,
  previewText,
}: NotifyProfilePostParams) {
  if (targetUserId === authorId) return;

  try {
    const supabase = getServiceClient();

    let message = `${authorName} publicó en tu perfil`;
    if (previewText) {
      const truncated =
        previewText.length > 50
          ? previewText.substring(0, 50) + "..."
          : previewText;
      message += `: "${truncated}"`;
    }

    const notification = {
      user_id: targetUserId,
      title: "Nueva publicación en tu perfil",
      message,
      type: "info",
      read: false,
      data: {
        source_type: "profile_post",
        author_id: authorId,
        link: sourceUrl,
      },
    };

    const { error } = await supabase.from("notifications").insert(notification);

    if (error) {
      console.error(
        "[NotificationService] Error sending profile post notification:",
        error,
      );
    } else {
      console.log(
        `[NotificationService] Sent profile post notification to ${targetUserId}`,
      );
    }
  } catch (error) {
    console.error(
      "[NotificationService] Unexpected error sending profile post notification:",
      error,
    );
  }
}
