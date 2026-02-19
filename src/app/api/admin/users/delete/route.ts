
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service Role Client for Admin Operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function DELETE(request: Request) {
    try {
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // 1. Delete user from auth.users (cascades to profiles usually, but let's be safe)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('Error deleting user:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        // 2. Optional: Clean up other tables if cascade isn't set up
        // For now, let's assume cascade or manual cleanup of public.profiles is handled by trigger or manually if needed.
        // But usually deleting auth.users is enough if everything is linked via FK with ON DELETE CASCADE.

        // If not cascading, we might want to manually delete profile:
        // await supabaseAdmin.from('profiles').delete().eq('user_id', userId)

        // Also update serial numbers to remove owner_id
        await supabaseAdmin
            .from('serial_numbers')
            .update({
                owner_id: null,
                is_claimed: false,
                claimed_at: null,
                sync_enabled: true // Reset sync
            })
            .eq('owner_id', userId)

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
