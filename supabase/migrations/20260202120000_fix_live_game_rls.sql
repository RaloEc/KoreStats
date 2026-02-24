-- Create table if not exists (to be safe)
CREATE TABLE IF NOT EXISTS public.live_game_states (
    id text PRIMARY KEY,
    data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_game_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Public read access" ON public.live_game_states;
DROP POLICY IF EXISTS "Public write access" ON public.live_game_states;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.live_game_states;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.live_game_states;
DROP POLICY IF EXISTS "Enable update for all users" ON public.live_game_states;

-- Create Public Read Policy
CREATE POLICY "Public read access"
ON public.live_game_states
FOR SELECT
USING (true);

-- Create Public Write Policy (Allowing all ops for now to ensure desktop app can push data)
CREATE POLICY "Public write access"
ON public.live_game_states
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_game_states;
