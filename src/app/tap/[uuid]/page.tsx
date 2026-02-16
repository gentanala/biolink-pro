'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { UnclaimedView } from './unclaimed-view'
import { ProfileView } from './profile-view'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Mock product for dev mode
const MOCK_PRODUCT = {
    id: 'mock-product-1',
    name: 'Gentanala Classic',
    slug: 'gentanala-classic',
    description: 'The flagship timepiece that started it all.',
    base_price: 3500000,
    product_type: 'ready_stock' as const,
    is_preorder: false,
    preorder_eta: null,
    preorder_cap: null,
    featured_image: '/images/products/classic-hero.jpg',
    gallery_images: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    story_content: {
        provenance: 'Crafted in our Jakarta atelier',
        story: 'Born from a vision to create watches that tell more than time.'
    }
}

interface SerialFromStorage {
    id: string
    serial_uuid: string
    product_name: string
    is_claimed: boolean
    claimed_at: string | null
    owner_email: string | null
    nfc_tap_count: number
    created_at: string
}

export default function TapPage() {
    const params = useParams()
    const uuid = params?.uuid as string
    const [serial, setSerial] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    const searchParams = useSearchParams()
    const shouldClaim = searchParams.get('claim') === 'true'

    useEffect(() => {
        const cleanUuid = uuid?.trim()
        if (!cleanUuid) {
            setNotFound(true)
            setLoading(false)
            return
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(cleanUuid)) {
            setNotFound(true)
            setLoading(false)
            return
        }

        const checkAndClaim = async () => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()

            // Try to load from localStorage (dev mode)
            let storedSerials = localStorage.getItem('genhub_serials')
            let serials: SerialFromStorage[] = []

            if (storedSerials) {
                serials = JSON.parse(storedSerials)
            } else {
                // AUTO-SEED MOCK DATA if storage is empty
                serials = [
                    {
                        id: '1',
                        serial_uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        product_name: 'Gentanala Classic',
                        is_claimed: false,
                        claimed_at: null,
                        owner_email: null,
                        nfc_tap_count: 0,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: '2',
                        serial_uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                        product_name: 'Gentanala Classic',
                        is_claimed: true,
                        claimed_at: new Date().toISOString(),
                        owner_email: 'demo@gentanala.com',
                        nfc_tap_count: 12,
                        created_at: new Date().toISOString()
                    }
                ]
                localStorage.setItem('genhub_serials', JSON.stringify(serials))
            }

            let found = serials.find(s => s.serial_uuid === cleanUuid)

            if (found) {
                // If user is logged in and it's an unclaimed serial + claim param is present
                // GUARD: Only auto-claim if the claim was explicitly initiated (via sessionStorage flag)
                const claimInitiated = typeof window !== 'undefined' && sessionStorage.getItem('claim_initiated') === cleanUuid
                if (session?.user && !found.is_claimed && shouldClaim && claimInitiated) {
                    // Clear the flag
                    sessionStorage.removeItem('claim_initiated')
                    // PERFORM CLAIM (updating localStorage for dev simulation)
                    found = {
                        ...found,
                        is_claimed: true,
                        owner_email: session.user.email || 'guest',
                        claimed_at: new Date().toISOString()
                    }
                    const updatedSerials = serials.map(s => s.serial_uuid === cleanUuid ? found : s)
                    localStorage.setItem('genhub_serials', JSON.stringify(updatedSerials))

                    // Also initialize a mock profile if it doesn't exist
                    const profileKey = `genhub_profile_${session.user.id}`
                    if (!localStorage.getItem(profileKey)) {
                        localStorage.setItem(profileKey, JSON.stringify({
                            slug: session.user.email?.split('@')[0] || 'owner',
                            display_name: session.user.email?.split('@')[0] || 'Owner',
                            bio: 'Digital Creator',
                            theme_mode: 'dark',
                            avatar_url: null
                        }))
                    }

                    // REDIRECT TO DASHBOARD AFTER CLAIM
                    window.location.href = '/dashboard?claim_success=true'
                    return
                }

                // Increment tap count
                const updated = serials.map(s =>
                    s.serial_uuid === cleanUuid
                        ? { ...s, nfc_tap_count: s.nfc_tap_count + 1 }
                        : s
                )
                localStorage.setItem('genhub_serials', JSON.stringify(updated))

                // Build serial object compatible with views
                const serialData = {
                    id: found.id,
                    serial_uuid: found.serial_uuid,
                    product_id: 'mock-product-1',
                    variant_id: null,
                    owner_id: found.is_claimed ? 'mock-owner' : null,
                    is_claimed: found.is_claimed,
                    claimed_at: found.claimed_at,
                    activation_code: null,
                    nfc_tap_count: found.nfc_tap_count + 1,
                    last_tapped_at: new Date().toISOString(),
                    manufactured_at: null,
                    created_at: found.created_at,
                    product: MOCK_PRODUCT,
                    owner: found.is_claimed ? {
                        id: 'mock-owner',
                        user_id: 'mock-user',
                        slug: found.owner_email?.split('@')[0] || 'owner',
                        display_name: found.owner_email?.split('@')[0] || 'Owner',
                        bio: 'Welcome to my profile!',
                        avatar_url: null,
                        theme: {},
                        phone: null,
                        email: found.owner_email,
                        company: null,
                        job_title: null,
                        social_links: [],
                        is_public: true,
                        created_at: found.created_at,
                        updated_at: found.created_at
                    } : undefined
                }

                setSerial(serialData)
                setLoading(false)
                return
            }

            // Not found in localStorage
            setNotFound(true)
            setLoading(false)
        }

        checkAndClaim()
    }, [uuid, shouldClaim])

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Loading...</p>
                </motion.div>
            </div>
        )
    }

    if (notFound || !serial) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md"
                >
                    <div className="text-6xl mb-6">🔍</div>
                    <h1 className="text-2xl font-bold text-white mb-4">Serial Not Found</h1>
                    <p className="text-zinc-400 mb-6">
                        This serial number doesn't exist or hasn't been registered yet.
                    </p>
                    <p className="text-sm text-zinc-500">
                        UUID: <code className="text-blue-400">{uuid}</code>
                    </p>
                    <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-left">
                        <p className="text-sm text-blue-300">
                            <strong>Admin Tip:</strong> Make sure this UUID was generated in the Admin Panel
                            at <code className="text-blue-400">/admin</code>
                        </p>
                    </div>
                </motion.div>
            </div>
        )
    }

    // Render based on claim status
    if (serial.is_claimed && serial.owner) {
        // Auto-redirect to owner's profile
        const username = serial.owner.slug || serial.owner.username || serial.owner.user_id
        if (username) {
            window.location.href = `/${username}`
            return (
                <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-zinc-400">Redirecting to verified profile...</p>
                    </motion.div>
                </div>
            )
        }
    }

    return <UnclaimedView serial={serial} />
}
