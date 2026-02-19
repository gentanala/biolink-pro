'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tier = 'FREE' | 'PREMIUM' | 'B2B'

interface TierConfigs {
    [key: string]: boolean
}

interface TierContextType {
    tier: Tier
    isLoading: boolean
    hasFeature: (feature: string) => boolean
    features: TierConfigs
}

const TierContext = createContext<TierContextType>({
    tier: 'FREE',
    isLoading: true,
    hasFeature: () => false,
    features: {}
})

export function TierProvider({ children }: { children: React.ReactNode }) {
    const [tier, setTier] = useState<Tier>('FREE')
    const [tierConfigs, setTierConfigs] = useState<Record<Tier, TierConfigs>>({
        FREE: {},
        PREMIUM: {},
        B2B: {}
    })
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Get current user
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    // 2. Get profile tier
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('tier')
                        .eq('user_id', user.id)
                        .single()

                    if (profile?.tier) {
                        setTier(profile.tier as Tier)
                    }
                }

                // 3. Get all tier configs
                const { data: configs } = await supabase
                    .from('tier_configs')
                    .select('*')

                if (configs) {
                    const configMap: any = {}
                    configs.forEach((c: any) => {
                        configMap[c.tier] = c.features
                    })
                    setTierConfigs(configMap)
                }

            } catch (error) {
                console.error('Failed to load tier context:', error)
            } finally {
                setIsLoading(false)
            }
        }

        init()
    }, [])

    const hasFeature = (feature: string): boolean => {
        // If still loading, default to false (safe) or maybe true for basic features?
        // Safe default: false
        if (isLoading) return false

        // Get features for current tier
        const tierFeatures = tierConfigs[tier] || {}

        // Return feature flag
        return tierFeatures[feature] === true
    }

    return (
        <TierContext.Provider value={{
            tier,
            isLoading,
            hasFeature,
            features: tierConfigs[tier] || {}
        }}>
            {children}
        </TierContext.Provider>
    )
}

export const useTier = () => useContext(TierContext)
