import { verifyKey } from 'discord-interactions';
import { handleBuildCommand, handleInteractionButton } from './command-build';

export const handler = async (event: any) => {
  // Solo aceptamos POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 1. Extraer Headers de Discord
  const signature = event.headers['x-signature-ed25519'];
  const timestamp = event.headers['x-signature-timestamp'];
  
  // En Netlify, a veces el body viene codificado en Base64. Debemos decodificarlo.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;

  if (!signature || !timestamp || !rawBody) {
    console.error("Faltan firmas o body en la petición:", { signature: !!signature, timestamp: !!timestamp, body: !!rawBody });
    return { statusCode: 401, body: 'Missing signature headers' };
  }

  // 2. Validación criptográfica de Discord (Ed25519)
  const publicKey = process.env.DISCORD_PUBLIC_KEY || '';
  const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);
  if (!isValidRequest) {
    console.error("Firma criptográfica inválida. Verifica que DISCORD_PUBLIC_KEY en Netlify sea correcta.");
    return { statusCode: 401, body: 'Bad request signature' };
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch (e) {
    return { statusCode: 400, body: 'Bad request body' };
  }

  // 3. Manejo de Ping de validación de Discord
  if (interaction.type === 1) { // PING
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 1 }) // PONG
    };
  }

  // 4. Manejo del Comando (Interacción)
  if (interaction.type === 2) { // APPLICATION_COMMAND
    if (interaction.data.name === 'build') {
      
      handleBuildCommand(interaction).catch(console.error);
      
      // 5. DEFERRED RESPONSE (Regla de los 3 segundos)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        }),
      };
    }
  }

  // Manejo de interacciones de componentes de mensaje (Botones)
  if (interaction.type === 3) { // MESSAGE_COMPONENT
    handleInteractionButton(interaction).catch(console.error);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 6, // DEFERRED_UPDATE_MESSAGE
      }),
    };
  }

  // Fallback
  return { statusCode: 400, body: 'Unknown Interaction' };
};
