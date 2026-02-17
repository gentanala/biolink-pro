-- =============================================
-- MIGRATION: Analytics Fix and Mini-CRM Features
-- =============================================

-- 1. FIX ANALYTICS RLS (SELECT Policy)
-- =============================================
-- Drop incorrect or missing policies
DROP POLICY IF EXISTS "Users can view own analytics" ON "public"."analytics";
DROP POLICY IF EXISTS "Owner view analytics" ON "public"."analytics";

-- Create correct policy using subquery (Same logic as Leads fix)
CREATE POLICY "Owner view analytics"
ON "public"."analytics"
FOR SELECT
TO authenticated
USING (
    profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = auth.uid()
    )
);

-- 2. ADD CUSTOM DELAY COLUMN to Profiles
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lead_capture_delay') THEN
        ALTER TABLE public.profiles 
        ADD COLUMN lead_capture_delay INTEGER DEFAULT 4;
    END IF;
END $$;

-- 3. ADD STATUS COLUMN to Leads
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'status') THEN
        ALTER TABLE public.leads 
        ADD COLUMN status TEXT DEFAULT 'new';
        
        -- Add check constraint for status values
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_status_check 
        CHECK (status IN ('new', 'contacted', 'converted'));
    END IF;
END $$;

-- 4. UPDATE RLS FOR LEADS UPDATE
-- =============================================
-- Allow owners to UPDATE their leads (for status changes)
DROP POLICY IF EXISTS "Users can update own leads" ON "public"."leads";
CREATE POLICY "Users can update own leads"
ON "public"."leads"
FOR UPDATE
USING (
    profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = auth.uid()
    )
);
