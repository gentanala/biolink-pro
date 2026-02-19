
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

export async function DELETE(request: Request) {
    try {
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // 1. Check for Service Role Key
        let supabaseAdmin
        try {
            supabaseAdmin = getAdminClient()
        } catch (err) {
            console.error('Server configuration error:', err)
            return NextResponse.json({ error: 'Server misconfigured: Missing Service Role Key' }, { status: 500 })
        }

        // 2. Delete user from auth.users
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('Error deleting user:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        // 3. Cleanup serials
        await supabaseAdmin
            .from('serial_numbers')
            .update({
                owner_id: null,
                is_claimed: false,
                claimed_at: null,
                sync_enabled: true
            })
            .eq('owner_id', userId)

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
