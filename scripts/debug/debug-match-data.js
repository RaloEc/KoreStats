// Script temporal para verificar la estructura de datos de la API de Riot
// Ejecutar con: node debug-match-data.js

const matchId = "LA1_1669358885";

async function checkMatchStructure() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Obtener el full_json de la partida
    const { data: match, error } = await supabase
      .from('matches')
      .select('full_json')
      .eq('match_id', matchId)
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (!match?.full_json?.info?.participants?.[0]) {
      console.error('No hay datos de participantes');
      return;
    }

    const firstParticipant = match.full_json.info.participants[0];
    
    console.log('\n=== ESTRUCTURA DE PARTICIPANTE ===\n');
    console.log('Campos disponibles:', Object.keys(firstParticipant));
    
    console.log('\n=== SUMMONER NAME ===');
    console.log('summonerName:', firstParticipant.summonerName);
    console.log('riotIdGameName:', firstParticipant.riotIdGameName);
    console.log('riotIdTagLine:', firstParticipant.riotIdTagLine);
    
    console.log('\n=== PERKS ===');
    console.log('perkPrimaryStyle:', firstParticipant.perkPrimaryStyle);
    console.log('perkSubStyle:', firstParticipant.perkSubStyle);
    console.log('perks:', JSON.stringify(firstParticipant.perks, null, 2));
    
    console.log('\n=== PRIMER PARTICIPANTE COMPLETO ===');
    console.log(JSON.stringify(firstParticipant, null, 2));

  } catch (err) {
    console.error('Error:', err);
  }
}

checkMatchStructure();
