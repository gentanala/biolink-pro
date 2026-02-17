-- =============================================
-- MIGRATION: Fix RLS Policies for Leads Table
-- =============================================

-- 1. Ensure RLS is enabled on leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Anyone can create leads" ON public.leads;

-- 3. Create NEW strict policies

-- Allow ANYONE (anon & authenticated) to INSERT leads
-- This is critical for the public profile lead capture form
CREATE POLICY "Public can insert leads" ON public.leads
    FOR INSERT 
    WITH CHECK (true);

-- Ensure NO ONE (except service key) can SELECT/DELETE public leads via API
-- We only allow users to manage their OWN leads (already covered by previous migration, but reinforcing here for clarity)

-- Re-applying "Users can view own leads" just in case it was missed or dropped
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
CREATE POLICY "Users can view own leads" ON public.leads
    FOR SELECT 
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Re-applying "Users can delete own leads"
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;
CREATE POLICY "Users can delete own leads" ON public.leads
    FOR DELETE 
    USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );
