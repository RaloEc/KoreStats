-- Añadir columna role_names a la tabla clans
-- Archivo: 20260527010000_add_role_names_to_clans.sql

ALTER TABLE clans 
ADD COLUMN IF NOT EXISTS role_names JSONB 
DEFAULT '{"leader": "Líder", "officer": "Oficial", "member": "Miembro"}'::jsonb NOT NULL;
