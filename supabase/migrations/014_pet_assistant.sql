-- Migration 014: Pet asisten (batch 1)
-- Karakter pixel art yang hidup di kartu publik. Jalankan di Supabase SQL
-- Editor kalau deploy manual.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS pet_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS pet_character_id TEXT DEFAULT 'widodo',
    ADD COLUMN IF NOT EXISTS pet_name TEXT DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
