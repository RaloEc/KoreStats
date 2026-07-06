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
  
  // Decodificar el body (Netlify a veces lo codifica en base64)
  const rawBodyStr = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;

  if (!signature || !timestamp || !rawBodyStr) {
    console.error("[discord-bot] Faltan headers:", { sig: !!signature, ts: !!timestamp, body: !!rawBodyStr });
    return { statusCode: 401, body: 'Missing signature headers' };
  }

  // 2. Validación criptográfica Ed25519
  // verifyKey necesita el body como Buffer para la verificación correcta
  const publicKey = process.env.DISCORD_PUBLIC_KEY || '';
  if (!publicKey) {
    console.error("[discord-bot] DISCORD_PUBLIC_KEY no está definida en las variables de entorno.");
    return { statusCode: 500, body: 'Server misconfiguration' };
  }

  let isValidRequest = false;
  try {
    isValidRequest = await verifyKey(Buffer.from(rawBodyStr), signature, timestamp, publicKey);
  } catch (e) {
    console.error("[discord-bot] Excepción durante verifyKey:", e);
    return { statusCode: 401, body: 'Signature verification failed' };
  }

  if (!isValidRequest) {
    console.error("[discord-bot] Firma inválida. PublicKey configurada (primeros 10 chars):", publicKey.slice(0, 10));
    return { statusCode: 401, body: 'Bad request signature' };
  }


  let interaction;
  try {
    interaction = JSON.parse(rawBodyStr);
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
