// Script de depuración para verificar el cálculo de session-stats

function getStartOfDayUtcMsForOffset(now, tzOffsetMinutes) {
  const shiftedMs = now.getTime() - tzOffsetMinutes * 60_000;
  const shiftedDate = new Date(shiftedMs);
  const startShiftedUtcMs = Date.UTC(
    shiftedDate.getUTCFullYear(),
    shiftedDate.getUTCMonth(),
    shiftedDate.getUTCDate(),
    0,
    0,
    0,
    0
  );
  return startShiftedUtcMs + tzOffsetMinutes * 60_000;
}

// Simular la hora actual
const now = new Date('2025-12-15T05:10:11-05:00');
console.log('Hora actual:', now.toISOString());
console.log('Hora actual (ms):', now.getTime());

// Obtener el offset de la zona horaria (Ecuador es UTC-5, que son +300 minutos)
const tzOffsetMinutes = now.getTimezoneOffset();
console.log('Timezone offset (minutos):', tzOffsetMinutes);

// Calcular el inicio del día
const todayStartMs = getStartOfDayUtcMsForOffset(now, tzOffsetMinutes);
console.log('Inicio del día (ms):', todayStartMs);
console.log('Inicio del día (ISO):', new Date(todayStartMs).toISOString());

// Simular algunas partidas jugadas hoy
const partidasHoy = [
  { gameCreation: new Date('2025-12-15T03:00:00-05:00').getTime(), descripcion: 'Partida 1 - 3:00 AM' },
  { gameCreation: new Date('2025-12-15T04:30:00-05:00').getTime(), descripcion: 'Partida 2 - 4:30 AM' },
  { gameCreation: new Date('2025-12-15T05:00:00-05:00').getTime(), descripcion: 'Partida 3 - 5:00 AM' },
  { gameCreation: new Date('2025-12-14T23:00:00-05:00').getTime(), descripcion: 'Partida de ayer - 11:00 PM' },
];

console.log('\n--- Verificando partidas ---');
partidasHoy.forEach(partida => {
  const esDeHoy = partida.gameCreation >= todayStartMs;
  console.log(`${partida.descripcion}:`);
  console.log(`  game_creation: ${partida.gameCreation}`);
  console.log(`  Fecha: ${new Date(partida.gameCreation).toISOString()}`);
  console.log(`  ¿Es de hoy? ${esDeHoy ? 'SÍ' : 'NO'}`);
  console.log(`  Diferencia con inicio del día: ${partida.gameCreation - todayStartMs} ms`);
  console.log('');
});
