-- ===========================================
-- GENTANALA - DATABASE SCHEMA
-- Extends biolink-pro schema for Phygital Platform
-- Run in Supabase SQL Editor
-- ===========================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 1. PRODUCTS TABLE (Parent Product)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    story_content JSONB, -- Rich content for product provenance
    base_price DECIMAL(12, 2) NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'ready_stock' CHECK (product_type IN ('ready_stock', 'preorder')),
    is_preorder BOOLEAN DEFAULT FALSE,
    preorder_eta DATE,
    preorder_cap INTEGER, -- NULL = unlimited
    featured_image TEXT,
    gallery_images TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- ===========================================
-- 2. CONFIGURATOR OPTIONS (Component Choices)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.configurator_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    component_type TEXT NOT NULL CHECK (component_type IN ('case', 'dial', 'hands', 'strap')),
    option_id TEXT NOT NULL, -- e.g., 'silver', 'gold', 'leather_brown'
    option_name TEXT NOT NULL,
    option_image TEXT NOT NULL, -- Transparent PNG path
    price_modifier DECIMAL(12, 2) DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint per product + component + option
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_options_unique 
    ON public.configurator_options(product_id, component_type, option_id);

-- ===========================================
-- 3. VARIANTS TABLE (SKU combinations)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE NOT NULL,
    case_option TEXT NOT NULL,
    dial_option TEXT NOT NULL,
    hands_option TEXT NOT NULL,
    strap_option TEXT NOT NULL,
    price_modifier DECIMAL(12, 2) DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for product lookup
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.variants(sku);

-- ===========================================
-- 4. INVENTORY TABLE (Stock Management)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    warehouse_location TEXT,
    low_stock_threshold INTEGER DEFAULT 5,
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one inventory record per variant
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_variant ON public.inventory(variant_id);

-- ===========================================
-- 5. SERIAL NUMBERS TABLE (NFC Chips)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.serial_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.variants(id),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    activation_code TEXT UNIQUE,
    nfc_tap_count INTEGER DEFAULT 0,
    last_tapped_at TIMESTAMPTZ,
    manufactured_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for NFC lookups
CREATE INDEX IF NOT EXISTS idx_serial_uuid ON public.serial_numbers(serial_uuid);
CREATE INDEX IF NOT EXISTS idx_serial_owner ON public.serial_numbers(owner_id);
CREATE INDEX IF NOT EXISTS idx_serial_activation_code ON public.serial_numbers(activation_code);

-- ===========================================
-- 6. OWNERSHIP LOGS TABLE (Audit Trail)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ownership_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_id UUID NOT NULL REFERENCES public.serial_numbers(id),
    from_user_id UUID REFERENCES auth.users(id),
    to_user_id UUID NOT NULL REFERENCES auth.users(id),
    transfer_type TEXT NOT NULL CHECK (transfer_type IN ('claim', 'purchase', 'gift', 'support_override')),
    notes TEXT,
    transferred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for serial lookup
CREATE INDEX IF NOT EXISTS idx_ownership_serial ON public.ownership_logs(serial_id);

-- ===========================================
-- 7. ORDERS TABLE (Commerce)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'IDR',
    shipping_address JSONB,
    payment_method TEXT,
    payment_reference TEXT,
    order_items JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ===========================================
-- 8. EXTEND PROFILES TABLE
-- ===========================================
-- Add social_links JSONB if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'social_links'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN social_links JSONB DEFAULT '[]'::JSONB;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
    END IF;

    -- NEW: Master Profile Flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_master'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_master BOOLEAN DEFAULT FALSE;
    END IF;

    -- NEW: Serial Profile Link
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'serial_numbers' 
        AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE public.serial_numbers ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- NEW: Company Branding Fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.companies ADD COLUMN bio TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'social_links'
    ) THEN
        ALTER TABLE public.companies ADD COLUMN social_links JSONB DEFAULT '[]'::JSONB;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.companies ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================

-- Enable RLS on new tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurator_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- PRODUCTS: Public read
DROP POLICY IF EXISTS "Products viewable by everyone" ON public.products;
CREATE POLICY "Products viewable by everyone" ON public.products
    FOR SELECT USING (is_active = TRUE);

-- CONFIGURATOR_OPTIONS: Public read
DROP POLICY IF EXISTS "Config options viewable by everyone" ON public.configurator_options;
CREATE POLICY "Config options viewable by everyone" ON public.configurator_options
    FOR SELECT USING (is_available = TRUE);

-- VARIANTS: Public read
DROP POLICY IF EXISTS "Variants viewable by everyone" ON public.variants;
CREATE POLICY "Variants viewable by everyone" ON public.variants
    FOR SELECT USING (is_available = TRUE);

-- INVENTORY: Admin only (no public access)
DROP POLICY IF EXISTS "Inventory admin only" ON public.inventory;
CREATE POLICY "Inventory admin only" ON public.inventory
    FOR ALL USING (FALSE); -- Use service role for inventory operations

-- SERIAL_NUMBERS: Public can check status, owner can update
DROP POLICY IF EXISTS "Serial status viewable" ON public.serial_numbers;
CREATE POLICY "Serial status viewable" ON public.serial_numbers
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Owner can update serial" ON public.serial_numbers;
CREATE POLICY "Owner can update serial" ON public.serial_numbers
    FOR UPDATE USING (auth.uid() = owner_id);

-- OWNERSHIP_LOGS: Users can view their own
DROP POLICY IF EXISTS "Users view own ownership logs" ON public.ownership_logs;
CREATE POLICY "Users view own ownership logs" ON public.ownership_logs
    FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- ORDERS: Users can view and create their own
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own orders" ON public.orders;
CREATE POLICY "Users create own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Function: Claim a serial number
CREATE OR REPLACE FUNCTION claim_serial_number(p_serial_uuid UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_serial RECORD;
    v_result JSONB;
BEGIN
    -- Lock the row
    SELECT * INTO v_serial 
    FROM public.serial_numbers 
    WHERE serial_uuid = p_serial_uuid 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Serial not found');
    END IF;
    
    IF v_serial.is_claimed THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Already claimed');
    END IF;
    
    -- Claim the serial
    UPDATE public.serial_numbers 
    SET 
        owner_id = p_user_id,
        is_claimed = TRUE,
        claimed_at = NOW()
    WHERE id = v_serial.id;
    
    -- Log the ownership
    INSERT INTO public.ownership_logs (serial_id, to_user_id, transfer_type)
    VALUES (v_serial.id, p_user_id, 'claim');
    
    RETURN jsonb_build_object('success', TRUE, 'serial_id', v_serial.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment NFC tap count
CREATE OR REPLACE FUNCTION increment_tap_count(p_serial_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.serial_numbers 
    SET 
        nfc_tap_count = nfc_tap_count + 1,
        last_tapped_at = NOW()
    WHERE serial_uuid = p_serial_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate SKU from options
CREATE OR REPLACE FUNCTION generate_sku(
    p_case TEXT, 
    p_dial TEXT, 
    p_hands TEXT, 
    p_strap TEXT
)
RETURNS TEXT AS $$
BEGIN
    RETURN 'GT-' || 
        UPPER(LEFT(p_case, 2)) || '-' || 
        UPPER(LEFT(p_dial, 2)) || '-' || 
        UPPER(LEFT(p_hands, 2)) || '-' || 
        UPPER(LEFT(p_strap, 2));
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Update timestamps trigger for new tables
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_inventory_updated_at ON public.inventory;
CREATE TRIGGER set_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===========================================
-- SAMPLE DATA (for testing)
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

-- Insert sample configurator options for the classic model
DO $$
DECLARE
    v_product_id UUID;
BEGIN
    SELECT id INTO v_product_id FROM public.products WHERE slug = 'gentanala-classic';
    
    IF v_product_id IS NOT NULL THEN
        -- Case options
        INSERT INTO public.configurator_options (product_id, component_type, option_id, option_name, option_image, price_modifier, display_order)
        VALUES 
            (v_product_id, 'case', 'silver', 'Silver', '/assets/configurator/case/silver.png', 0, 1),
            (v_product_id, 'case', 'gold', 'Gold', '/assets/configurator/case/gold.png', 500000, 2),
            (v_product_id, 'case', 'rose_gold', 'Rose Gold', '/assets/configurator/case/rose_gold.png', 750000, 3),
            (v_product_id, 'case', 'black', 'Black PVD', '/assets/configurator/case/black.png', 300000, 4)
        ON CONFLICT (product_id, component_type, option_id) DO NOTHING;
        
        -- Dial options
        INSERT INTO public.configurator_options (product_id, component_type, option_id, option_name, option_image, price_modifier, display_order)
        VALUES 
            (v_product_id, 'dial', 'white', 'White', '/assets/configurator/dial/white.png', 0, 1),
            (v_product_id, 'dial', 'black', 'Black', '/assets/configurator/dial/black.png', 0, 2),
            (v_product_id, 'dial', 'blue', 'Navy Blue', '/assets/configurator/dial/blue.png', 200000, 3),
            (v_product_id, 'dial', 'green', 'Forest Green', '/assets/configurator/dial/green.png', 200000, 4)
        ON CONFLICT (product_id, component_type, option_id) DO NOTHING;
        
        -- Hands options
        INSERT INTO public.configurator_options (product_id, component_type, option_id, option_name, option_image, price_modifier, display_order)
        VALUES 
            (v_product_id, 'hands', 'silver', 'Silver', '/assets/configurator/hands/silver.png', 0, 1),
            (v_product_id, 'hands', 'gold', 'Gold', '/assets/configurator/hands/gold.png', 150000, 2),
            (v_product_id, 'hands', 'blue_steel', 'Blue Steel', '/assets/configurator/hands/blue_steel.png', 250000, 3)
        ON CONFLICT (product_id, component_type, option_id) DO NOTHING;
        
        -- Strap options
        INSERT INTO public.configurator_options (product_id, component_type, option_id, option_name, option_image, price_modifier, display_order)
        VALUES 
            (v_product_id, 'strap', 'leather_brown', 'Leather Brown', '/assets/configurator/strap/leather_brown.png', 0, 1),
            (v_product_id, 'strap', 'leather_black', 'Leather Black', '/assets/configurator/strap/leather_black.png', 0, 2),
            (v_product_id, 'strap', 'steel', 'Steel Bracelet', '/assets/configurator/strap/steel.png', 750000, 3),
            (v_product_id, 'strap', 'nato_green', 'NATO Green', '/assets/configurator/strap/nato_green.png', 100000, 4)
        ON CONFLICT (product_id, component_type, option_id) DO NOTHING;
    END IF;
END $$;

-- Insert sample serial number (unclaimed)
DO $$
DECLARE
    v_product_id UUID;
BEGIN
    SELECT id INTO v_product_id FROM public.products WHERE slug = 'gentanala-classic';
    
    IF v_product_id IS NOT NULL THEN
        INSERT INTO public.serial_numbers (serial_uuid, product_id, manufactured_at)
        VALUES 
            ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, v_product_id, '2025-01-01'),
            ('b2c3d4e5-f6a7-8901-bcde-f12345678901'::UUID, v_product_id, '2025-01-15')
        ON CONFLICT (serial_uuid) DO NOTHING;
    END IF;
END $$;

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.configurator_options TO anon, authenticated;
GRANT SELECT ON public.variants TO anon, authenticated;
GRANT SELECT ON public.serial_numbers TO anon, authenticated;
GRANT SELECT, INSERT ON public.ownership_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
