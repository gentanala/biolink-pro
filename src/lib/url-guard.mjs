// Penjaga untuk URL yang diketik user sebelum diambil oleh server.
//
// Tanpa ini, user bisa menyuruh server kita menembak alamat internal yang
// tidak bisa dia jangkau sendiri (SSRF) — misal metadata cloud atau layanan
// yang cuma hidup di jaringan lokal. Jadi: cuma http/https, dan alamat hasil
// resolusi DNS harus benar-benar publik.

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'ip6-localhost'])

/** Protokol selain http/https (file:, gopher:, data:, ...) langsung ditolak. */
export function hasAllowedProtocol(url) {
    try {
        return ['http:', 'https:'].includes(new URL(url).protocol)
    } catch {
        return false
    }
}

export function isBlockedHostname(hostname) {
    const h = String(hostname || '').toLowerCase().replace(/\.$/, '')
    if (!h) return true
    if (BLOCKED_HOSTNAMES.has(h)) return true
    // .local / .internal / .home dipakai jaringan rumah & kantor, bukan internet publik.
    return /\.(local|internal|localdomain|home|lan)$/.test(h)
}

/** IP privat, loopback, link-local, dan alamat khusus lain. */
export function isBlockedAddress(ip) {
    const a = String(ip || '').trim().toLowerCase()
    if (!a) return true

    // IPv4-mapped IPv6 (::ffff:10.0.0.1) harus dinilai sebagai IPv4-nya.
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isBlockedAddress(mapped[1])

    if (a.includes(':')) {
        if (a === '::' || a === '::1') return true
        // fc00::/7 unique-local, fe80::/10 link-local
        return /^f[cd]/.test(a) || /^fe[89ab]/.test(a)
    }

    const p = a.split('.')
    if (p.length !== 4) return true
    const [x, y] = p.map(Number)
    if (p.some((n) => !/^\d+$/.test(n) || Number(n) > 255)) return true

    if (x === 0 || x === 127 || x === 10) return true          // this-network, loopback, private
    if (x === 172 && y >= 16 && y <= 31) return true            // private
    if (x === 192 && y === 168) return true                     // private
    if (x === 169 && y === 254) return true                     // link-local + cloud metadata
    if (x === 100 && y >= 64 && y <= 127) return true           // carrier-grade NAT
    if (x >= 224) return true                                   // multicast + reserved
    return false
}
