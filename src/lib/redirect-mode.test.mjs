// Cek cepat aturan mode lempar + kadaluarsa. Jalankan: node src/lib/redirect-mode.test.mjs
import assert from 'node:assert/strict'
import { activeRedirectUrl, expiryFor, normalizeUrl, readShortcuts } from './redirect-mode.mjs'

const now = new Date('2026-08-11T10:00:00+07:00')
const on = { active_mode: 'redirect', redirect_url: 'https://toko.com' }

// Mode kartu nama tidak pernah melempar.
assert.equal(activeRedirectUrl({ active_mode: 'profile', redirect_url: 'https://toko.com' }, now), null)

// Mode lempar tanpa batas waktu selalu aktif.
assert.equal(activeRedirectUrl(on, now), 'https://toko.com')
assert.equal(activeRedirectUrl({ ...on, redirect_until: null }, now), 'https://toko.com')

// Batas waktu belum lewat -> masih aktif. Sudah lewat -> balik ke kartu nama.
assert.equal(activeRedirectUrl({ ...on, redirect_until: '2026-08-11T11:00:00+07:00' }, now), 'https://toko.com')
assert.equal(activeRedirectUrl({ ...on, redirect_until: '2026-08-11T09:59:59+07:00' }, now), null)
// Tepat di detik berakhir dihitung sudah lewat.
assert.equal(activeRedirectUrl({ ...on, redirect_until: '2026-08-11T10:00:00+07:00' }, now), null)

// URL kosong / spasi doang tidak dianggap tujuan valid.
assert.equal(activeRedirectUrl({ active_mode: 'redirect', redirect_url: '   ' }, now), null)
assert.equal(activeRedirectUrl(null, now), null)

// Durasi.
assert.equal(expiryFor('forever', now), null)
assert.equal(expiryFor('hour', now), new Date('2026-08-11T11:00:00+07:00').toISOString())
assert.ok(expiryFor('today', now).startsWith('2026-08-11T16:59:59')) // 23:59:59 WIB = 16:59:59 UTC

// Skema URL dilengkapi kalau user cuma nulis domain.
assert.equal(normalizeUrl('toko.com'), 'https://toko.com')
assert.equal(normalizeUrl('http://toko.com'), 'http://toko.com')

// Daftar tujuan pintasan.
assert.deepEqual(readShortcuts(null), [])
assert.deepEqual(readShortcuts({}), [])

// Setelan lama (satu redirect_url manual) diangkat jadi item pertama, tidak hilang.
assert.deepEqual(readShortcuts({ redirect_url: 'https://yt.be/a' }),
    [{ id: 'legacy', title: 'Pintasan Link', url: 'https://yt.be/a' }])

// Kalau daftar sudah ada, daftar itu yang dipakai — bukan setelan lama.
assert.deepEqual(
    readShortcuts({ redirect_url: 'https://yt.be/a', shortcuts: [{ id: '1', title: 'Brosur', url: 'https://b.co' }] }),
    [{ id: '1', title: 'Brosur', url: 'https://b.co' }])

// Item tanpa URL dibuang supaya tidak jadi kartu kosong.
assert.deepEqual(readShortcuts({ shortcuts: [{ id: '1', title: 'Kosong', url: '  ' }] }), [])

console.log('redirect-mode: semua cek lolos')
