-- ===========================================
-- MIGRATION: Add INSERT/UPDATE/DELETE policies for serial_numbers
-- Run this in Supabase SQL Editor
-- ===========================================

-- Allow anyone (including anon) to INSERT serials (admin panel uses anon key)
DROP POLICY IF EXISTS "Allow insert serials" ON public.serial_numbers;
CREATE POLICY "Allow insert serials" ON public.serial_numbers
    FOR INSERT WITH CHECK (TRUE);

-- Allow anyone to UPDATE serials (for claiming flow - anon users claim serials)
DROP POLICY IF EXISTS "Allow update serials" ON public.serial_numbers;
CREATE POLICY "Allow update serials" ON public.serial_numbers
    FOR UPDATE USING (TRUE);

-- Allow anyone to DELETE serials (admin panel)
DROP POLICY IF EXISTS "Allow delete serials" ON public.serial_numbers;
CREATE POLICY "Allow delete serials" ON public.serial_numbers
    FOR DELETE USING (TRUE);

-- Grant INSERT, UPDATE, DELETE permissions
GRANT INSERT, UPDATE, DELETE ON public.serial_numbers TO anon, authenticated;
