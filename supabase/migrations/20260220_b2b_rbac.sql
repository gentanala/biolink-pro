-- ===========================================
-- B2B RBAC ENHANCEMENT MIGRATION (2026-02-20)
-- ===========================================

-- 1. Create Role Enum
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'user');
    END IF;
END $$;

-- 2. Add Role Column to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Set existing Gentanala Admins to super_admin manually via dashboard or query later.
-- e.g., UPDATE public.profiles SET role = 'super_admin' WHERE email = 'admin@gentanala.com';

-- 3. Update Row Level Security (RLS) for PROFILES
-- We will replace the existing profiles RLS to incorporate B2B logic

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view public profiles via standard query (usually for dynamic page routing)
-- Note: Assuming there's a viewable policy already, or we keep it open for SELECT.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (TRUE);

-- Policy 2: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy 3: Super Admins can update any profile
DROP POLICY IF EXISTS "Super Admins can update any profile" ON public.profiles;
CREATE POLICY "Super Admins can update any profile" ON public.profiles
    FOR UPDATE USING (
        (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'super_admin'
    );

-- Policy 4: Company Admins can update profiles within their company
DROP POLICY IF EXISTS "Company Admins can update their company profiles" ON public.profiles;
CREATE POLICY "Company Admins can update their company profiles" ON public.profiles
    FOR UPDATE USING (
        (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'company_admin'
        AND 
        company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- 4. Update Row Level Security (RLS) for SERIAL_NUMBERS
-- Policy: Company Admins can view/update serial numbers belonging to their company's profiles
ALTER TABLE public.serial_numbers ENABLE ROW LEVEL SECURITY;

-- Note: serial_numbers currently connect to `owner_id` (which is users.id).
-- To filter serials by company, we join with profiles.
DROP POLICY IF EXISTS "Company Admins can manage company serials" ON public.serial_numbers;
CREATE POLICY "Company Admins can manage company serials" ON public.serial_numbers
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'super_admin'
        OR 
        (
            (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'company_admin'
            AND 
            owner_id IN (
                SELECT user_id FROM public.profiles 
                WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
            )
        )
    );
