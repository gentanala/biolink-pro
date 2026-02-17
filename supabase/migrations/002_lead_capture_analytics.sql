-- =============================================
-- MIGRATION: Lead Capture & Analytics Feature
-- =============================================
-- This migration adds lead capture and analytics functionality
-- to the Gentanala biolink platform.

-- 1. ADD lead_capture_enabled TO profiles TABLE
-- =============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lead_capture_enabled BOOLEAN DEFAULT FALSE;

-- 2. CREATE leads TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    whatsapp TEXT,
    company TEXT,
    
    -- Indexes for better query performance
    CONSTRAINT leads_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for faster lookups by profile
CREATE INDEX IF NOT EXISTS idx_leads_profile_id ON public.leads(profile_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 3. CREATE analytics TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
    meta JSONB DEFAULT '{}'::jsonb,
    
    -- Useful for tracking specific events
    CONSTRAINT analytics_event_type_check CHECK (event_type IN ('view', 'click'))
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_profile_id ON public.analytics(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics(event_type);

-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR leads TABLE
-- =============================================
-- Users can only view leads for their own profiles
DROP POLICY IF EXISTS \"Users can view own leads\" ON public.leads;
CREATE POLICY \"Users can view own leads\" ON public.leads
    FOR SELECT 
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Users can insert leads for any profile (public lead capture)
DROP POLICY IF EXISTS \"Anyone can create leads\" ON public.leads;
CREATE POLICY \"Anyone can create leads\" ON public.leads
    FOR INSERT 
    WITH CHECK (true);

-- Users can delete their own leads
DROP POLICY IF EXISTS \"Users can delete own leads\" ON public.leads;
CREATE POLICY \"Users can delete own leads\" ON public.leads
    FOR DELETE 
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- 6. RLS POLICIES FOR analytics TABLE
-- =============================================
-- Users can only view analytics for their own profiles
DROP POLICY IF EXISTS \"Users can view own analytics\" ON public.analytics;
CREATE POLICY \"Users can view own analytics\" ON public.analytics
    FOR SELECT 
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Anyone can insert analytics events (public tracking)
DROP POLICY IF EXISTS \"Anyone can create analytics\" ON public.analytics;
CREATE POLICY \"Anyone can create analytics\" ON public.analytics
    FOR INSERT 
    WITH CHECK (true);

-- Users can delete their own analytics
DROP POLICY IF EXISTS \"Users can delete own analytics\" ON public.analytics;
CREATE POLICY \"Users can delete own analytics\" ON public.analytics
    FOR DELETE 
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- 7. HELPER FUNCTIONS (Optional but useful)
-- =============================================

-- Function to get lead count for a profile
CREATE OR REPLACE FUNCTION get_lead_count(p_profile_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.leads WHERE profile_id = p_profile_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics summary for a profile
CREATE OR REPLACE FUNCTION get_analytics_summary(p_profile_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_views BIGINT,
    total_clicks BIGINT,
    unique_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE event_type = 'view') as total_views,
        COUNT(*) FILTER (WHERE event_type = 'click') as total_clicks,
        COUNT(DISTINCT DATE(created_at)) as unique_days
    FROM public.analytics
    WHERE profile_id = p_profile_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- To apply this migration:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
