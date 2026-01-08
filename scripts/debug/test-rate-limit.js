/**
 * Script para verificar los rate limits de la API de Riot
 * Ejecutar con: node test-rate-limit.js
 */

const RIOT_API_KEY = process.env.RIOT_API_KEY || 'TU_API_KEY_AQUI';
const TEST_PUUID = 'PUUID_DE_PRUEBA'; // Reemplazar con un PUUID real
const PLATFORM_REGION = 'la1'; // o la región que uses

async function checkRateLimits() {
  const url = `https://${PLATFORM_REGION}.api.riotgames.com/lol/league/v4/entries/by-puuid/${TEST_PUUID}`;
  
  console.log('🔍 Consultando:', url);
  console.log('');

  try {
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY,
      },
    });

    console.log('📊 Status:', response.status, response.statusText);
    console.log('');
    console.log('📋 Rate Limit Headers:');
    console.log('─────────────────────────────────────');
    
    // Headers de rate limit
    const headers = {
      'App Rate Limit': response.headers.get('X-App-Rate-Limit'),
      'App Rate Limit Count': response.headers.get('X-App-Rate-Limit-Count'),
      'Method Rate Limit': response.headers.get('X-Method-Rate-Limit'),
      'Method Rate Limit Count': response.headers.get('X-Method-Rate-Limit-Count'),
      'Rate Limit Type': response.headers.get('X-Rate-Limit-Type'),
    };

    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        console.log(`${key}: ${value}`);
      }
    }

    console.log('');
    console.log('📖 Interpretación:');
    console.log('─────────────────────────────────────');
    
    const appLimit = headers['App Rate Limit'];
    const appCount = headers['App Rate Limit Count'];
    
    if (appLimit && appCount) {
      const [limit1s, limit2m] = appLimit.split(',');
      const [count1s, count2m] = appCount.split(',');
      
      console.log(`• Límite por segundo: ${count1s} / ${limit1s}`);
      console.log(`• Límite cada 2 minutos: ${count2m} / ${limit2m}`);
    }

    if (response.ok) {
      const data = await response.json();
      console.log('');
      console.log('✅ Datos recibidos:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('');
      console.log('❌ Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Error en la petición:', error.message);
  }
}

checkRateLimits();
