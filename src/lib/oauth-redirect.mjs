export function getOAuthCallbackUrl(url) {
    const isAuthLandingPath = url.pathname === '/' || url.pathname === '/login'

    if (!isAuthLandingPath || !url.searchParams.has('code')) {
        return null
    }

    const callbackUrl = new URL('/auth/callback', url.origin)

    url.searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value)
    })

    if (!callbackUrl.searchParams.has('next')) {
        callbackUrl.searchParams.set('next', '/dashboard')
    }

    return callbackUrl
}
