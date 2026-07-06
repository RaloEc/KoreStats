import Fuse from 'fuse.js';
import { baseWeapons } from './weapons-data';

export async function handleBuildCommand(interaction: any) {
  try {
    const options = interaction.data.options;
    if (!options || options.length === 0) {
      return { content: "Debes especificar el nombre de un arma." };
    }

    const query = options[0].value;
    
    // 1. Fetch a la API de Next.js de KoreStats pasando el query de texto
    const response = await fetch(`https://korestats.com/api/discord/builds?query=${encodeURIComponent(query)}&limit=3`, {
      headers: {
        'Authorization': `Bearer ${process.env.KORESTATS_BOT_PAT}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      return { content: `No encontré el arma "${query}". Revisa que esté bien escrita.` };
    }

    if (!response.ok) {
      return { content: "Error al comunicarse con la base de datos de KoreStats." };
    }

    const data = await response.json();
    
    // 2. Construir el objeto weapon dinámicamente usando lo retornado por la API
    const weapon = {
      id: data.weapon_id,
      weapon_name: data.weapon_name || 'Arma',
      category: data.category || 'Desconocido',
      image_url: data.image_url || null
    };
    
    // 3. Crear y retornar el JSON Payload del Embed
    return generateEmbedPayload(weapon, data);
    
  } catch (error) {
    console.error("Error en handleBuildCommand:", error);
    return { content: "Ocurrió un error consultando las estadísticas. Intenta más tarde." };
  }
}

export async function handleInteractionButton(interaction: any) {
  try {
    const customId = interaction.data.custom_id;
    
    // Ejemplo de custom_id: "build_top_voted_15"
    if (customId.startsWith('build_top_voted_') || customId.startsWith('build_top_used_')) {
      const weaponId = customId.split('_').pop();
      const sortType = customId.includes('top_voted') ? 'votes' : 'usage';
      
      const response = await fetch(`https://korestats.com/api/discord/builds?base_weapon_id=${weaponId}&limit=3&sort=${sortType}`, {
        headers: {
          'Authorization': `Bearer ${process.env.KORESTATS_BOT_PAT}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { content: "Error al actualizar las builds." };
      }
  
      const data = await response.json();
      
      // Construir el objeto weapon dinámicamente usando lo retornado por la API
      const weapon = {
        id: weaponId,
        weapon_name: data.weapon_name || 'Arma',
        category: data.category || 'Desconocido',
        image_url: data.image_url || null
      };
      
      return generateEmbedPayload(weapon, data);
    } else if (customId === 'link_account') {
       return { content: "La funcionalidad de vincular cuenta estará disponible muy pronto." };
    }
  } catch (error) {
    console.error("Error en handleInteractionButton:", error);
    return { content: "Ocurrió un error al procesar el botón." };
  }
  return { content: "Interacción no soportada." };
}

async function patchDiscordMessage(interactionToken: string, payload: any) {
  const url = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_APP_ID}/${interactionToken}/messages/@original`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

function generateProgressBar(value: number, max: number = 100): string {
  const blocks = Math.round((value / max) * 5); // 5 blocks total
  return '🟦'.repeat(blocks) + '⬛'.repeat(5 - blocks);
}

function generateEmbedPayload(weapon: any, data: any) {
  // data.builds es un array de builds devuelto por nuestra API
  
  const fields = data.builds && data.builds.length > 0 ? data.builds.map((b: any, index: number) => ({
    name: `#${index + 1} - ${b.name || 'Build de la Comunidad'}`,
    value: `Código: \`${b.share_code}\`\nVotos: ${b.upvotes} 🔥`,
    inline: false
  })) : [{ name: "Sin resultados", value: "No hay builds registradas para esta arma en la temporada actual.", inline: false }];

  // Usar categoría e imagen reales devueltas por la API, o fallback a los datos locales
  const category = data.category || weapon.category || "Desconocido";
  const imageUrl = data.image_url || weapon.image_url;

  // Agregar estadísticas oficiales base si existen, de lo contrario usar promedios
  if (data.base_stats) {
    fields.unshift({
      name: "Estadísticas Base Oficiales",
      value: `Daño: **${data.base_stats.damage}** | Control: **${data.base_stats.control}** | Estabilidad: **${data.base_stats.stability}**\nPrecisión: **${data.base_stats.accuracy}** | Alcance: **${data.base_stats.range}** | Cadencia: **${data.base_stats.fire_rate} RPM**`,
      inline: false
    });
  } else if (data.stats) {
    fields.unshift({
      name: "Atributos Promedio (Comunidad)",
      value: `Daño: **${data.stats.avg_damage}** | Control: **${data.stats.avg_control}** | Estabilidad: **${data.stats.avg_stability}** | Cadencia: **${data.stats.avg_fire_rate} RPM**`,
      inline: false
    });
  }

  return {
    content: "",
    embeds: [
      {
        title: `⚡ ESTADÍSTICAS: ${data.weapon_name || weapon.weapon_name}`,
        description: `Las mejores builds para la temporada actual. Categoría: **${category}**.`,
        color: 16738560, // Naranja KoreStats
        thumbnail: imageUrl ? { url: imageUrl } : undefined,
        fields: fields,
        footer: {
          text: "KoreStats.com - Delta Force: Hawk Ops",
          icon_url: "https://korestats.com/favicon.ico"
        }
      }
    ],
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 1, // Primary (Blurple)
            custom_id: `build_top_voted_${weapon.id}`,
            label: "🔥 Top 3 Más Votadas"
          },
          {
            type: 2, // Button
            style: 2, // Secondary (Grey)
            custom_id: `build_top_used_${weapon.id}`,
            label: "📈 Top 3 Más Usadas"
          },
          {
            type: 2, // Button
            style: 5, // Link (Grey)
            url: "https://korestats.com/games/delta-force/weapons",
            label: "Ver en la Web"
          }
        ]
      }
    ]
  };
}
