// Types untuk GenHub

export interface User {
    id: string
    email: string
    is_activated: boolean
    activated_at: string | null
    created_at: string
    updated_at: string
}

export interface ActivationCode {
    id: string
    code: string
    is_used: boolean
    used_by_user_id: string | null
    used_at: string | null
    created_at: string
}

export interface Profile {
    id: string
    user_id: string
    slug: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    theme: ProfileTheme
    phone: string | null
    email: string | null
    company: string | null // nama perusahaan teks (opsional)
    company_id: string | null // ID referensi ke tabel companies
    role: 'super_admin' | 'company_admin' | 'user'
    job_title: string | null
    created_at: string
    updated_at: string
}

export interface ProfileTheme {
    primary: string
    background: string
    style: 'default' | 'gradient' | 'minimal'
}

export interface Link {
    id: string
    profile_id: string
    title: string
    url: string
    icon: string
    is_active: boolean
    display_order: number
    created_at: string
    updated_at: string
}

export interface ProfileWithLinks extends Profile {
    links: Link[]
}

// Social Icons mapping
export const SOCIAL_ICONS = {
    instagram: 'instagram',
    twitter: 'twitter',
    facebook: 'facebook',
    linkedin: 'linkedin',
    youtube: 'youtube',
    tiktok: 'music',
    github: 'github',
    website: 'globe',
    email: 'mail',
    phone: 'phone',
    whatsapp: 'message-circle',
    telegram: 'send',
    link: 'link'
} as const

export type SocialIconType = keyof typeof SOCIAL_ICONS
