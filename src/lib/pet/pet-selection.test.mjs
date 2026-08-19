import assert from 'node:assert/strict'
import { selectPetCharacter, petDisplayName } from './pet-selection.mjs'

// id tak dikenal jatuh ke default
assert.equal(selectPetCharacter({ pet_character_id: 'tidak-ada' }).id, 'widodo')

// profil lama tanpa kolom pet tetap dapat pet default
assert.equal(selectPetCharacter({}).id, 'widodo')
assert.equal(selectPetCharacter(null).id, 'widodo')

// pet dimatikan = tidak ada pet
assert.equal(selectPetCharacter({ pet_enabled: false }), null)
assert.equal(petDisplayName({ pet_enabled: false }), null)

// kedua karakter bisa dipilih tier mana pun (tidak ada kunci tier di katalog)
assert.equal(selectPetCharacter({ pet_character_id: 'saraswati', tier: 'FREE' }).id, 'saraswati')
assert.equal(selectPetCharacter({ pet_character_id: 'widodo', tier: 'PREMIUM' }).id, 'widodo')

// nama panggilan menang atas nama bawaan; kosong balik ke bawaan
assert.equal(petDisplayName({ pet_name: 'Bejo' }), 'Bejo')
assert.equal(petDisplayName({ pet_name: '   ' }), 'Widodo')
assert.equal(petDisplayName({ pet_character_id: 'saraswati' }), 'Saraswati')

console.log('pet-selection ok')
