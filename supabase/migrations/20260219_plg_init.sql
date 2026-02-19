-- ===========================================
-- PLG TRANSFORMATION MIGRATION (2026-02-19)
-- ===========================================

-- 1. Create COMPANIES Table (B2B)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    theme JSONB DEFAULT '{"primary": "#0F172A", "accent": "#3B82F6"}'::jsonb,
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Main admin for this company
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS: Public read for company data (needed for profiles linked to it)
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
CREATE POLICY "Companies are viewable by everyone" ON public.companies
    FOR SELECT USING (TRUE);

-- RLS: Only internal admins or specific logic can insert/update (for now, open for initial setup or restrict)
-- For MVP, strictly restricting to manual DB inserts or future Super Admin panel
-- We will allow authenticated users to see it if they are linked, but for now Public is fine for Logo/Name.

-- 2. Update PROFILES Table
-- Add Tiering and Classification columns
DO $$ 
BEGIN 
    -- Create ENUM types if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_tier') THEN
        CREATE TYPE user_tier AS ENUM ('FREE', 'PREMIUM', 'B2B');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_tag') THEN
        CREATE TYPE user_tag AS ENUM ('GIFT', 'DEMO', 'INTERNAL');
    END IF;
END $$;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tier user_tier DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS user_tag user_tag DEFAULT NULL,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subscription_valid_until TIMESTAMPTZ;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- 3. Update SERIAL_NUMBERS Table (Logic for One-to-Many & Downgrade)
-- Ensure Sync Control
ALTER TABLE public.serial_numbers
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 4. Create trigger to update Company updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. FUNCTION: get_profile_tier (Database level helper, optional but good for RLS)
-- For now we handle logic in API, but keeping RLS simple.
