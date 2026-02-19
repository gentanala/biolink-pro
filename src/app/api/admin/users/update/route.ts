
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
        const { userId, ...updates } = payload

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        console.log('--- UPDATE USER API ---')
        console.log('Target User:', userId)
        console.log('Updates:', updates)

        // 1. Init Admin Client
        let supabaseAdmin
        try {
            supabaseAdmin = getAdminClient()
        } catch (err) {
            console.error('Server configuration error:', err)
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
        }

        // 2. Perform Update
        const { error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('user_id', userId)

        if (error) {
            console.error('Update failed:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // 3. Handle Side Effects (e.g. Sync Disable for Free Tier)
        if (updates.tier === 'FREE') {
            console.log('Downgrade to FREE detected. Disabling sync...')
            const { error: syncError } = await supabaseAdmin
                .from('serial_numbers')
                .update({ sync_enabled: false })
                .eq('owner_id', userId)

            if (syncError) console.warn('Failed to auto-disable sync:', syncError)
        }

        return NextResponse.json({ success: true, message: 'User updated successfully' })

    } catch (error: any) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
