import { Profile } from '@/types/database'

export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'B2B'

export const TIER_LIMITS = {
    FREE: {
        ai_bio: false,
        ai_avatar: false,
        deep_analytics: false,
        green_impact: true,
        bg_animation: false,
    },
    PREMIUM: {
        ai_bio: true,
        ai_avatar: true,
        deep_analytics: true,
        green_impact: true,
        bg_animation: true,
    },
    B2B: {
        ai_bio: true,
        ai_avatar: true,
        deep_analytics: true,
        green_impact: true,
        bg_animation: true,
        corporate_dashboard: true,
    }
}

export function getProfileTier(profile: Profile | null): SubscriptionTier {
    if (!profile) return 'FREE'
    return (profile.tier as SubscriptionTier) || 'FREE'
}

export function canAccessAI(profile: Profile | null): boolean {
    const tier = getProfileTier(profile)
    return TIER_LIMITS[tier].ai_bio
}

export function canAccessAnalytics(profile: Profile | null): boolean {
    const tier = getProfileTier(profile)
    return TIER_LIMITS[tier].deep_analytics
}

export function isB2B(profile: Profile | null): boolean {
    return getProfileTier(profile) === 'B2B'
}
