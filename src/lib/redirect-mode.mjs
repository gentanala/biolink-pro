// Pintasan Fungsi (Shortcut Mode)
//
// Satu setelan di profil menentukan apa yang dilihat pengunjung link publik:
//   active_mode 'profile'  -> tampilkan kartu nama seperti biasa
//   active_mode 'redirect' -> lempar langsung ke redirect_url
//
// redirect_until (opsional, ISO string) membatasi berapa lama mode lempar bertahan.
// Kalau sudah lewat, otomatis balik ke kartu nama — tanpa perlu cron/scheduler,
// karena setiap pembacaan mengevaluasi ulang batas waktunya.
//
// ponytail: dievaluasi saat baca, bukan lewat job terjadwal. Kalau nanti butuh
// laporan "mode apa yang aktif kapan", baru pindah ke kolom + job.

/**
 * URL tujuan kalau mode lempar sedang aktif, atau null kalau harus tampil kartu nama.
 * Menerima objek `theme` mentah maupun profil yang sudah di-flatten — nama fieldnya sama.
 */
export function activeRedirectUrl(source, now = new Date()) {
    if (!source) return null
    if (source.active_mode !== 'redirect') return null

    const url = source.redirect_url
    if (!url || typeof url !== 'string' || !url.trim()) return null

    const until = source.redirect_until
    if (until && new Date(until).getTime() <= now.getTime()) return null

    return url.trim()
}

/** Tambahkan skema kalau user cuma nulis "tokopedia.com/toko". */
export function normalizeUrl(url) {
    return /^https?:\/\//i.test(url) ? url : 'https://' + url
}

/**
 * Daftar tujuan pintasan yang disimpan user (theme.shortcuts).
 *
 * Sebelum fitur ini user cuma punya SATU tujuan (theme.redirect_url) yang diketik
 * manual di dashboard. Kalau daftarnya masih kosong tapi tujuan lama itu ada,
 * kita angkat jadi item pertama supaya setelan lama user tidak hilang.
 */
export function readShortcuts(theme) {
    const saved = Array.isArray(theme?.shortcuts) ? theme.shortcuts : []
    const clean = saved.filter((s) => s && s.url && String(s.url).trim())

    if (clean.length) return clean

    const legacy = theme?.redirect_url
    if (legacy && String(legacy).trim()) {
        return [{ id: 'legacy', title: 'Pintasan Link', url: String(legacy).trim() }]
    }

    return []
}

/** Pilihan durasi di halaman pintasan. null = sampai diganti sendiri. */
export const DURATIONS = [
    { id: 'forever', label: 'Sampai diganti', hours: null },
    { id: 'hour', label: '1 jam', hours: 1 },
    { id: 'today', label: 'Hari ini', hours: 'end-of-day' },
]

/** ISO string kapan mode lempar berakhir, atau null kalau tanpa batas. */
export function expiryFor(durationId, now = new Date()) {
    const found = DURATIONS.find((d) => d.id === durationId)
    if (!found || found.hours === null) return null

    if (found.hours === 'end-of-day') {
        const end = new Date(now)
        end.setHours(23, 59, 59, 999)
        return end.toISOString()
    }

    return new Date(now.getTime() + found.hours * 3600 * 1000).toISOString()
}
