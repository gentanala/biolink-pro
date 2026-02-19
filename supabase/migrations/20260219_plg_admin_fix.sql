-- ===========================================
-- FIX: Allow Admin Panel to Manage Companies
-- ===========================================

-- Since the Admin Panel uses client-side auth (anon key) for now,
-- we need to allow access to the companies table.
-- WARNING: This allows any user with the API key to modify companies.
-- Ideally, migrate Admin Panel to Server Actions with Service Role.

DROP POLICY IF EXISTS "Enable insert for everyone" ON public.companies;
CREATE POLICY "Enable insert for everyone" ON public.companies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for everyone" ON public.companies;
CREATE POLICY "Enable update for everyone" ON public.companies FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for everyone" ON public.companies;
CREATE POLICY "Enable delete for everyone" ON public.companies FOR DELETE USING (true);
