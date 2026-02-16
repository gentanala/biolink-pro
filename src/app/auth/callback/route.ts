import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // If a specific "next" path was requested, honor it
            if (next) {
                return NextResponse.redirect(`${origin}${next}`)
            }

            // Otherwise, auto-detect: check if user has a profile
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()

                if (profile) {
                    // Returning user with profile → Dashboard
                    return NextResponse.redirect(`${origin}/dashboard`)
                }
            }

            // New user without profile → Get Started (buy product)
            return NextResponse.redirect(`${origin}/get-started`)
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
