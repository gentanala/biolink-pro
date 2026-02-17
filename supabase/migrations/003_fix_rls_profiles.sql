-- =============================================
-- MIGRATION: Fix RLS Policies for Profiles
-- =============================================

-- 1. Ensure lead_capture_enabled column exists (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lead_capture_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN lead_capture_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICY FOR UPDATE ON profiles
-- Allow users to update their own profile rows
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. RLS POLICY FOR SELECT ON profiles (Just in case it's missing)
-- Allow users to view their own profile rows
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow public access to view profiles by slug (needed for public profile page)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT
    USING (true);
