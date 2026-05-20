-- Migration 010: Add special_edition to serial_numbers
-- Run this in your Supabase SQL Editor if you are deploying manually.

ALTER TABLE public.serial_numbers 
ADD COLUMN IF NOT EXISTS special_edition TEXT DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
