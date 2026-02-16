import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // In development, we bypass Supabase auth checks
    // and rely on client-side localStorage auth
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Public routes that don't need auth
    const publicRoutes = ['/', '/login', '/register', '/activate', '/admin', '/get-started']
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/tap') || pathname.startsWith('/auth')

    // Check if it's a public profile route (slug at root level)
    const reservedPaths = ['login', 'register', 'dashboard', 'activate', 'api', '_next', 'favicon.ico', 'admin', 'tap', 'auth', 'get-started']
    const pathSegments = pathname.split('/').filter(Boolean)
    const isPublicProfile = pathSegments.length === 1 && !reservedPaths.includes(pathSegments[0])

    // Static files and API routes - always allow
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') // files with extensions
    ) {
        return NextResponse.next()
    }

    // In development mode, let the client handle auth via localStorage
    if (isDevelopment) {
        return NextResponse.next()
    }

    // Production mode - use Supabase auth
    // This code will run when app is deployed with real Supabase
    try {
        const { createServerClient } = await import('@supabase/ssr')

        let response = NextResponse.next({
            request,
        })

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                        response = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()

        // Not logged in and trying to access protected route
        if (!user && !isPublicRoute && !isPublicProfile) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Logged in
        if (user) {
            // Redirect from login/register to dashboard
            if (pathname === '/login' || pathname === '/register') {
                const url = request.nextUrl.clone()
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
            }

            // Redirect activate page to dashboard (activation = claiming serial)
            if (pathname === '/activate') {
                const url = request.nextUrl.clone()
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
            }
        }

        return response
    } catch (error) {
        // If Supabase is not configured, let request through
        console.warn('Supabase not configured, skipping auth checks')
        return NextResponse.next()
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
