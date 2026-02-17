-- =============================================
-- MIGRATION: Fix RLS SELECT Policy for Leads
-- =============================================

-- 1. Drop the incorrect policy
-- "Owner view leads" or "Users can view own leads"
DROP POLICY IF EXISTS "Owner view leads" ON "public"."leads";
DROP POLICY IF EXISTS "Users can view own leads" ON "public"."leads";

-- 2. Create the CORRECT policy using subquery
-- Maps auth.uid() -> profiles.user_id -> profiles.id -> leads.profile_id
CREATE POLICY "Owner view leads"
ON "public"."leads"
FOR SELECT
TO authenticated
USING (
    profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = auth.uid()
    )
);

-- Note: We only change the SELECT policy. 
-- The INSERT policy (public) and DELETE policy (owner) remain as is.
