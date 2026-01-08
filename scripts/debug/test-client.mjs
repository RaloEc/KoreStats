// Script para probar la creación de instancias de Supabase
// Usamos .mjs para poder usar import/export
import { createClient, createNonPersistentClient } from './src/lib/supabase/client.ts';

console.log('Creando múltiples instancias de cliente para probar el patrón singleton:');

// Crear múltiples instancias del cliente normal
const client1 = createClient();
const client2 = createClient();
const client3 = createClient();

// Crear múltiples instancias del cliente sin persistencia
const nonPersistentClient1 = createNonPersistentClient();
const nonPersistentClient2 = createNonPersistentClient();

// Verificar si son la misma instancia
console.log('¿client1 === client2?', client1 === client2);
console.log('¿client2 === client3?', client2 === client3);
console.log('¿nonPersistentClient1 === nonPersistentClient2?', nonPersistentClient1 === nonPersistentClient2);

console.log('Prueba completada.');
