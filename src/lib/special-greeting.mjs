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

// Jeda tutup layar sapaan. Pet punya babaknya sendiri sebelum layar ini, jadi
// jedanya cuma soal animasi edisi spesial: kasih waktu animasinya terbaca.
export function getWelcomeCloseDelay(profile) {
    return shouldShowSpecialGreetingAnimation(profile) ? 3500 : 800
}
