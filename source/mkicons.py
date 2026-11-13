from PIL import Image, ImageDraw
import os
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
def make(n, path):
    s = 4
    N = n * s
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.rounded_rectangle([0, 0, N - 1, N - 1], radius=int(N * 0.22), fill=(7, 16, 19, 255))
    k = N / 512
    pts = [(60, 330), (200, 330), (222, 230), (250, 400), (276, 300), (300, 330), (452, 330)]
    dr.line([(x * k, y * k) for x, y in pts], fill=(45, 212, 191, 255), width=int(22 * k), joint='curve')
    r = 34 * k
    dr.ellipse([330 * k - r, 140 * k - r, 330 * k + r, 140 * k + r], fill=(45, 212, 191, 255))
    im = im.resize((n, n), Image.LANCZOS)
    if path.endswith('apple-touch-icon.png'):
        bg = Image.new('RGB', (n, n), (7, 16, 19)); bg.paste(im, (0, 0), im); im = bg
    im.save(os.path.join(d, path))
make(192, 'icon-192.png'); make(512, 'icon-512.png'); make(180, 'apple-touch-icon.png')
print('icons ok')
