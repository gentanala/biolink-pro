// Katalog karakter pet.
//
// Ditulis sebagai .mjs murni (bukan .ts) supaya pet-selection dan tesnya bisa
// dijalankan langsung dengan node, mengikuti pola special-greeting.mjs.
//
// Kontrak aset (jangan diubah tanpa membaca Bagian 7 spesifikasi):
// - satu frame 64x64, sheet 6 kolom x 3 baris di public/pet/<id>.png
// - baris 0 idle, baris 1 greet, baris 2 talk
// - titik jangkar sama untuk semua karakter — tempat skin/item menempel nanti

export const PET_FRAME_SIZE = 64
export const PET_SHEET_COLS = 6

export const PET_CLIPS = {
    idle: { row: 0, frames: 4, fps: 4 },
    greet: { row: 1, frames: 6, fps: 6 },
    talk: { row: 2, frames: 4, fps: 6 },
}

export const PET_CHARACTERS = [
    {
        id: 'widodo',
        name: 'Widodo',
        sprite: '/pet/widodo.png',
        persona: 'Sabar, sopan, senior',
        anchors: { head: [32, 8], body: [32, 40], handLeft: [18, 44], handRight: [46, 44] },
    },
    {
        id: 'saraswati',
        name: 'Saraswati',
        sprite: '/pet/saraswati.png',
        persona: 'Cekatan, hangat, teratur',
        anchors: { head: [32, 8], body: [32, 40], handLeft: [18, 44], handRight: [46, 44] },
    },
]

export const DEFAULT_PET_ID = 'widodo'

export function getPetCharacter(id) {
    return PET_CHARACTERS.find((c) => c.id === id) || null
}
