import Fuse from 'fuse.js';
import { baseWeapons } from './weapons-data';

export async function handleBuildCommand(interaction: any) {
  try {
    const options = interaction.data.options;
    if (!options || options.length === 0) {
      await patchDiscordMessage(interaction.token, { content: "Debes especificar el nombre de un arma." });
      return;
    }

    const query = options[0].value;
    
    // 1. Fuzzy Search en Memoria
    const fuse = new Fuse(baseWeapons, { keys: ['weapon_name', 'category'], threshold: 0.4 });
    const searchResult = fuse.search(query);
    
    if (searchResult.length === 0) {
      await patchDiscordMessage(interaction.token, { content: `No encontré el arma "${query}". Revisa que esté bien escrita.` });
      return;
    }
    
    const weapon = searchResult[0].item;
    
    // 2. Fetch a la API de Next.js de KoreStats
    const response = await fetch(`https://korestats.com/api/discord/builds?base_weapon_id=${weapon.id}&limit=3`, {
      headers: {
        'Authorization': `Bearer ${process.env.KORESTATS_BOT_PAT}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      await patchDiscordMessage(interaction.token, { content: "Error al comunicarse con la base de datos de KoreStats." });
      return;
    }

    const data = await response.json();
    
    // 3. Crear el JSON Payload del Embed
    const embedPayload = generateEmbedPayload(weapon, data);
    
    // 4. Actualizar (PATCH) el mensaje diferido en Discord
    await patchDiscordMessage(interaction.token, embedPayload);
    
  } catch (error) {
    console.error("Error en handleBuildCommand:", error);
    await patchDiscordMessage(interaction.token, { content: "Ocurrió un error consultando las estadísticas. Intenta más tarde." });
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
        await patchDiscordMessage(interaction.token, { content: "Error al actualizar las builds." });
        return;
      }
  
      const data = await response.json();
      const weapon = baseWeapons.find(w => w.id === weaponId) || { weapon_name: 'Arma', category: 'Desconocido', image_url: '' };
      
      const embedPayload = generateEmbedPayload(weapon, data);
      await patchDiscordMessage(interaction.token, embedPayload);
    } else if (customId === 'link_account') {
       await patchDiscordMessage(interaction.token, { content: "La funcionalidad de vincular cuenta estará disponible muy pronto." });
    }
  } catch (error) {
    console.error("Error en handleInteractionButton:", error);
    await patchDiscordMessage(interaction.token, { content: "Ocurrió un error al procesar el botón." });
  }
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

  // Agregar estadísticas promedio si las hay
  if (data.stats) {
    fields.unshift({
      name: "Atributos Promedio",
      value: `Daño: ${generateProgressBar(data.stats.avg_damage)}\nControl: ${generateProgressBar(data.stats.avg_control)}\nCadencia: ${data.stats.avg_fire_rate} RPM\nEstabilidad: ${generateProgressBar(data.stats.avg_stability)}`,
      inline: false
    });
  }

  return {
    content: "",
    embeds: [
      {
        title: `⚡ ESTADÍSTICAS: ${weapon.weapon_name}`,
        description: `Las mejores builds para la temporada actual. Categoría: **${weapon.category}**.`,
        color: 16738560, // Naranja KoreStats
        thumbnail: weapon.image_url ? { url: weapon.image_url } : undefined,
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
            url: "https://korestats.com/juegos/delta-force/weapons",
            label: "Ver en la Web"
          }
        ]
      }
    ]
  };
}
