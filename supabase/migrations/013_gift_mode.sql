-- Migration 013: Mode Kado untuk kartu yang belum diklaim
-- Jam yang dibeli sebagai hadiah bisa memutar kejutan saat pertama di-tap,
-- lalu tetap mengarah ke pengaktifan kartu. Jalankan di Supabase SQL Editor
-- kalau deploy manual.

ALTER TABLE public.serial_numbers
    ADD COLUMN IF NOT EXISTS gift_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS gift_url TEXT,
    ADD COLUMN IF NOT EXISTS gift_message TEXT,
    ADD COLUMN IF NOT EXISTS gift_from TEXT,
    -- Kunci rahasia untuk halaman isian kado milik pembeli.
    ADD COLUMN IF NOT EXISTS gift_token TEXT,
    -- Diisi sekali saat kado pertama kali dibuka; sesudah itu isian dikunci.
    ADD COLUMN IF NOT EXISTS gift_opened_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS serial_numbers_gift_token_key
    ON public.serial_numbers (gift_token)
    WHERE gift_token IS NOT NULL;

NOTIFY pgrst, 'reload schema';
