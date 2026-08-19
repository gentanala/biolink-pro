// Mode Kado
//
// Jam yang dibeli sebagai hadiah bisa membawa kejutan: saat pertama di-tap,
// penerima melihat pesan dari pengirim beserta video pilihannya, lalu diajak
// mengaktifkan kartunya sendiri. Setelah kartu diaktifkan, kadonya tidak
// hilang — tersimpan sebagai kenangan yang bisa dibuka lagi dari dashboard.
//
// ponytail: isian kado ditaruh sebagai kolom biasa di serial_numbers, bukan
// tabel sendiri. Satu jam = satu kado; kalau nanti butuh riwayat banyak kado
// per jam, baru dipecah jadi tabel.

import { normalizeUrl } from './redirect-mode.mjs'

/** Kado dianggap siap tampil kalau dinyalakan dan tujuannya sudah diisi. */
export function hasGift(serial) {
    return Boolean(serial?.gift_enabled && serial?.gift_url && String(serial.gift_url).trim())
}

/** Kunci rahasia halaman isian kado milik pembeli. */
export function newGiftToken() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '')
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/**
 * ID video YouTube dari berbagai bentuk link yang biasa disalin orang
 * (watch?v=, youtu.be, /shorts/, /embed/). Null kalau bukan YouTube.
 */
export function youtubeId(url) {
    if (!url) return null
    let parsed
    try {
        parsed = new URL(normalizeUrl(String(url).trim()))
    } catch {
        return null
    }

    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return parsed.pathname.slice(1).split('/')[0] || null
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return null

    const v = parsed.searchParams.get('v')
    if (v) return v

    const path = parsed.pathname.split('/').filter(Boolean)
    if (path[0] === 'shorts' || path[0] === 'embed' || path[0] === 'live') return path[1] || null
    return null
}

/** Alamat pemutar YouTube yang bisa ditanam di halaman kita sendiri. */
export function youtubeEmbedUrl(url) {
    const id = youtubeId(url)
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null
}
