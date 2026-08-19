# Pet Assistant — Desain Batch 1

Tanggal: 2026-08-19
Status: disetujui untuk masuk tahap rencana implementasi

## 1. Ringkasan

Setiap pemilik kartu punya satu karakter pixel art ("pet") yang jadi asisten pribadinya.
Pas pengunjung membuka profil publik, pet-nya muncul bergerak dan menyapa, lalu mengecil
dan nongkrong di pojok layar sebagai tombol asisten yang hidup.

Batch 1 hanya mengerjakan **pet-nya**. Fitur dandan-dandanan, toko item, mode tamagotchi,
dan otak AI beneran adalah batch berikutnya. Desain ini dibuat supaya batch-batch itu
bisa numpang di atasnya tanpa membongkar ulang.

### Tujuan yang mau dicapai

1. Pengunjung yang tap kartu langsung dapat kejutan yang bikin dia inget dan cerita ke orang lain.
2. Pemilik kartu merasa profilnya "punya karakter", bukan sekadar daftar link.
3. Ada alasan konkret buat upgrade ke Premium (karakter terkunci).
4. Pondasi aset dan datanya siap menampung item dandanan tanpa gambar ulang karakter.

## 2. Ruang lingkup

### Masuk batch 1

- Katalog 6 karakter pixel art (3 gratis, 3 Premium).
- Pet muncul dan melambai di layar sapaan pembuka profil publik `/[slug]`.
- Pet mendarat di pojok kanan bawah, animasi diam (idle) berulang.
- Gelembung sapaan otomatis dari data profil + waktu setempat pengunjung.
- Tap pet membuka panel chat asisten (jawaban template yang sudah ada di `AIAssistant.tsx`,
  komponennya sudah ditulis tapi belum pernah dipasang di profil publik).
- Halaman dashboard `Asisten`: pilih karakter, kasih nama pet, nyalakan/matikan sapaan, preview.
- Aturan kunci Premium pada karakter.

### Tidak masuk batch 1

- Item dandanan (topi, baju), inventaris, toko, dan pembayaran item.
- Mode tamagotchi layar penuh.
- Otak AI beneran (mengganti jawaban template) — batch 2.
- Suara / text-to-speech pet.
- Pet di halaman `/tap/[uuid]` versi serial independen (`ProfileView`). Rute `/tap/[uuid]`
  pada kondisi normal sudah melempar pengunjung ke `/[slug]`, jadi surface ini jarang kepakai.
  Ditangani di batch terpisah.

## 3. Alur pengalaman pengunjung

Urutan waktu sejak profil dibuka:

1. **t = 0** — Layar sapaan (overlay) yang sudah ada terbuka. Kalau pet aktif, sprite pet
   tampil di atas teks sapaan sambil memainkan klip `greet` (melambai), sementara animasi
   ketik `welcome_word` yang sudah ada tetap jalan seperti sekarang.
2. **Setelah teks selesai diketik** — overlay menutup. Jeda tutupnya jadi 2000 ms saat pet
   aktif (sekarang 800 ms tanpa animasi spesial, 3500 ms dengan animasi spesial).
3. **+200 ms** — pet berpindah ke pojok kanan bawah sambil mengecil, lalu ganti ke klip `idle`
   yang berulang terus.
4. **Setelah mendarat** — gelembung sapaan muncul di sebelah pet selama 4 detik, lalu mengempis.
5. **Kapan saja** — pengunjung tap pet, panel chat asisten terbuka. Pet ganti ke klip `talk`
   selama panel terbuka.

Keputusan desain penting: kalimat sapaan **tidak** ditaruh di overlay, tapi di gelembung
setelah pet mendarat. Alasannya, overlay sudah punya teks ketik `welcome_word` milik pemilik
kartu — dua teks berebut perhatian di layar yang sama bikin berantakan, dan gelembung di pojok
justru menarik mata pengunjung ke pet yang bisa diajak ngobrol.

### Hormati fitur yang sudah ada

- Profil dengan animasi edisi spesial aktif (`shouldShowSpecialGreetingAnimation`) tetap
  menampilkan animasi spesialnya di overlay. Pet tidak ikut tampil di overlay, tapi tetap
  mendarat di pojok setelah overlay tutup. Tidak ada perilaku lama yang hilang.
- Profil dengan mode redirect aktif (`activeRedirectUrl`) tidak menampilkan pet sama sekali —
  pengunjung memang sedang dilempar ke tempat lain.

## 4. Arsitektur

Pemisahan tanggung jawab dibuat supaya tiap bagian bisa dites sendiri dan batch berikutnya
punya tempat menempel yang jelas.

| Berkas | Tanggung jawab | Bergantung pada |
| --- | --- | --- |
| `src/lib/pet/characters.ts` | Katalog karakter: id, nama, tier, jalur sprite, jumlah frame, titik jangkar | — |
| `src/lib/pet/pet-selection.mjs` | Menentukan karakter yang dipakai sebuah profil, aturan kunci tier, fallback | katalog |
| `src/lib/pet/pet-greeting.mjs` | Menyusun kalimat sapaan dari profil + jam | — |
| `src/components/pet/PetSprite.tsx` | Memutar satu klip sprite. Murni tampilan, tanpa tahu soal profil | katalog |
| `src/components/pet/PetGreeting.tsx` | Pet di dalam overlay sapaan | PetSprite |
| `src/components/pet/PetBuddy.tsx` | Pet di pojok + gelembung + tap membuka chat | PetSprite, pet-greeting |
| `src/app/[slug]/page.tsx` | Memasang ketiganya, mengatur urutan waktu | semua di atas |

`PetSprite` sengaja tidak tahu apa-apa soal profil atau Supabase: dia cuma terima
`characterId`, `clip`, dan `size`. Ini yang bikin dia bisa dipakai ulang di dashboard preview,
di mode tamagotchi nanti, dan di layar toko item nanti tanpa diubah.

### Perubahan pada komponen yang sudah ada

- `src/components/profile/AIAssistant.tsx` — tombol bulat (FAB) bawaannya tidak lagi selalu
  tampil. Komponennya menerima prop `open`, `onOpenChange`, dan `showFallbackTrigger`
  (default mati) supaya pemicunya dipegang `PetBuddy`, sementara tombol bulat lama tetap bisa
  dimunculkan sebagai cadangan waktu sprite pet gagal dimuat. Isi logika jawabannya tidak
  disentuh di batch 1.
- `src/lib/special-greeting.mjs` — `getWelcomeCloseDelay` menerima aturan baru: 2000 ms saat
  pet aktif dan animasi spesial tidak aktif. Urutan prioritas: animasi spesial (3500) >
  pet (2000) > default (800).
- `src/app/dashboard/ai-assistant/page.tsx` — blok "Coming Soon" diganti panel pemilih pet.
  Kunci Premium tingkat halaman dilepas (pet untuk semua tier); yang dikunci sekarang hanya
  karakter Premium di dalam pemilihnya.

## 5. Model data

Migrasi baru `supabase/migrations/012_pet_assistant.sql`:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pet_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS pet_character_id TEXT DEFAULT 'kabut',
ADD COLUMN IF NOT EXISTS pet_name TEXT DEFAULT NULL;
```

`supabase/complete-setup.sql` ikut diperbarui supaya database baru langsung punya kolom ini.

- `pet_enabled` — default menyala. Profil lama otomatis dapat pet default tanpa perlu
  menyentuh dashboard.
- `pet_character_id` — id dari katalog. Nilai tak dikenal diperlakukan sebagai default.
- `pet_name` — nama panggilan pet. Kosong berarti pakai nama bawaan karakter.

Kolom untuk item dandanan **belum** dibuat di batch 1. Saat batch dandanan jalan, tambahnya
satu kolom `pet_equipped JSONB` — tidak perlu mengubah kolom mana pun yang dibuat sekarang.

Tidak ada tabel baru dan tidak ada perubahan aturan akses (RLS): kolom ini menempel di
`profiles` yang aturan bacanya sudah publik untuk keperluan halaman profil.

## 6. Katalog karakter dan aturan tier

| id | Nama | Tier | Karakter |
| --- | --- | --- | --- |
| `kabut` | Kabut | Gratis | Gumpalan kabut abu-kebiruan, mata tenang. Karakter bawaan. |
| `tetes` | Tetes | Gratis | Tetesan air biru muda, ceria |
| `tunas` | Tunas | Gratis | Tunas kecambah hijau bertunas di kepala |
| `bara` | Bara | Premium | Sosok mungil dengan kepala api oranye |
| `sinyal` | Sinyal | Premium | Robot TV tabung jadul, layar biru sebagai wajah |
| `lumut` | Lumut | Premium | Makhluk batu berlumut, cokelat-hijau |

Aturan kunci:

- Karakter Premium terbuka untuk tier `PREMIUM` dan `B2B` (pakai `getProfileTier` dari
  `src/lib/feature-gating.ts`). Tidak menambah kunci fitur baru di tabel `tier_configs`,
  supaya tidak ada dua sumber kebenaran.
- Pemilihan dikunci **saat menyimpan** di dashboard, dan divalidasi **lagi saat menampilkan**
  di profil publik. Kalau tier seseorang turun dari Premium ke Gratis, profilnya otomatis
  jatuh ke `kabut` — bukan menampilkan karakter berbayar secara gratis.
- Di dashboard, karakter terkunci tetap kelihatan dalam keadaan redup dengan label Premium.
  Itu etalase upgrade, bukan sekadar pembatas.

## 7. Spesifikasi aset pixel art

Ini bagian paling penting untuk masa depan fitur dandanan. Aturannya dikunci sekarang supaya
topi dan baju nanti tinggal ditumpuk, bukan digambar ulang per karakter.

### Ukuran dan tata letak

- Satu frame = **64 x 64 piksel**, latar transparan.
- Satu karakter = satu berkas sprite sheet PNG: **grid 6 kolom x 3 baris = 384 x 192 piksel**.
- Baris 0 = klip `idle`, baris 1 = klip `greet`, baris 2 = klip `talk`.
- Jumlah frame terpakai per klip: `idle` 4, `greet` 6, `talk` 4. Sel sisa di kanan dibiarkan
  transparan; jumlah frame yang dibaca diambil dari katalog, bukan ditebak dari lebar berkas.
- Jalur berkas: `public/pet/<id>.png`.

### Aturan penempatan karakter di dalam frame

- Kaki/dasar karakter menyentuh **y = 60** (sisakan 4 piksel di bawah untuk bayangan).
- Karakter berdiri di tengah horizontal, lebar maksimal **48 piksel**.
- Tinggi maksimal **56 piksel**.
- Menghadap depan di semua klip. Tidak ada rotasi atau perubahan skala antar frame.

### Titik jangkar (kontrak untuk item dandanan)

Setiap karakter mendeklarasikan titik jangkar di katalog, dalam koordinat piksel frame:

- `head` — titik tengah puncak kepala, tempat topi menempel.
- `body` — titik tengah dada, tempat baju menempel.

Aturan yang harus dipatuhi semua karakter: posisi `head` tidak boleh bergeser lebih dari
**1 piksel** di sepanjang klip `idle`. Kalau sebuah karakter bergerak lebih liar dari itu,
topinya akan terlihat lepas dari kepala saat batch dandanan jalan.

### Penampilan di layar

- Dirender dengan `image-rendering: pixelated`, skala bulat saja (jangan 1,5x).
- Ukuran di overlay sapaan: **192 px** (3x). Ukuran di pojok: **64 px** (1x).
- Animasi memakai CSS `steps()` menggeser `background-position`, bukan menumpuk elemen per
  frame — supaya ringan di HP kentang dan tidak membebani baterai.
- Menghormati `prefers-reduced-motion`: animasi berhenti di frame pertama, pet tetap tampil,
  gelembung sapaan tetap muncul, perpindahan ke pojok tanpa animasi terbang.

### Aset sementara

Batch 1 dikirim dengan 6 sprite sheet placeholder sederhana (siluet berwarna dengan mata)
yang dibuat programatik. Fungsinya supaya fitur bisa diuji dan dinilai sebelum gambar
sungguhan jadi. Menukar ke gambar final = menimpa berkas PNG-nya saja, tanpa mengubah kode
sama sekali. Prompt untuk membuat gambar finalnya ada di Lampiran A.

## 8. Logika kalimat sapaan

`buildPetGreeting({ profile, now })` menyusun satu kalimat, tanpa memanggil AI dan tanpa
menunggu jaringan.

Bagian waktu, memakai jam perangkat pengunjung:

| Jam | Sapaan |
| --- | --- |
| 04:00–10:59 | Pagi |
| 11:00–14:59 | Siang |
| 15:00–17:59 | Sore |
| 18:00–03:59 | Malam |

Susunan kalimat:

- Nama pet ada dan nama pemilik ada: `"{Waktu}! Aku {petName}, asistennya {displayName}."`
- Nama pet kosong: pakai nama bawaan karakter dari katalog.
- Nama pemilik kosong: `"{Waktu}! Aku {petName}, asisten kartu ini."`
- Kalau `job_title` terisi, tambahkan kalimat kedua: `"Mau tahu soal {displayName}? Tanya aku."`

Fungsi ini ditulis sebagai `.mjs` murni tanpa React supaya bisa diuji langsung, mengikuti
pola `src/lib/special-greeting.mjs` yang sudah ada.

## 9. Dashboard

Halaman `/dashboard/ai-assistant` diganti isinya, judul jadi **Asisten**:

1. **Preview** — pet terpilih dalam ukuran besar memainkan klip `greet`, plus contoh kalimat
   sapaan persis seperti yang akan dilihat pengunjung.
2. **Pemilih karakter** — grid 6 kartu. Kartu Premium yang terkunci tampil redup, ada lencana
   Premium, dan menekannya membuka ajakan upgrade yang sudah ada (`PremiumLock`).
3. **Nama pet** — kolom teks, maksimal 20 karakter.
4. **Sakelar** — nyalakan/matikan pet di profil publik.
5. **Simpan** — memakai pola simpan yang sama dengan halaman dashboard lain.

Menu sidebar diganti namanya dari "AI Assistant" jadi "Asisten", ikonnya tetap.

## 10. Penanganan kegagalan

| Kejadian | Yang terjadi |
| --- | --- |
| Sprite gagal dimuat (jaringan/berkas hilang) | Pet tidak ditampilkan sama sekali. Panel chat tetap bisa dibuka lewat tombol bulat cadangan. Tidak ada gambar rusak di layar pengunjung. |
| `pet_character_id` tidak ada di katalog | Jatuh ke `kabut`. |
| Karakter Premium tapi tier bukan Premium | Jatuh ke `kabut`. Dashboard menampilkan catatan kenapa. |
| `pet_enabled` mati | Tidak ada pet dan tidak ada tombol chat. Profil kembali persis seperti sekarang. |
| Profil sedang mode redirect | Pet dilewati sepenuhnya. |
| Kolom pet belum ada di database (migrasi belum jalan) | Nilai dianggap default, pet tampil dengan karakter bawaan. Tidak ada layar error. |

## 11. Akses chat di batch 1

Panel chat template terbuka untuk semua tier di batch 1. Isinya hanya memantulkan data yang
memang sudah publik di halaman profil (nama, jabatan, perusahaan, bio, tombol kontak), jadi
tidak ada informasi baru yang bocor.

Keputusan siapa yang berhak atas chat AI beneran diambil di batch 2, waktu biayanya sudah
kelihatan.

## 12. Pengujian

Tes otomatis (mengikuti pola `*.test.mjs` yang sudah ada di `src/lib/`):

- `pet-greeting.test.mjs` — empat rentang waktu, nama pet kosong, nama pemilik kosong,
  jabatan kosong.
- `pet-selection.test.mjs` — id tak dikenal jatuh ke default, karakter Premium ditolak untuk
  tier gratis, diterima untuk `PREMIUM` dan `B2B`, `pet_enabled` mati mengembalikan "tidak ada pet".

Pemeriksaan manual sebelum dianggap selesai:

- `npm run lint` dan `npm run build` bersih.
- Buka satu profil gratis: pet bawaan menyapa, mendarat, gelembung muncul lalu hilang, tap
  membuka chat.
- Buka satu profil dengan animasi edisi spesial menyala: animasi spesial tetap menang di
  overlay, pet tetap mendarat di pojok.
- Buka profil dengan pet dimatikan: tampilannya sama persis seperti sebelum fitur ini ada.

## 13. Rencana batch berikutnya

Urutan ini yang desainnya sudah disiapkan:

1. **Batch 2 — otak AI.** Ganti isi jawaban `AIAssistant` dengan jawaban model, dibatasi
   pengetahuannya pada data profil. Perlu pagar biaya dan pembatasan jumlah pesan.
2. **Batch 3 — dandanan.** Tambah kolom `pet_equipped`, katalog item yang memakai titik
   jangkar `head`/`body`, dan layar dandan di dashboard.
3. **Batch 4 — toko item.** Pembayaran, kepemilikan item, riwayat.
4. **Batch 5 — mode tamagotchi.** Layar penuh, memakai `PetSprite` yang sama dengan klip
   tambahan.

---

## Lampiran A — Prompt untuk membuat gambar karakter

### Cara pakai

Model gambar AI tidak bisa diandalkan mengeluarkan sprite sheet 384x192 yang presisi. Alurnya:

1. Generate **satu karakter, satu pose, satu gambar** dengan prompt di bawah, ukuran besar
   (1024x1024) bergaya pixel art.
2. Kecilkan ke 64x64 dengan metode *nearest neighbor* (Photoshop: Image Size → Nearest Neighbor;
   atau alat gratis seperti Piskel/Aseprite).
3. Rapikan tepi dan hapus latar sampai benar-benar transparan.
4. Susun frame-nya ke dalam grid 6x3 sesuai Bagian 7.

Generate ulang pose berikutnya dengan prompt yang sama, ganti bagian **POSE** saja. Sertakan
gambar hasil pertama sebagai referensi supaya karakternya konsisten.

### Blok gaya (tempel di setiap prompt)

```
16-bit pixel art sprite, chunky readable pixels, front-facing full body,
single character centered, standing on flat ground, soft top-down light,
limited palette of 6 colors, thick 1px dark outline, subtle dithering only for shading,
cute mascot proportions with oversized head and tiny body, friendly rounded shapes,
plain solid background, no text, no logo, no shadow on background,
no gradient background, game asset style
```

### Prompt per karakter

Ganti `[POSE]` dengan salah satu: `standing still, arms relaxed` (idle) /
`waving one arm high, cheerful` (greet) / `mouth open mid-speech, one arm gesturing forward` (talk).

**1. Kabut (gratis, karakter bawaan)**
```
A small soft mist cloud creature, dusty blue-grey body with pale edges,
two calm half-closed eyes, tiny stubby arms, faint wisps trailing at the bottom,
[POSE].
+ blok gaya
```

**2. Tetes (gratis)**
```
A cheerful water droplet creature, translucent cyan body with a white highlight spot,
big round bright eyes, small blush marks, tiny flat feet,
[POSE].
+ blok gaya
```

**3. Tunas (gratis)**
```
A small pale-cream seedling creature with a bright green sprout with two leaves
growing from the top of its head, simple dot eyes, tiny round body,
[POSE].
+ blok gaya
```

**4. Bara (Premium)**
```
A tiny cream-colored creature with a burning orange flame instead of hair on its head,
warm glow on its face, calm confident eyes, small sturdy body,
[POSE].
+ blok gaya
```

**5. Sinyal (Premium)**
```
A retro CRT television robot, boxy white-grey body, glowing blue screen as a face
showing two simple pixel eyes, thin antenna with a small ball on top, short blocky legs,
[POSE].
+ blok gaya
```

**6. Lumut (Premium)**
```
A round mossy stone creature, brown rock body covered in patches of green moss,
two sleepy dark eyes peeking out, tiny stubby limbs, small mushroom on its shoulder,
[POSE].
+ blok gaya
```

### Yang harus dicek sebelum aset dipakai

- Latar benar-benar transparan, bukan putih.
- Karakter tidak menyentuh tepi kiri/kanan frame (sisakan minimal 8 piksel).
- Kaki menyentuh y = 60, tinggi tidak lebih dari 56 piksel.
- Puncak kepala tidak bergeser lebih dari 1 piksel antar frame `idle`. Kalau meleset, geser
  manual di editor piksel — ini yang bikin topi nanti pas di kepala.

### Prompt untuk item dandanan (batch 3, disimpan di sini biar tidak hilang)

```
16-bit pixel art [NAMA ITEM] only, no character, no head, floating on transparent background,
front-facing, chunky readable pixels, limited palette of 4 colors, thick 1px dark outline,
sized to fit a 64x64 sprite where the head is 24 pixels wide, game asset style
```
