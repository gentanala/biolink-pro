-- ===========================================
-- GENTANALA COMPLETE SETUP
-- Run this ONCE in Supabase SQL Editor
-- This creates ALL tables needed for the app
-- ===========================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    is_activated BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 2. PROFILES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    theme JSONB DEFAULT '{"primary": "#3B82F6", "background": "#0F172A", "style": "default"}'::jsonb,
    phone TEXT,
    email TEXT,
    company TEXT,
    job_title TEXT,
    social_links JSONB DEFAULT '[]'::JSONB,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 3. LINKS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT 'link',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. PRODUCTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    story_content JSONB,
    base_price DECIMAL(12, 2) NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'ready_stock',
    is_preorder BOOLEAN DEFAULT FALSE,
    preorder_eta DATE,
    preorder_cap INTEGER,
    featured_image TEXT,
    gallery_images TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 5. SERIAL NUMBERS TABLE (NFC Chips)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.serial_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id),
    variant_id UUID,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    activation_code TEXT UNIQUE,
    nfc_tap_count INTEGER DEFAULT 0,
    last_tapped_at TIMESTAMPTZ,
    manufactured_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_serial_uuid ON public.serial_numbers(serial_uuid);
CREATE INDEX IF NOT EXISTS idx_serial_owner ON public.serial_numbers(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serial_numbers ENABLE ROW LEVEL SECURITY;

-- USERS policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- PROFILES policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- LINKS policies
DROP POLICY IF EXISTS "Links are viewable with profile" ON public.links;
CREATE POLICY "Links are viewable with profile" ON public.links FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can insert own links" ON public.links;
CREATE POLICY "Users can insert own links" ON public.links FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can update own links" ON public.links;
CREATE POLICY "Users can update own links" ON public.links FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can delete own links" ON public.links;
CREATE POLICY "Users can delete own links" ON public.links FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid())
);

-- PRODUCTS policies
DROP POLICY IF EXISTS "Products viewable by everyone" ON public.products;
CREATE POLICY "Products viewable by everyone" ON public.products FOR SELECT USING (TRUE);

-- SERIAL_NUMBERS policies (open for admin panel + claim flow)
DROP POLICY IF EXISTS "Serial status viewable" ON public.serial_numbers;
CREATE POLICY "Serial status viewable" ON public.serial_numbers FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Allow insert serials" ON public.serial_numbers;
CREATE POLICY "Allow insert serials" ON public.serial_numbers FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Allow update serials" ON public.serial_numbers;
CREATE POLICY "Allow update serials" ON public.serial_numbers FOR UPDATE USING (TRUE);
DROP POLICY IF EXISTS "Allow delete serials" ON public.serial_numbers;
CREATE POLICY "Allow delete serials" ON public.serial_numbers FOR DELETE USING (TRUE);

-- ===========================================
-- PERMISSIONS
-- ===========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.links TO authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.serial_numbers TO anon, authenticated;

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Auto-create user record on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment NFC tap count
CREATE OR REPLACE FUNCTION increment_tap_count(p_serial_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.serial_numbers
    SET nfc_tap_count = nfc_tap_count + 1, last_tapped_at = NOW()
    WHERE serial_uuid = p_serial_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- SAMPLE DATA
-- ===========================================

-- Insert sample product
INSERT INTO public.products (name, slug, description, base_price, product_type, featured_image, story_content)
VALUES (
    'Gentanala Classic',
    'gentanala-classic',
    'The flagship timepiece that started it all. Precision engineering meets timeless design.',
    3500000,
    'ready_stock',
    '/images/products/classic-hero.jpg',
    '{"provenance": "Crafted in our Jakarta atelier", "story": "Born from a vision to create watches that tell more than time."}'::JSONB
)
ON CONFLICT (slug) DO NOTHING;
