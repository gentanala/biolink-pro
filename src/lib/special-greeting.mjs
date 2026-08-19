export const SPECIAL_EDITIONS = [
    { id: 'aruna', label: 'Aruna Series', animationLabel: 'Bunga Bangkai' },
    { id: 'prabowo', label: 'Prabowo Series', animationLabel: 'Prabowo' },
]

const SPECIAL_EDITION_IDS = SPECIAL_EDITIONS.map((edition) => edition.id)

export function normalizeSpecialEditions(value) {
    if (Array.isArray(value)) {
        return value.filter((edition) => SPECIAL_EDITION_IDS.includes(edition))
    }

    if (typeof value === 'string' && SPECIAL_EDITION_IDS.includes(value)) {
        return [value]
    }

    return []
}

export function getAvailableSpecialEditions(profile) {
    const editions = normalizeSpecialEditions(profile?.special_editions)

    if (editions.length > 0) return editions

    return normalizeSpecialEditions(profile?.special_edition)
}

export function getSelectedSpecialGreetingAnimation(profile) {
    const availableEditions = getAvailableSpecialEditions(profile)
    const selectedEdition = profile?.selected_special_greeting_anim

    if (availableEditions.includes(selectedEdition)) {
        return selectedEdition
    }

    if (!Array.isArray(profile?.special_editions) || profile.special_editions.length === 0) {
        const legacyEdition = normalizeSpecialEditions(profile?.special_edition)[0]
        return legacyEdition || null
    }

    return null
}

export function shouldShowSpecialGreetingAnimation(profile) {
    return Boolean(
        profile?.enable_special_greeting_anim &&
        getSelectedSpecialGreetingAnimation(profile)
    )
}

// Prioritas jeda tutup layar sapaan: animasi spesial (3500) > pet (2000) > default (800).
// petActive dikirim pemanggil karena keputusan "pet tampil atau tidak" juga
// bergantung pada mode redirect dan gagal-tidaknya sprite dimuat.
export function getWelcomeCloseDelay(profile, petActive = false) {
    if (shouldShowSpecialGreetingAnimation(profile)) return 3500
    if (petActive) return 2000
    return 800
}
