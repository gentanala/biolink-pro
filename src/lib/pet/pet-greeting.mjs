// Menyusun kalimat sapaan pet dari data profil + jam perangkat pengunjung.
// Tanpa AI, tanpa jaringan — satu fungsi murni yang bisa dites langsung.

import { petDisplayName } from './pet-selection.mjs'

function timeGreeting(hour) {
    if (hour >= 4 && hour < 11) return 'Pagi'
    if (hour >= 11 && hour < 15) return 'Siang'
    if (hour >= 15 && hour < 18) return 'Sore'
    return 'Malam'
}

/** Kalimat sapaan di gelembung pet, mis. "Pagi! Aku Widodo, asistennya Reza." */
export function buildPetGreeting({ profile, now = new Date() }) {
    const petName = petDisplayName(profile)
    if (!petName) return null

    const waktu = timeGreeting(now.getHours())
    const owner = profile?.display_name?.trim()

    let sentence = owner
        ? `${waktu}! Aku ${petName}, asistennya ${owner}.`
        : `${waktu}! Aku ${petName}, asisten kartu ini.`

    if (owner && profile?.job_title?.trim()) {
        sentence += ` Mau tahu soal ${owner}? Tanya aku.`
    }
    return sentence
}
