
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { buildProfileUpdates } from '@/lib/profile-updates.mjs'

// Helper to get admin client
const getAdminClient = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

export async function POST(request: Request) {
    try {
        const payload = await request.json()
        const { userId, serialId, ...updates } = payload

        if (!userId && !serialId) {
            return NextResponse.json({ error: 'User ID or Serial ID is required' }, { status: 400 })
        }

        console.log('--- UPDATE USER/SERIAL API ---')
        console.log('Target User:', userId)
        console.log('Target Serial:', serialId)
        console.log('Updates:', updates)

        // 1. Init Admin Client
        let supabaseAdmin
        try {
            supabaseAdmin = getAdminClient()
        } catch (err) {
            console.error('Server configuration error:', err)
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
        }

        // 2. If Serial ID is provided, update serial_numbers table
        if (serialId) {
            const serialUpdates: any = {}
            if ('special_edition' in updates) {
                serialUpdates.special_edition = updates.special_edition
            }
            if ('special_editions' in updates) {
                serialUpdates.special_editions = updates.special_editions
            }
            if ('company_id' in updates) {
                serialUpdates.company_id = updates.company_id
            }

            if (Object.keys(serialUpdates).length > 0) {
                const { error: serialError } = await supabaseAdmin
                    .from('serial_numbers')
                    .update(serialUpdates)
                    .eq('id', serialId)

                if (serialError) {
                    console.error('Serial update failed:', serialError)
                    return NextResponse.json({ error: serialError.message }, { status: 500 })
                }
            }
        }

        // 3. If User ID is provided, update profiles table
        if (userId) {
            const profileUpdates = buildProfileUpdates(updates)

            if (Object.keys(profileUpdates).length > 0) {
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .update(profileUpdates)
                    .eq('user_id', userId)

                if (profileError) {
                    console.error('Profile update failed:', profileError)
                    return NextResponse.json({ error: profileError.message }, { status: 500 })
                }
            }

            // 4. Handle Side Effects (e.g. Sync Disable for Free Tier)
            if (updates.tier === 'FREE') {
                console.log('Downgrade to FREE detected. Disabling sync...')
                const { error: syncError } = await supabaseAdmin
                    .from('serial_numbers')
                    .update({ sync_enabled: false })
                    .eq('owner_id', userId)

                if (syncError) console.warn('Failed to auto-disable sync:', syncError)
            }
        }

        return NextResponse.json({ success: true, message: 'Updated successfully' })

    } catch (error: any) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
