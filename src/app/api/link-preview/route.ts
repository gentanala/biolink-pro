import { NextResponse } from 'next/server'
import { lookup } from 'node:dns/promises'
import { hasAllowedProtocol, isBlockedAddress, isBlockedHostname } from '@/lib/url-guard.mjs'

// Ambil gambar & judul dari halaman tujuan supaya kartu pintasan punya thumbnail.
// Dipanggil sekali saat user menyimpan pintasan; hasilnya ikut disimpan di profil,
// jadi halaman /switch tidak menembak internet tiap kali dibuka.

const FETCH_TIMEOUT_MS = 6000
// Situs besar menyelipkan skrip raksasa sebelum meta-nya — YouTube menaruh
// og:image di sekitar 690 KB — jadi batasnya harus di atas itu, tapi tetap ada.
const MAX_BYTES = 2 * 1024 * 1024

const pick = (html: string, patterns: RegExp[]) => {
    for (const re of patterns) {
        const m = html.match(re)
        if (m?.[1]) return m[1].trim()
    }
    return null
}

const decode = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')

export async function GET(request: Request) {
    const raw = new URL(request.url).searchParams.get('url')?.trim()
    if (!raw) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    if (!hasAllowedProtocol(withScheme)) {
        return NextResponse.json({ error: 'unsupported protocol' }, { status: 400 })
    }

    let target: URL
    try {
        target = new URL(withScheme)
    } catch {
        return NextResponse.json({ error: 'invalid url' }, { status: 400 })
    }

    if (isBlockedHostname(target.hostname)) {
        return NextResponse.json({ error: 'host not allowed' }, { status: 400 })
    }

    // Nama boleh terlihat publik tapi menunjuk ke alamat internal, jadi yang
    // dinilai adalah hasil resolusinya — bukan tulisannya.
    try {
        const resolved = await lookup(target.hostname, { all: true })
        if (!resolved.length || resolved.some((r) => isBlockedAddress(r.address))) {
            return NextResponse.json({ error: 'host not allowed' }, { status: 400 })
        }
    } catch {
        return NextResponse.json({ error: 'host not found' }, { status: 400 })
    }

    try {
        const res = await fetch(target, {
            redirect: 'follow',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: {
                'user-agent': 'Mozilla/5.0 (compatible; GentanalaPreview/1.0)',
                accept: 'text/html,application/xhtml+xml',
            },
        })

        if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) {
            return NextResponse.json({ image: null, title: null, siteName: target.hostname })
        }

        // Baca secukupnya saja — halaman berat tidak boleh menahan request ini.
        const reader = res.body?.getReader()
        let html = ''
        if (reader) {
            const decoder = new TextDecoder()
            let bytes = 0
            while (bytes < MAX_BYTES) {
                const { done, value } = await reader.read()
                if (done) break
                bytes += value.byteLength
                html += decoder.decode(value, { stream: true })
                if (html.includes('</head>')) break
            }
            await reader.cancel().catch(() => { })
        }

        const image = pick(html, [
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
            /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
        ])

        const title = pick(html, [
            /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
            /<title[^>]*>([^<]+)<\/title>/i,
        ])

        return NextResponse.json({
            image: image ? decode(new URL(image, target).toString()) : null,
            title: title ? decode(title).slice(0, 120) : null,
            siteName: target.hostname.replace(/^www\./, ''),
        })
    } catch {
        // Preview itu pemanis. Gagal ambil gambar tidak boleh menggagalkan simpan.
        return NextResponse.json({ image: null, title: null, siteName: target.hostname.replace(/^www\./, '') })
    }
}
