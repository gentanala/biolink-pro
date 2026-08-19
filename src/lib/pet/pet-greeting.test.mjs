import assert from 'node:assert/strict'
import { buildPetGreeting } from './pet-greeting.mjs'

const at = (hour) => new Date(2026, 7, 19, hour, 0, 0)
const profile = { display_name: 'Reza', pet_name: 'Bejo' }

// empat rentang waktu
assert.match(buildPetGreeting({ profile, now: at(7) }), /^Pagi!/)
assert.match(buildPetGreeting({ profile, now: at(12) }), /^Siang!/)
assert.match(buildPetGreeting({ profile, now: at(16) }), /^Sore!/)
assert.match(buildPetGreeting({ profile, now: at(20) }), /^Malam!/)
assert.match(buildPetGreeting({ profile, now: at(2) }), /^Malam!/)

// nama pet kosong -> nama bawaan karakter
assert.equal(
    buildPetGreeting({ profile: { display_name: 'Reza' }, now: at(7) }),
    'Pagi! Aku Widodo, asistennya Reza.'
)

// nama pemilik kosong -> "asisten kartu ini"
assert.equal(
    buildPetGreeting({ profile: { pet_name: 'Bejo' }, now: at(7) }),
    'Pagi! Aku Bejo, asisten kartu ini.'
)

// jabatan terisi -> kalimat kedua
assert.equal(
    buildPetGreeting({ profile: { display_name: 'Reza', job_title: 'CEO' }, now: at(12) }),
    'Siang! Aku Widodo, asistennya Reza. Mau tahu soal Reza? Tanya aku.'
)

// pet mati -> null
assert.equal(buildPetGreeting({ profile: { pet_enabled: false }, now: at(7) }), null)

console.log('pet-greeting ok')
