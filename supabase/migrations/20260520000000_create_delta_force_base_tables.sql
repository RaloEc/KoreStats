-- Migración: Crear tablas base para Delta Force: Hawk Ops (Armas, Munición y Equipamiento)

-- 1. Tabla de Armas Oficiales (Estadísticas Base)
CREATE TABLE IF NOT EXISTS public.delta_force_weapons_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weapon_name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    caliber TEXT NOT NULL,
    base_damage INTEGER NOT NULL,
    base_fire_rate INTEGER NOT NULL,
    base_control INTEGER NOT NULL,
    base_handling INTEGER NOT NULL,
    base_stability INTEGER NOT NULL,
    base_accuracy INTEGER NOT NULL,
    base_range INTEGER NOT NULL,
    base_capacity INTEGER NOT NULL,
    base_muzzle_velocity INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Municiones
CREATE TABLE IF NOT EXISTS public.delta_force_ammo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    caliber TEXT NOT NULL,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 6),
    penetration INTEGER NOT NULL,
    damage INTEGER NOT NULL,
    armor_damage INTEGER NOT NULL,
    bullet_speed INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_caliber_ammo_name UNIQUE (caliber, name)
);

-- 3. Tabla de Equipamiento de Protección (Cascos y Chalecos)
CREATE TABLE IF NOT EXISTS public.delta_force_gear (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('helmet', 'armor')),
    tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 6),
    max_durability INTEGER NOT NULL,
    material TEXT NOT NULL,
    speed_penalty DOUBLE PRECISION DEFAULT 0.0,
    ergo_penalty DOUBLE PRECISION DEFAULT 0.0,
    zones_protected TEXT[], -- Para cascos
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE public.delta_force_weapons_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_force_ammo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delta_force_gear ENABLE ROW LEVEL SECURITY;

-- Crear políticas de lectura pública y escritura administrativa para delta_force_weapons_base
CREATE POLICY "Permitir lectura pública de armas base" ON public.delta_force_weapons_base
    FOR SELECT USING (true);

CREATE POLICY "Permitir gestión a administradores en armas base" ON public.delta_force_weapons_base
    FOR ALL USING (auth.uid() = 'e339f62b-d7d6-4414-9873-b207d1bf6b2d'::uuid);

-- Crear políticas de lectura pública y escritura administrativa para delta_force_ammo
CREATE POLICY "Permitir lectura pública de munición" ON public.delta_force_ammo
    FOR SELECT USING (true);

CREATE POLICY "Permitir gestión a administradores en munición" ON public.delta_force_ammo
    FOR ALL USING (auth.uid() = 'e339f62b-d7d6-4414-9873-b207d1bf6b2d'::uuid);

-- Crear políticas de lectura pública y escritura administrativa para delta_force_gear
CREATE POLICY "Permitir lectura pública de equipamiento" ON public.delta_force_gear
    FOR SELECT USING (true);

CREATE POLICY "Permitir gestión a administradores en equipamiento" ON public.delta_force_gear
    FOR ALL USING (auth.uid() = 'e339f62b-d7d6-4414-9873-b207d1bf6b2d'::uuid);
