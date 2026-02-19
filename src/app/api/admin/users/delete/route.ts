
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
        const performAction = action || 'delete'

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        console.log('--- DELETE/RESET USER API ---')
        console.log('Payload:', { userId, performAction })

        // 1. Init Admin Client
        let supabaseAdmin
        try {
            const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
            if (!hasKey) throw new Error('Missing Service Role Key')
            supabaseAdmin = getAdminClient()
        } catch (err) {
            console.error('Server configuration error:', err)
            return NextResponse.json({ error: 'Server misconfigured: Missing Service Role Key' }, { status: 500 })
        }

        // 2. Validate User ID & Resolve correct Auth ID
        let targetAuthId = userId

        // Check if user exists in Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

        if (authError || !authUser.user) {
            console.log(`User ${userId} not found in Auth. Checking if it matches a Profile ID...`)

            // Try to find if this UUID belongs to a profile
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('user_id')
                .eq('id', userId)
                .single()

            if (profile && profile.user_id) {
                console.log(`FOUND: Input ID ${userId} was a Profile ID. Maps to Auth ID: ${profile.user_id}`)
                targetAuthId = profile.user_id
            } else {
                console.warn(`ID ${userId} not found in Auth or Profiles.`)
                // If we can't find the user, we can't delete them. 
                // However, maybe they are already deleted?
                // We proceed to cleanup serials just in case.
            }
        }

        console.log(`Targeting Auth ID: ${targetAuthId}`)

        if (performAction === 'reset') {
            // ACTION: RESET CONTENT
            const { error: resetError } = await supabaseAdmin
                .from('profiles')
                .update({
                    bio: null,
                    avatar_url: null,
                    company: null,
                    job_title: null,
                    social_links: [],
                    theme: {},
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', targetAuthId)

            if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 })

            return NextResponse.json({ success: true, message: 'Profile reset successfully' })

        } else {
            // ACTION: FULL DELETE

            // A. Cleanup serials first (Unlink)
            const { error: serialError } = await supabaseAdmin
                .from('serial_numbers')
                .update({
                    owner_id: null,
                    is_claimed: false,
                    claimed_at: null,
                    sync_enabled: true
                })
                .eq('owner_id', targetAuthId)

            if (serialError) console.error('Error cleaning up serials:', serialError)

            // B. Explicitly delete Profile row (in case cascade fails)
            const { error: profileDeleteError } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('user_id', targetAuthId)

            if (profileDeleteError) console.error('Error deleting profile row:', profileDeleteError)

            // C. Delete Auth User
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetAuthId)

            if (deleteError) {
                console.error('Error deleting user from Auth:', deleteError)
                return NextResponse.json({
                    error: `Auth Delete Error: ${deleteError.message}`,
                    details: deleteError
                }, { status: 500 })
            }

            console.log('User deleted successfully from Auth and DB.')
            return NextResponse.json({ success: true, message: 'User deleted permanently' })
        }

    } catch (error: any) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
