# Gambar sumber karakter pet

Satu PNG besar per pose: `<id>-idle.png`, `<id>-greet.png`, `<id>-talk.png`.
Ukuran dan latarnya bebas — boleh transparan, boleh chroma magenta; skrip
pembangunnya merapikan sendiri.

Menyusun ulang sprite sheet setelah gambar diganti atau ditambah:

    python3 scripts/build_pet_sprites.py

Hasilnya menimpa `public/pet/<id>.png` (lembar 384x192, 6 kolom x 3 baris).
Aturan rig-nya ada di `docs/superpowers/specs/2026-08-19-pet-assistant-design.md`
bagian 7 — skrip menormalkan tinggi karakter ke 52 px dengan kaki di y=60,
jadi karakter baru tidak perlu digambar presisi di grid.
