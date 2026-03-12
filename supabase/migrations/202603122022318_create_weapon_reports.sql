CREATE TYPE weapon_report_status AS ENUM ('pending', 'resolved', 'dismissed');
CREATE TYPE weapon_report_reason AS ENUM ('inappropriate_name', 'fake_code', 'wrong_stats', 'other');

CREATE TABLE IF NOT EXISTS public.weapon_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  weapon_stats_record_id uuid REFERENCES public.weapon_stats_records(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reason weapon_report_reason NOT NULL,
  details text,
  status weapon_report_status DEFAULT 'pending',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at timestamptz
);

-- Enable RLS
ALTER TABLE public.weapon_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create reports"
  ON public.weapon_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view and manage all reports"
  ON public.weapon_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin'
    )
  );
