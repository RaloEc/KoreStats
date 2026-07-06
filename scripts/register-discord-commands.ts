/**
 * Script para registrar los comandos globales de Discord.
 * Este script se ejecuta de forma aislada, no forma parte del bot en sí.
 * Uso: npx ts-node scripts/register-discord-commands.ts
 */

import { config } from 'dotenv';
// Intentar cargar .env.local para variables locales
config({ path: '.env.local' });

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !BOT_TOKEN) {
  console.error("❌ Faltan DISCORD_APP_ID o DISCORD_BOT_TOKEN en las variables de entorno.");
  process.exit(1);
}

const commands = [
  {
    name: 'build',
    description: 'Busca las mejores builds para un arma de Delta Force',
    type: 1, // CHAT_INPUT
    options: [
      {
        name: 'arma',
        description: 'Nombre del arma (ej. SCAR-H, m4a1, deagle)',
        type: 3, // STRING
        required: true,
      }
    ]
  }
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  try {
    console.log("Registrando comandos (globalmente)...");
    const response = await fetch(url, {
      method: 'PUT', // PUT sobrescribe la lista entera de comandos
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ¡Éxito! Se registraron ${data.length} comandos.`);
    } else {
      const err = await response.text();
      console.error(`❌ Error al registrar comandos: ${response.status} ${response.statusText}`);
      console.error(err);
    }
  } catch (e) {
    console.error("❌ Excepción al registrar:", e);
  }
}

registerCommands();
