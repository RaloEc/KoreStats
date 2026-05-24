import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

// One-time migration endpoint — creates the delta force base tables
// ONLY call this once via: curl http://localhost:3000/api/games/delta-force/migrate
export async function GET(req: NextRequest) {
    try {
        const db = getServiceClient();

        const statements = [
            `CREATE TABLE IF NOT EXISTS public.delta_force_weapons_base (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                weapon_name TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                caliber TEXT NOT NULL,
                base_damage INTEGER NOT NULL DEFAULT 0,
                base_fire_rate INTEGER NOT NULL DEFAULT 0,
                base_control INTEGER NOT NULL DEFAULT 0,
                base_handling INTEGER NOT NULL DEFAULT 0,
                base_stability INTEGER NOT NULL DEFAULT 0,
                base_accuracy INTEGER NOT NULL DEFAULT 0,
                base_range INTEGER NOT NULL DEFAULT 0,
                base_capacity INTEGER NOT NULL DEFAULT 0,
                base_muzzle_velocity INTEGER NOT NULL DEFAULT 0,
                image_url TEXT,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS public.delta_force_ammo (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                caliber TEXT NOT NULL,
                tier INTEGER NOT NULL DEFAULT 1,
                penetration INTEGER NOT NULL DEFAULT 0,
                damage INTEGER NOT NULL DEFAULT 0,
                armor_damage INTEGER NOT NULL DEFAULT 0,
                bullet_speed INTEGER NOT NULL DEFAULT 0,
                image_url TEXT,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT unique_caliber_ammo_name UNIQUE (caliber, name)
            )`,
            `CREATE TABLE IF NOT EXISTS public.delta_force_gear (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL DEFAULT 'armor',
                tier INTEGER NOT NULL DEFAULT 1,
                max_durability INTEGER NOT NULL DEFAULT 0,
                material TEXT NOT NULL DEFAULT 'Cerámica',
                speed_penalty DOUBLE PRECISION DEFAULT 0.0,
                ergo_penalty DOUBLE PRECISION DEFAULT 0.0,
                zones_protected TEXT[],
                image_url TEXT,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
            )`,
            `ALTER TABLE public.delta_force_gear ADD COLUMN IF NOT EXISTS repair_efficiency TEXT DEFAULT 'medio' CHECK (repair_efficiency IN ('bajo', 'medio', 'alto'))`,
            `ALTER TABLE public.delta_force_gear ADD COLUMN IF NOT EXISTS durability_cost TEXT DEFAULT 'medio' CHECK (durability_cost IN ('bajo', 'medio', 'alto'))`,
            `ALTER TABLE public.delta_force_gear ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION DEFAULT 0.0`,
            `ALTER TABLE public.delta_force_gear ADD COLUMN IF NOT EXISTS description TEXT`,
            `ALTER TABLE public.delta_force_weapons_base ENABLE ROW LEVEL SECURITY`,
            `ALTER TABLE public.delta_force_ammo ENABLE ROW LEVEL SECURITY`,
            `ALTER TABLE public.delta_force_gear ENABLE ROW LEVEL SECURITY`,
            `DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delta_force_weapons_base' AND policyname = 'public_read_weapons_base') THEN
                    CREATE POLICY "public_read_weapons_base" ON public.delta_force_weapons_base FOR SELECT USING (true);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delta_force_weapons_base' AND policyname = 'admin_write_weapons_base') THEN
                    CREATE POLICY "admin_write_weapons_base" ON public.delta_force_weapons_base FOR ALL USING (auth.uid() = 'e339f62b-d7d6-4414-9873-b207d1bf6b2d'::uuid);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delta_force_ammo' AND policyname = 'public_read_ammo') THEN
                    CREATE POLICY "public_read_ammo" ON public.delta_force_ammo FOR SELECT USING (true);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delta_force_ammo' AND policyname = 'admin_write_ammo') THEN
                    CREATE POLICY "admin_write_ammo" ON public.delta_force_ammo FOR ALL USING (auth.uid() = 'e339f62b-d7d6-4414-9873-b207d1bf6b2d'::uuid);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delta_force_gear' AND policyname = 'public_read_gear') THEN
                    CREATE POLICY "public_read_gear" ON public.delta_force_gear FOR SELECT USING (true);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delta_force_gear' AND policyname = 'admin_write_gear') THEN
                    CREATE POLICY "admin_write_gear" ON public.delta_force_gear FOR ALL USING (auth.uid() = 'e339f62b-d7d6-4414-9873-b207d1bf6b2d'::uuid);
                END IF;
            END $$`,
        ];

        const results: { sql: string; ok: boolean; error?: string }[] = [];

        for (const sql of statements) {
            let error = null;
            try {
                const res = await db.rpc("exec_sql", { query: sql });
                if (res.error) error = res.error;
            } catch (err: any) {
                error = { message: err?.message || "rpc not available" };
            }
            // Try direct approach via from() if rpc fails
            const shortSql = sql.trim().slice(0, 60).replace(/\n/g, " ");
            if (error) {
                results.push({ sql: shortSql, ok: false, error: error.message });
            } else {
                results.push({ sql: shortSql, ok: true });
            }
        }

        // Try verifying tables exist
        const { data: tables } = await db
            .from("information_schema.tables")
            .select("table_name")
            .eq("table_schema", "public")
            .in("table_name", ["delta_force_weapons_base", "delta_force_ammo", "delta_force_gear"]);

        return NextResponse.json({ results, tables_found: tables });
    } catch (err: any) {
        console.error("[migrate] Error:", err?.message);
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
