
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
        const { userId, action } = await request.json()
        const performAction = action || 'delete' // Default to delete for backward compatibility

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // 1. Check for Service Role Key
        console.log('--- DELETE/RESET USER API CALLED ---')
        console.log('Request payload:', { userId, performAction })

        let supabaseAdmin
        try {
            const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
            console.log('Has Service Role Key:', hasKey)

            if (!hasKey) {
                console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing from process.env')
                throw new Error('Missing Service Role Key')
            }

            supabaseAdmin = getAdminClient()
            console.log('Supabase Admin Client initialized successfully')
        } catch (err) {
            console.error('Server configuration error:', err)
            return NextResponse.json({ error: 'Server misconfigured: Missing Service Role Key' }, { status: 500 })
        }

        if (performAction === 'reset') {
            // ACTION: RESET CONTENT (Keep User, Keep Serial)
            // We empty the profile fields but keep the record
            const { error: resetError } = await supabaseAdmin
                .from('profiles')
                .update({
                    bio: null,
                    avatar_url: null,
                    phone: null,
                    whatsapp: null,
                    company: null,
                    job_title: null,
                    social_links: [],
                    theme: {}, // Reset theme
                    // We KEEP: display_name, slug, tier, email, user_id
                })
                .eq('user_id', userId)

            if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 })

            return NextResponse.json({ success: true, message: 'Profile content reset successfully' })

        } else {
            // ACTION: FULL DELETE (Unlink Serial, Delete User)

            // 2. Cleanup serials BEFORE deleting user
            const { error: serialError } = await supabaseAdmin
                .from('serial_numbers')
                .update({
                    owner_id: null,
                    is_claimed: false,
                    claimed_at: null,
                    sync_enabled: true
                })
                .eq('owner_id', userId)

            if (serialError) console.error('Error cleaning up serials:', serialError)

            // 3. Delete user from auth.users
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

            if (deleteError) {
                console.error('Error deleting user from Auth:', deleteError)
                return NextResponse.json({
                    error: `Auth Delete Error: ${deleteError.message}`,
                    details: deleteError
                }, { status: 500 })
            }

            return NextResponse.json({ success: true, message: 'User deleted permanently' })
        }

    } catch (error: any) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
