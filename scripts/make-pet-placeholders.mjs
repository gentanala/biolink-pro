// Membuat sprite sheet placeholder untuk pet (siluet rig + mata).
// Dipakai sampai gambar karakter final jadi; menukar ke gambar final cukup
// menimpa PNG di public/pet/ tanpa menyentuh kode.
//
// Jalankan: node scripts/make-pet-placeholders.mjs
//
// Mengikuti spesifikasi rig di docs/superpowers/specs/2026-08-19-pet-assistant-design.md:
// frame 64x64, grid 6x3 (idle/greet/talk), kaki di y=60, puncak kepala y=8,
// kepala 26px pusat x=32, badan 20px dari y=34, tangan di (18,44) dan (46,44).

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const FRAME = 64, COLS = 6, ROWS = 3
const W = FRAME * COLS, H = FRAME * ROWS

function crc32(buf) {
    let c, table = crc32.table
    if (!table) {
        table = crc32.table = []
        for (let n = 0; n < 256; n++) {
            c = n
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
            table[n] = c >>> 0
        }
    }
    c = 0xffffffff
    for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
}

function png(rgba) {
    const raw = Buffer.alloc((W * 4 + 1) * H)
    for (let y = 0; y < H; y++) {
        raw[y * (W * 4 + 1)] = 0
        rgba.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
    }
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
    ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ])
}

function makeSheet({ body, outline, accent }) {
    const px = Buffer.alloc(W * H * 4)
    const put = (fx, fy, x, y, [r, g, b]) => {
        if (x < 0 || x >= FRAME || y < 0 || y >= FRAME) return
        const i = ((fy * FRAME + y) * W + fx * FRAME + x) * 4
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255
    }
    const rect = (fx, fy, x0, y0, x1, y1, c) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(fx, fy, x, y, c)
    }
    const disc = (fx, fy, cx, cy, r, c) => {
        for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
            if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(fx, fy, x, y, c)
    }

    // Satu frame karakter. bob menggeser badan (bukan kepala) 1px; armUp
    // mengangkat tangan kanan untuk klip greet; mouth membuka mulut untuk talk.
    const drawFrame = (fx, fy, { bob = 0, armUp = 0, mouth = 0 } = {}) => {
        disc(fx, fy, 32, 21, 14, outline)          // kepala: pusat (32, 8+13), diameter 26
        disc(fx, fy, 32, 21, 12, body)
        rect(fx, fy, 22, 34 + bob, 42, 60, outline) // badan 20px lebar, sampai garis kaki y=60
        rect(fx, fy, 24, 36 + bob, 40, 58, accent)
        rect(fx, fy, 15, 42 + bob, 20, 47 + bob, outline) // tangan kiri sekitar (18,44)
        if (armUp) rect(fx, fy, 44, 42 - armUp * 14, 49, 47 - armUp * 14, outline) // lambaian
        else rect(fx, fy, 44, 42 + bob, 49, 47 + bob, outline) // tangan kanan (46,44)
        put(fx, fy, 27, 19, outline); put(fx, fy, 28, 19, outline) // mata kiri
        put(fx, fy, 36, 19, outline); put(fx, fy, 37, 19, outline) // mata kanan
        if (mouth) rect(fx, fy, 30, 26, 34, 26 + mouth, outline)   // mulut bicara
        else rect(fx, fy, 30, 26, 34, 26, outline)
    }

    for (let f = 0; f < 4; f++) drawFrame(f, 0, { bob: f % 2 })                    // idle
    for (let f = 0; f < 6; f++) drawFrame(f, 1, { armUp: f % 2 ? 1 : 0 })          // greet
    for (let f = 0; f < 4; f++) drawFrame(f, 2, { mouth: f % 2 ? 2 : 0 })          // talk
    return png(px)
}

writeFileSync('public/pet/widodo.png', makeSheet({
    body: [138, 116, 96], outline: [60, 48, 40], accent: [128, 158, 184], // kemeja biru muda
}))
writeFileSync('public/pet/saraswati.png', makeSheet({
    body: [150, 122, 100], outline: [60, 48, 40], accent: [96, 168, 158], // kebaya tosca
}))
console.log('sprite placeholder dibuat: public/pet/widodo.png, public/pet/saraswati.png')
