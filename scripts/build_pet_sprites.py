"""Menyusun sprite sheet pet dari gambar karakter yang dikirim ilustrator.

Sumbernya satu PNG besar per pose (idle/greet/talk) di art/pet/.
Skrip ini merapikan latar, mengecilkan ke rig 64x64 sesuai Bagian 7 spesifikasi
(tinggi 52 px, kaki menyentuh y=60, pusat x=32), lalu menyusunnya jadi lembar
6 kolom x 3 baris di public/pet/<id>.png.

Frame animasinya dibuat dari satu pose per klip dengan geseran 1 px — cukup
untuk kesan bernapas/melambai tanpa minta ilustrator menggambar tiap frame.

Jalankan: python3 scripts/build_pet_sprites.py
"""

from PIL import Image

FRAME = 64
COLS, ROWS = 6, 3
RIG_HEIGHT = 52      # tinggi karakter di dalam frame
FEET_Y = 60          # garis kaki, sisakan 4 px untuk bayangan
CENTER_X = 32

# (baris, daftar geseran (dx, dy) per frame) — panjang daftar = jumlah frame
CLIPS = {
    'idle': (0, [(0, 0), (0, -1), (0, 0), (0, -1)]),
    'greet': (1, [(0, 0), (1, -1), (1, -1), (0, 0), (-1, -1), (-1, -1)]),
    'talk': (2, [(0, 0), (0, -1), (0, 0), (0, -1)]),
}

CHARACTERS = ['widodo', 'saraswati']


def is_magenta(p):
    r, g, b, _ = p
    return r > 140 and b > 110 and g < 95


def is_magenta_fringe(p):
    """Sisa tepi latar chroma yang setengah menyatu dengan karakter.
    Aman dibuang menyeluruh: palet kedua karakter tidak punya nada magenta."""
    r, g, b, a = p
    return a > 0 and r > 105 and b > 75 and g < 0.62 * (r + b) / 2


def strip_background(im):
    """Latar magenta dibuang lewat isi-banjir dari tepi; gambar yang sudah
    transparan cukup dipertegas ambangnya supaya tepinya tetap tajam."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()

    corner_opaque = px[0, 0][3] > 128
    if corner_opaque:
        seeds = []
        for x in range(w):
            seeds += [(x, 0), (x, h - 1)]
        for y in range(h):
            seeds += [(0, y), (w - 1, y)]

        seen = set()
        stack = [s for s in seeds if is_magenta(px[s])]
        seen.update(stack)
        while stack:
            x, y = stack.pop()
            px[x, y] = (0, 0, 0, 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and is_magenta(px[nx, ny]):
                    seen.add((nx, ny))
                    stack.append((nx, ny))

    # Ambang alfa: pixel art tidak boleh punya tepi setengah transparan.
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if corner_opaque and is_magenta_fringe(p):
                px[x, y] = (0, 0, 0, 0)
                continue
            r, g, b, a = p
            px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    return im


def to_rig(path):
    """Satu pose besar -> satu frame 64x64 yang sudah duduk di rig."""
    im = strip_background(Image.open(path))
    box = im.getbbox()
    if not box:
        raise SystemExit(f'{path}: gambarnya kosong setelah latar dibuang')
    im = im.crop(box)

    scale = RIG_HEIGHT / im.height
    width = max(1, round(im.width * scale))
    if width > FRAME - 4:                      # jaga jarak dari tepi frame
        scale = (FRAME - 4) / im.width
        width = FRAME - 4
    height = max(1, round(im.height * scale))
    im = im.resize((width, height), Image.NEAREST)

    frame = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    frame.paste(im, (CENTER_X - width // 2, FEET_Y - height), im)
    return frame


def build(character):
    sheet = Image.new('RGBA', (FRAME * COLS, FRAME * ROWS), (0, 0, 0, 0))
    for clip, (row, offsets) in CLIPS.items():
        base = to_rig(f'art/pet/{character}-{clip}.png')
        for i, (dx, dy) in enumerate(offsets):
            sheet.paste(base, (i * FRAME + dx, row * FRAME + dy), base)
    out = f'public/pet/{character}.png'
    sheet.save(out)
    print(f'{out} <- {len(CLIPS)} klip')


for character in CHARACTERS:
    build(character)
