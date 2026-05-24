-- Migración: Ajustar comportamiento de borrado en claves foráneas de calibre
-- Permite eliminar calibres de forma segura:
-- 1. Quitando la restricción NOT NULL de 'caliber' en delta_force_weapons_base para que pueda ser nula
-- 2. Configurando 'ON DELETE SET NULL' en delta_force_weapons_base para desvincular armas en lugar de borrarlas
-- 3. Configurando 'ON DELETE CASCADE' en delta_force_ammo para borrar automáticamente las municiones del calibre

-- 1. Modificar columna caliber en delta_force_weapons_base para que permita valores NULL
ALTER TABLE public.delta_force_weapons_base 
ALTER COLUMN caliber DROP NOT NULL;

-- 2. Eliminar las restricciones de clave foránea existentes si existen
ALTER TABLE public.delta_force_weapons_base 
DROP CONSTRAINT IF EXISTS fk_delta_force_weapons_base_caliber;

ALTER TABLE public.delta_force_ammo 
DROP CONSTRAINT IF EXISTS fk_delta_force_ammo_caliber;

-- 3. Recrear restricciones con el comportamiento de borrado adecuado
-- Para Armas Base: Poner a NULL el calibre del arma si el calibre es eliminado
ALTER TABLE public.delta_force_weapons_base
ADD CONSTRAINT fk_delta_force_weapons_base_caliber
FOREIGN KEY (caliber) REFERENCES public.delta_force_calibers(name)
ON UPDATE CASCADE ON DELETE SET NULL;

-- Para Municiones: Eliminar las balas en cascada si el calibre es eliminado
ALTER TABLE public.delta_force_ammo
ADD CONSTRAINT fk_delta_force_ammo_caliber
FOREIGN KEY (caliber) REFERENCES public.delta_force_calibers(name)
ON UPDATE CASCADE ON DELETE CASCADE;
