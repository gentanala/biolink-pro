-- =============================================
-- MIGRATION: Nuclear RLS Fix for Leads Table
-- =============================================

-- 1. Ensure RLS is enabled on leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. NUCLEAR OPTION: Drop ALL existing policies related to leads
-- This cleans up any potential conflicts or duplicates
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."leads";
DROP POLICY IF EXISTS "Public can insert leads" ON "public"."leads";
DROP POLICY IF EXISTS "Anyone can create leads" ON "public"."leads";
DROP POLICY IF EXISTS "Users can view own leads" ON "public"."leads";
DROP POLICY IF EXISTS "Users can delete own leads" ON "public"."leads";

-- 3. Create FRESH, EXPLICIT policies

-- A. PUBLIC INSERT (The most critical one)
-- Allow updated logic: anyone (anon or authenticated) can INSERT
CREATE POLICY "Public insert leads"
ON "public"."leads"
FOR INSERT
TO public
WITH CHECK (true);

-- B. OWNER SELECT (View own leads)
-- Only the owner of the profile can view the leads
CREATE POLICY "Users can view own leads"
ON "public"."leads"
FOR SELECT
USING (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- C. OWNER DELETE (Manage own leads)
-- Only the owner can delete
CREATE POLICY "Users can delete own leads"
ON "public"."leads"
FOR DELETE
USING (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- Note: We intentionally do NOT add an UPDATE policy. Leads should be immutable by public.
