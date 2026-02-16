'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { UnclaimedView } from './unclaimed-view'
import { ProfileView } from './profile-view'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Default product info (used when no product join is available)
const DEFAULT_PRODUCT = {
    id: 'default-product',
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

            // 1. Query Supabase for this serial
            const { data: dbSerial, error } = await supabase
                .from('serial_numbers')
                .select('*')
                .eq('serial_uuid', cleanUuid)
                .single()

            if (error || !dbSerial) {
                console.log('Serial not found in Supabase:', cleanUuid)
                setNotFound(true)
                setLoading(false)
                return
            }

            // 2. Increment tap count in Supabase (fire and forget)
            supabase.rpc('increment_tap_count', { p_serial_uuid: cleanUuid }).then(() => {
                console.log('Tap count incremented')
            })

            // 3. If claimed, try to load owner profile and redirect
            if (dbSerial.is_claimed && dbSerial.owner_id) {
                // Fetch owner profile from Supabase
                const { data: ownerProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', dbSerial.owner_id)
                    .single()

                if (ownerProfile?.slug) {
                    // Redirect to owner's public profile
                    window.location.href = `/${ownerProfile.slug}`
                    return
                }

                // Fallback: check localStorage for profile
                const localProfile = localStorage.getItem('genhub_profile')
                if (localProfile) {
                    const parsed = JSON.parse(localProfile)
                    if (parsed.slug) {
                        window.location.href = `/${parsed.slug}`
                        return
                    }
                }
            }

            // 4. Build serial object for the view components
            const serialData = {
                id: dbSerial.id,
                serial_uuid: dbSerial.serial_uuid,
                product_id: dbSerial.product_id,
                variant_id: dbSerial.variant_id || null,
                owner_id: dbSerial.owner_id || null,
                is_claimed: dbSerial.is_claimed || false,
                claimed_at: dbSerial.claimed_at,
                activation_code: dbSerial.activation_code || null,
                nfc_tap_count: (dbSerial.nfc_tap_count || 0) + 1,
                last_tapped_at: new Date().toISOString(),
                manufactured_at: dbSerial.manufactured_at,
                created_at: dbSerial.created_at,
                product: DEFAULT_PRODUCT,
                owner: undefined as any
            }

            setSerial(serialData)
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
