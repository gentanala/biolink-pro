# Panduan Deploy Gentanala BioLink 🚀

Halo bro! Ini panduan langkah-demi-langkah buat deploy website lo biar bisa diakses orang luar. Tenang aja, gue bikin sesimpel mungkin.

## Langkah 1: Persiapan Akun (Cuma Sekali)
Lo perlu bikin akun di 2 tempat ini kalau belum punya:
1. **GitHub** ([github.com](https://github.com)): Buat nyimpen kode website lo.
2. **Vercel** ([vercel.com](https://vercel.com)): Buat nge-host website lo biar 'live'. (Login pake akun GitHub aja biar sinkron).

---

## Langkah 2: Upload Kode ke GitHub (Gue Bantu Command-nya)
Buka terminal lo, terus copy-paste command ini satu-satu (Gue udah bantu commit kodenya):

```bash
# 1. Bikin repo baru di GitHub (lo harus ke github.com/new dulu)
# 2. Setelah bikin repo, copy link-nya (misal: https://github.com/rezanje/biolink-pro.git)
# 3. Jalanin ini di terminal:
git remote add origin [LINK_REPO_LO_TADI]
git branch -M main
git push -u origin main
```

---

## Langkah 3: Deploy ke Vercel
1. Buka dashboard **Vercel**.
2. Klik **"Add New"** -> **"Project"**.
3. Cari repo GitHub lo yang barusan di-upload (`biolink-pro`), terus klik **"Import"**.
4. Di bagian **Environment Variables**, masukkan data dari file `.env.local` lo:
   - `NEXT_PUBLIC_SUPABASE_URL` = [isi dari env.local]
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = [isi dari env.local]
   - `NEXT_PUBLIC_SITE_URL` = [URL Vercel lo nanti, misal: https://biolink-pro.vercel.app]
5. Klik **"Deploy"**. Selesai!

---

## Langkah 4: Sinkronisasi Supabase (PENTING!)
Biar login-nya gak error di web asli:
1. Buka **Supabase Dashboard**.
2. Masuk ke **Authentication** -> **URL Configuration**.
3. Di **Site URL**, ganti `localhost:3000` jadi link Vercel lo.
4. Di **Redirect URLs**, tambahin link Vercel lo + `/auth/callback`.

---

Kalau ada yang bingung di tengah jalan, langsung tanya gue aja ya bro! Mantap! 🔥
