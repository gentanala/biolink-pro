-- Create tier_configs table
CREATE TABLE IF NOT EXISTS public.tier_configs (
    tier user_tier PRIMARY KEY,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tier_configs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow public read-only access (so the app can check features for any user)
DROP POLICY IF EXISTS "Allow public read-only access" ON public.tier_configs;
CREATE POLICY "Allow public read-only access" ON public.tier_configs FOR SELECT USING (true);

-- Allow update (restricted to logic, but for now enable for admin panel usage)
DROP POLICY IF EXISTS "Allow admin update" ON public.tier_configs;
CREATE POLICY "Allow read access to all authenticated users"
ON public.tier_configs FOR SELECT
TO authenticated
USING (true);

-- Allow admins to update (modify query for your specific admin logic)
CREATE POLICY "Allow update access to admins"
ON public.tier_configs FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Seed Defaults based on "Perbandingan Fitur Gentanala (Final Plan)"
INSERT INTO public.tier_configs (tier, features) VALUES
('FREE', '{
    "basic_features": true,
    "social_impact": true,
    "ai_content": false,
    "ai_bot": false,
    "analytics_leads": false,
    "sync": false,
    "custom_branding": false,
    "company_dashboard": false,
    "asset_management": false
}'::jsonb),
('PREMIUM', '{
    "basic_features": true,
    "social_impact": true,
    "ai_content": true,
    "ai_bot": true,
    "analytics_leads": true,
    "sync": true,
    "custom_branding": false,
    "company_dashboard": false,
    "asset_management": false
}'::jsonb),
('B2B', '{
    "basic_features": true,
    "social_impact": true,
    "ai_content": true,
    "ai_bot": true,
    "analytics_leads": true,
    "sync": true,
    "custom_branding": true,
    "company_dashboard": true,
    "asset_management": true
}'::jsonb)
ON CONFLICT (tier) DO UPDATE
SET features = EXCLUDED.features,
    updated_at = NOW();
