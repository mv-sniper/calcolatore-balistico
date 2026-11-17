# Genera le icone dell'app (mirino stilizzato con punto rosso). Esecuzione: python3 -I tools/make_icons.py <cartella_uscita>
import sys, os
from PIL import Image, ImageDraw

out = sys.argv[1]
os.makedirs(out, exist_ok=True)

def draw(size, maskable=False):
    S = size * 4  # supercampionamento
    img = Image.new('RGB', (S, S), (20, 24, 29))
    d = ImageDraw.Draw(img)
    c = S / 2
    r = S * (0.30 if maskable else 0.38)  # le icone "maskable" restano nella zona sicura (80%)
    w = max(2, int(S * 0.018))
    d.ellipse([c - r, c - r, c + r, c + r], outline=(232, 235, 238), width=w)
    a = r * 1.22
    d.line([c - a, c, c + a, c], fill=(232, 235, 238), width=w)
    d.line([c, c - a, c, c + a], fill=(232, 235, 238), width=w)
    # tacche sul tratto verticale inferiore (richiamo al reticolo a MRAD)
    for i in range(1, 5):
        y = c + i * r * 0.22
        t = r * (0.12 if i % 2 else 0.2)
        d.line([c - t, y, c + t, y], fill=(232, 235, 238), width=w)
    # punto rosso (punto di mira con correzione)
    py = c + r * 0.66
    pr = r * 0.12
    d.ellipse([c - pr, py - pr, c + pr, py + pr], fill=(209, 26, 26))
    return img.resize((size, size), Image.LANCZOS)

draw(192).save(os.path.join(out, 'icon-192.png'))
draw(512).save(os.path.join(out, 'icon-512.png'))
draw(512, True).save(os.path.join(out, 'icon-maskable-512.png'))
draw(180).save(os.path.join(out, 'apple-touch-icon.png'))
print('icone create in', out)
