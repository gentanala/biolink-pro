// Menyusun tautan chat WhatsApp dari nomor yang diketik pengunjung.
//
// Pengunjung menulis nomornya sesuka hati: "0812-3456-7890", "+62 812 3456 7890",
// "62812...", kadang cuma "812...". WhatsApp cuma mau angka dengan kode negara,
// jadi semua bentuk itu dirapikan di sini — bukan di dalam komponen, supaya
// bisa dites dan dipakai ulang di layar mana pun.

/** Nomor rapi berformat internasional tanpa tanda baca, atau null kalau tidak masuk akal. */
export function normalizeWhatsapp(raw, defaultCountry = '62') {
    if (!raw) return null

    let digits = String(raw).replace(/\D/g, '')
    if (!digits) return null

    // 00 di depan = cara lain menulis "+"
    if (digits.startsWith('00')) digits = digits.slice(2)
    // 0 di depan = nomor lokal, ganti dengan kode negara
    else if (digits.startsWith('0')) digits = defaultCountry + digits.slice(1)
    // Nomor Indonesia yang ditulis tanpa 0 maupun kode negara ("812...")
    else if (digits.startsWith('8') && defaultCountry === '62') digits = defaultCountry + digits

    // Terlalu pendek untuk nomor mana pun — jangan buat tautan yang pasti gagal.
    if (digits.length < 8 || digits.length > 15) return null
    return digits
}

/** Tautan chat WhatsApp, atau null kalau nomornya tidak bisa dipakai. */
export function whatsappLink(raw, defaultCountry = '62') {
    const number = normalizeWhatsapp(raw, defaultCountry)
    return number ? `https://wa.me/${number}` : null
}
