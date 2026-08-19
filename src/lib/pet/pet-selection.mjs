// Menentukan pet mana yang dipakai sebuah profil.
//
// Aturan (Bagian 5 & 10 spesifikasi):
// - pet_enabled default menyala: null/undefined dianggap true, hanya false
//   yang mematikan. Profil lama yang belum punya kolomnya otomatis dapat pet.
// - id karakter tak dikenal jatuh ke karakter default, bukan error.

import { DEFAULT_PET_ID, getPetCharacter } from './characters.mjs'

// Saklar besar fitur pet. Dimatikan sementara sampai konsepnya dimatangkan:
// kartu publik tampil persis seperti sebelum fitur ini ada, tanpa perlu
// menyentuh data profil siapa pun. Nyalakan lagi cukup dengan mengubah ini
// jadi true — setelan pilihan karakter tiap orang masih tersimpan utuh.
export const PET_FEATURE_ENABLED = false

/** Karakter yang dipakai profil ini, atau null kalau pet dimatikan. */
export function selectPetCharacter(profile) {
    if (profile?.pet_enabled === false) return null
    return getPetCharacter(profile?.pet_character_id) || getPetCharacter(DEFAULT_PET_ID)
}

/** Nama panggilan pet: nama pilihan pemilik, atau nama bawaan karakter. */
export function petDisplayName(profile) {
    const character = selectPetCharacter(profile)
    if (!character) return null
    const custom = typeof profile?.pet_name === 'string' ? profile.pet_name.trim() : ''
    return custom || character.name
}
