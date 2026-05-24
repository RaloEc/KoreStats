-- Elimina la restricción única que aplicaba solo al nombre
ALTER TABLE delta_force_ammo DROP CONSTRAINT IF EXISTS delta_force_ammo_name_key;

-- Agrega una nueva restricción única compuesta por nombre y calibre
ALTER TABLE delta_force_ammo ADD CONSTRAINT delta_force_ammo_name_caliber_key UNIQUE (name, caliber);
