// Database types for Gentanala
// Generated from schema definitions

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    story_content: {
        provenance?: string;
        story?: string;
        blocks?: unknown[];
    } | null;
    base_price: number;
    product_type: 'ready_stock' | 'preorder';
    is_preorder: boolean;
    preorder_eta: string | null;
    preorder_cap: number | null;
    featured_image: string | null;
    gallery_images: string[] | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ConfiguratorOption {
    id: string;
    product_id: string;
    component_type: 'case' | 'dial' | 'hands' | 'strap';
    option_id: string;
    option_name: string;
    option_image: string;
    price_modifier: number;
    display_order: number;
    is_available: boolean;
    created_at: string;
}

export interface Variant {
    id: string;
    product_id: string;
    sku: string;
    case_option: string;
    dial_option: string;
    hands_option: string;
    strap_option: string;
    price_modifier: number;
    is_available: boolean;
    created_at: string;
}

export interface Inventory {
    id: string;
    variant_id: string;
    quantity: number;
    reserved_quantity: number;
    warehouse_location: string | null;
    low_stock_threshold: number;
    last_checked: string;
    updated_at: string;
}

export interface SerialNumber {
    id: string;
    serial_uuid: string;
    product_id: string;
    variant_id: string | null;
    owner_id: string | null;
    is_claimed: boolean;
    claimed_at: string | null;
    activation_code: string | null;
    nfc_tap_count: number;
    last_tapped_at: string | null;
    manufactured_at: string | null;
    created_at: string;
}

export interface OwnershipLog {
    id: string;
    serial_id: string;
    from_user_id: string | null;
    to_user_id: string;
    transfer_type: 'claim' | 'purchase' | 'gift' | 'support_override';
    notes: string | null;
    transferred_at: string;
}

export interface Profile {
    id: string;
    user_id: string;
    slug: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    theme: {
        primary?: string;
        background?: string;
        style?: string;
    };
    phone: string | null;
    email: string | null;
    company: string | null;
    job_title: string | null;
    social_links: SocialLink[];
    is_public: boolean;
    lead_capture_enabled: boolean;
    lead_capture_delay: number;
    created_at: string;
    updated_at: string;
}

export interface Lead {
    id: string;
    profile_id: string;
    created_at: string;
    name: string | null;
    email: string | null;
    whatsapp: string | null;
    company: string | null;
    status: 'new' | 'contacted' | 'converted';
}

export interface SocialLink {
    platform: string;
    url: string;
    label?: string;
}

export interface Lead {
    id: string;
    created_at: string;
    profile_id: string;
    name: string | null;
    email: string | null;
    whatsapp: string | null;
    company: string | null;
}

export interface Analytics {
    id: string;
    created_at: string;
    profile_id: string;
    event_type: 'view' | 'click';
    meta: Record<string, unknown>;
}

export interface Order {
    id: string;
    user_id: string;
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    total_amount: number;
    currency: string;
    shipping_address: ShippingAddress | null;
    payment_method: string | null;
    payment_reference: string | null;
    order_items: OrderItem[];
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ShippingAddress {
    name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
}

export interface OrderItem {
    variant_id: string;
    product_id: string;
    sku: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    config: WatchConfig;
}

export interface WatchConfig {
    case: string;
    dial: string;
    hands: string;
    strap: string;
}

// Joined types for queries
export interface SerialWithProduct extends SerialNumber {
    product: Product;
    variant?: Variant;
}

export interface SerialWithOwner extends SerialNumber {
    product: Product;
    owner?: Profile;
}
