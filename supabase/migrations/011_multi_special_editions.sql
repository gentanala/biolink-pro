-- Migration 011: Support multiple special edition entitlements per profile/card.
-- Admin grants access through special_editions; user chooses one selected_special_greeting_anim.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS special_editions JSONB DEFAULT '[]'::JSONB;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS selected_special_greeting_anim TEXT DEFAULT NULL;

ALTER TABLE public.serial_numbers
ADD COLUMN IF NOT EXISTS special_editions JSONB DEFAULT '[]'::JSONB;

UPDATE public.profiles
SET special_editions = jsonb_build_array(special_edition)
WHERE special_edition IS NOT NULL
  AND (special_editions IS NULL OR special_editions = '[]'::JSONB);

UPDATE public.profiles
SET selected_special_greeting_anim = special_edition
WHERE enable_special_greeting_anim = TRUE
  AND selected_special_greeting_anim IS NULL
  AND special_edition IS NOT NULL;

UPDATE public.serial_numbers
SET special_editions = jsonb_build_array(special_edition)
WHERE special_edition IS NOT NULL
  AND (special_editions IS NULL OR special_editions = '[]'::JSONB);
