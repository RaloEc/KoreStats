-- Create social_reports table
CREATE TABLE IF NOT EXISTS public.social_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('post', 'comment')),
    content_id UUID NOT NULL,
    reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_reports_reporter_id ON public.social_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_social_reports_reported_user_id ON public.social_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_social_reports_status ON public.social_reports(status);
CREATE INDEX IF NOT EXISTS idx_social_reports_content_id ON public.social_reports(content_id);

-- Enable RLS
ALTER TABLE public.social_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create reports" ON public.social_reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.social_reports
    FOR SELECT TO authenticated
    USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON public.social_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admins can update reports" ON public.social_reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );
