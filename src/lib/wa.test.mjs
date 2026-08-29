import assert from 'node:assert/strict'
import { normalizeWhatsapp, whatsappLink } from './wa.mjs'

// bentuk-bentuk yang biasa diketik pengunjung
assert.equal(normalizeWhatsapp('0812-3456-7890'), '6281234567890')
assert.equal(normalizeWhatsapp('+62 812 3456 7890'), '6281234567890')
assert.equal(normalizeWhatsapp('62 812 3456 7890'), '6281234567890')
assert.equal(normalizeWhatsapp('812 3456 7890'), '6281234567890')
assert.equal(normalizeWhatsapp('0062 812 3456 7890'), '6281234567890')

// nomor luar negeri lewat 00/+ tetap utuh
assert.equal(normalizeWhatsapp('+1 415 555 0132'), '14155550132')

// yang tidak bisa dipakai
assert.equal(normalizeWhatsapp(''), null)
assert.equal(normalizeWhatsapp(null), null)
assert.equal(normalizeWhatsapp('-'), null)
assert.equal(normalizeWhatsapp('12345'), null)

assert.equal(whatsappLink('0812-3456-7890'), 'https://wa.me/6281234567890')
assert.equal(whatsappLink('abc'), null)

console.log('wa ok')
