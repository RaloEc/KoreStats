-- Migración: Crear tabla de calibres y establecer relaciones de clave foránea

-- 1. Crear la tabla de calibres
CREATE TABLE IF NOT EXISTS public.delta_force_calibers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Poblar la tabla con calibres únicos existentes en armas y municiones
INSERT INTO public.delta_force_calibers (name)
SELECT DISTINCT caliber FROM (
    SELECT caliber FROM public.delta_force_weapons_base
    UNION
    SELECT caliber FROM public.delta_force_ammo
) AS t
WHERE caliber IS NOT NULL AND caliber <> ''
ON CONFLICT (name) DO NOTHING;

-- 3. Añadir restricciones de clave foránea (FK)
-- Primero nos aseguramos de que no haya calibres vacíos o nulos que impidan la restricción
ALTER TABLE public.delta_force_weapons_base
ADD CONSTRAINT fk_delta_force_weapons_base_caliber
FOREIGN KEY (caliber) REFERENCES public.delta_force_calibers(name)
ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.delta_force_ammo
ADD CONSTRAINT fk_delta_force_ammo_caliber
FOREIGN KEY (caliber) REFERENCES public.delta_force_calibers(name)
ON UPDATE CASCADE ON DELETE RESTRICT;

-- 4. Habilitar RLS en la nueva tabla
ALTER TABLE public.delta_force_calibers ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de lectura pública y escritura administrativa para delta_force_calibers
CREATE POLICY "Permitir lectura pública de calibres" ON public.delta_force_calibers
    FOR SELECT USING (true);

CREATE POLICY "Permitir gestión a administradores en calibres" ON public.delta_force_calibers
    FOR ALL USING (auth.uid() = 'e339f62b-d7d6-4414-9873-b207d1bf6b2d'::uuid);
