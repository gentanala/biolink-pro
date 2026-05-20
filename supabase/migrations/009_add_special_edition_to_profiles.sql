-- Migration 009: Add special_edition and enable_special_greeting_anim to profiles
-- Run this in your Supabase SQL Editor if you are deploying manually.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS special_edition TEXT DEFAULT NULL;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enable_special_greeting_anim BOOLEAN DEFAULT FALSE;
