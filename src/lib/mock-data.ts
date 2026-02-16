// Mock data and utilities for local development
// This allows testing without Supabase connection

export const MOCK_USER = {
    id: 'mock-user-001',
    email: 'demo@genhub.pro',
    is_activated: true,
}

export const MOCK_PROFILE = {
    id: 'mock-profile-001',
    user_id: 'mock-user-001',
    slug: 'demo-user',
    display_name: 'Demo User',
    bio: 'Ini adalah akun demo untuk testing lokal GenHub',
    avatar_url: null,
    theme: {
        primary: '#3B82F6',
        background: '#0F172A',
        style: 'default'
    },
    phone: '+62812345678',
    email: 'demo@genhub.pro',
    company: 'GenHub',
    job_title: 'Product Manager',
}

export const MOCK_LINKS = [
    {
        id: 'link-001',
        profile_id: 'mock-profile-001',
        title: 'Instagram',
        url: 'https://instagram.com/demo',
        icon: 'instagram',
        is_active: true,
        display_order: 0,
    },
    {
        id: 'link-002',
        profile_id: 'mock-profile-001',
        title: 'LinkedIn',
        url: 'https://linkedin.com/in/demo',
        icon: 'linkedin',
        is_active: true,
        display_order: 1,
    },
    {
        id: 'link-003',
        profile_id: 'mock-profile-001',
        title: 'Website',
        url: 'https://genhub.pro',
        icon: 'globe',
        is_active: true,
        display_order: 2,
    },
    {
        id: 'link-004',
        profile_id: 'mock-profile-001',
        title: 'WhatsApp',
        url: 'https://wa.me/62812345678',
        icon: 'message-circle',
        is_active: true,
        display_order: 3,
    },
]

export const MOCK_ACTIVATION_CODES = [
    { code: 'BIOLINK-DEMO-001', is_used: false },
    { code: 'BIOLINK-DEMO-002', is_used: false },
    { code: 'NFC-CARD-X7Z9', is_used: false },
    { code: 'NFC-CARD-A3B5', is_used: false },
]

// Check if running in development mode
export const isDevelopment = process.env.NODE_ENV === 'development'

// Mock session storage key
export const MOCK_SESSION_KEY = 'genhub_mock_session'

// Helper to get mock session
export function getMockSession() {
    if (typeof window === 'undefined') return null
    const session = localStorage.getItem(MOCK_SESSION_KEY)
    return session ? JSON.parse(session) : null
}

// Helper to set mock session
export function setMockSession(user: typeof MOCK_USER | null) {
    if (typeof window === 'undefined') return
    if (user) {
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user))
    } else {
        localStorage.removeItem(MOCK_SESSION_KEY)
    }
}
