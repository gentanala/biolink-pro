import { createClient } from '@/lib/supabase/client'

interface AnalyticsEventData {
    profile_id: string
    event_type: 'view' | 'click'
    meta?: {
        link_url?: string
        link_title?: string
        city?: string
        country?: string
        device_type?: string
        user_agent?: string
        referrer?: string
        [key: string]: any
    }
}

/**
 * Track an analytics event (view or click)
 * This function is fire-and-forget to avoid blocking the UI
 */
export async function trackAnalytics(data: AnalyticsEventData): Promise<void> {
    try {
        const supabase = createClient()

        // Prepare meta data
        const meta: any = {
            ...data.meta,
            timestamp: new Date().toISOString(),
        }

        // Add device type if not provided
        if (!meta.device_type) {
            meta.device_type = getDeviceType()
        }

        // Add user agent if not provided
        if (!meta.user_agent && typeof navigator !== 'undefined') {
            meta.user_agent = navigator.userAgent
        }

        // Add referrer if not provided
        if (!meta.referrer && typeof document !== 'undefined') {
            meta.referrer = document.referrer || 'direct'
        }

        // Insert analytics event
        const { error } = await supabase
            .from('analytics')
            .insert({
                profile_id: data.profile_id,
                event_type: data.event_type,
                meta
            })

        if (error) {
            console.error('Analytics tracking error:', error)
        }
    } catch (err) {
        // Silently fail - we don't want analytics to break the app
        console.error('Analytics tracking failed:', err)
    }
}

/**
 * Track a profile view with optional location data
 */
export async function trackProfileView(profileId: string): Promise<void> {
    const meta: any = {}

    // Try to get location data (non-blocking)
    try {
        const locationData = await fetchLocationData()
        if (locationData) {
            meta.city = locationData.city
            meta.country = locationData.country
            meta.country_code = locationData.country_code
            meta.region = locationData.region
        }
    } catch (err) {
        // Location fetch failed, continue without it
        console.log('Could not fetch location data')
    }

    // Track the view
    await trackAnalytics({
        profile_id: profileId,
        event_type: 'view',
        meta
    })
}

/**
 * Track a link click
 */
export async function trackLinkClick(profileId: string, linkUrl: string, linkTitle?: string): Promise<void> {
    // Fire and forget - don't await
    trackAnalytics({
        profile_id: profileId,
        event_type: 'click',
        meta: {
            link_url: linkUrl,
            link_title: linkTitle || linkUrl
        }
    })
}

/**
 * Fetch visitor location data from ipapi.co
 * This is a free service with 30k requests/month
 */
async function fetchLocationData(): Promise<any> {
    try {
        const response = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error('Location API failed')
        }

        const data = await response.json()
        return {
            city: data.city,
            country: data.country_name,
            country_code: data.country_code,
            region: data.region
        }
    } catch (err) {
        console.error('Failed to fetch location:', err)
        return null
    }
}

/**
 * Detect device type from user agent
 */
function getDeviceType(): string {
    if (typeof navigator === 'undefined') return 'unknown'

    const ua = navigator.userAgent.toLowerCase()

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet'
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile'
    }
    return 'desktop'
}
