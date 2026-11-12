"""Synthetic product photos of textiles for testing ShipSafe's listing vision model.

5 products x 2-3 colourways (SKUs). Each SKU gets its own photo, and each product gets
one 'range' photo showing every colourway together.
"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "pylib"))
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont  # noqa: E402

OUT = Path(sys.argv[1])
S = 1200  # scene size


def font(size, bold=False):
    p = Path(f"C:/Windows/Fonts/{'arialbd' if bold else 'arial'}.ttf")
    return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default(size)


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def jitter(c, rnd, a=10):
    return tuple(max(0, min(255, v + rnd.randint(-a, a))) for v in c)


# ---------- textures ----------

def grain(img, strength=4):
    n = Image.effect_noise(img.size, 40).point(lambda v: max(0, min(255, 238 + (v - 128) // strength)))
    return ImageChops.multiply(img, Image.merge("RGB", (n, n, n)))


def weave(img, step=3, dark=246):
    w, h = img.size
    t = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(t)
    for x in range(0, w, step):
        d.line([x, 0, x, h], fill=dark)
    for y in range(0, h, step * 2):
        d.line([0, y, w, y], fill=dark + 4)
    return ImageChops.multiply(img, Image.merge("RGB", (t, t, t)))


def folds(img, rnd, n=6, vertical=True, depth=70, blur=28):
    w, h = img.size
    m = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(m)
    for _ in range(n):
        if vertical:
            x = rnd.randint(0, w)
            d.line([x + rnd.randint(-40, 40), 0, x + rnd.randint(-40, 40), h], fill=255 - depth, width=rnd.randint(8, 30))
        else:
            y = rnd.randint(0, h)
            d.line([0, y + rnd.randint(-30, 30), w, y + rnd.randint(-30, 30)], fill=255 - depth, width=rnd.randint(8, 24))
    m = m.filter(ImageFilter.GaussianBlur(blur))
    return ImageChops.multiply(img, Image.merge("RGB", (m, m, m)))


def light(img, cx=0.35, cy=0.3, edge=200):
    """Soft key light from the upper left."""
    w, h = img.size
    m = Image.new("L", (w, h), edge)
    d = ImageDraw.Draw(m)
    r = max(w, h)
    for i in range(20, 0, -1):
        v = edge + (255 - edge) * (20 - i) // 20
        rr = r * i / 20
        d.ellipse([w * cx - rr, h * cy - rr, w * cx + rr, h * cy + rr], fill=v)
    m = m.filter(ImageFilter.GaussianBlur(40))
    return ImageChops.multiply(img, Image.merge("RGB", (m, m, m)))


# ---------- print patterns ----------

def flower(d, x, y, r, ink, rnd):
    c = jitter(ink, rnd, 12)
    for k in range(6):
        a = k * math.pi / 3 + rnd.uniform(-0.1, 0.1)
        px, py = x + math.cos(a) * r, y + math.sin(a) * r
        d.ellipse([px - r * 0.62, py - r * 0.62, px + r * 0.62, py + r * 0.62], fill=c)
    d.ellipse([x - r * 0.45, y - r * 0.45, x + r * 0.45, y + r * 0.45], fill=shade(c, 0.6) if sum(c) > 300 else shade(c, 1.6))


def buta(d, x, y, r, ink, rnd):
    """Paisley-ish teardrop."""
    c = jitter(ink, rnd, 12)
    d.ellipse([x - r, y - r * 0.8, x + r, y + r * 1.2], fill=c)
    d.polygon([(x - r * 0.9, y), (x + r * 0.2, y - r * 2.2), (x + r * 0.9, y - r * 0.2)], fill=c)


def block_print(img, ink, rnd, step=90, motif="flower"):
    w, h = img.size
    d = ImageDraw.Draw(img)
    for row, y in enumerate(range(-step, h + step, step)):
        off = step // 2 if row % 2 else 0
        for x in range(-step + off, w + step, step):
            jx, jy = rnd.randint(-3, 3), rnd.randint(-3, 3)
            if motif == "flower":
                flower(d, x + jx, y + jy, step * 0.17, ink, rnd)
            else:
                buta(d, x + jx, y + jy, step * 0.16, ink, rnd)
            dc = jitter(ink, rnd, 8)
            d.ellipse([x + step // 2 - 4, y + step // 2 - 4, x + step // 2 + 4, y + step // 2 + 4], fill=dc)
    return img


def ikat(img, colours, rnd, band=120):
    w, h = img.size
    d = ImageDraw.Draw(img)
    for bi, y0 in enumerate(range(0, h, band)):
        c = colours[bi % len(colours)]
        for x0 in range(-band, w + band, band):
            cx, cy = x0 + (band // 2 if bi % 2 else 0), y0 + band // 2
            for yy in range(-band // 2 + 6, band // 2 - 6, 3):
                half = (band // 2 - 6 - abs(yy)) * 0.9
                feather = rnd.randint(-9, 9)
                x0, x1 = cx - half + feather, cx + half + feather + rnd.randint(-4, 4)
                if x1 > x0:
                    d.rectangle([x0, cy + yy, x1, cy + yy + 2], fill=jitter(c, rnd, 6))
    return img


def stripes(img, ink, ys, rnd):
    d = ImageDraw.Draw(img)
    for y, t in ys:
        d.rectangle([0, y, img.size[0], y + t], fill=jitter(ink, rnd, 6))
    return img


# ---------- products: each returns an RGBA cut-out ----------

def finish(fab, mask, rnd, vertical_folds=True, n_folds=6):
    fab = weave(grain(fab))
    fab = folds(fab, rnd, n=n_folds, vertical=vertical_folds)
    fab = light(fab)
    fab.putalpha(mask)
    return fab


def scarf(base, ink, rnd):
    w, h = 700, 980
    fab = Image.new("RGB", (w, h), base)
    block_print(fab, ink, rnd, step=88, motif="buta")
    stripes(fab, ink, [(870, 14), (895, 6)], rnd)
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    bottom = [(600 - i * 50, 900 + int(12 * math.sin(i * 1.3))) for i in range(11)]
    md.polygon([(90, 30), (610, 50)] + bottom, fill=255)
    fd = ImageDraw.Draw(fab)
    for x in range(105, 600, 9):  # fringe
        y0 = 895 + int(12 * math.sin((600 - x) / 50 * 1.3))
        md.line([x, y0, x + rnd.randint(-4, 4), y0 + rnd.randint(45, 70)], fill=255, width=4)
        fd.line([x, y0, x + rnd.randint(-4, 4), y0 + 70], fill=shade(base, 0.85), width=4)
    return finish(fab, mask, rnd, n_folds=8)


def tote(base, ink, rnd):
    w, h = 700, 920
    fab = Image.new("RGB", (w, h), base)
    d = ImageDraw.Draw(fab)
    cx, cy = 350, 560
    for k in range(16):  # sun print
        a = k * math.pi / 8
        d.polygon([(cx + math.cos(a - 0.12) * 95, cy + math.sin(a - 0.12) * 95),
                   (cx + math.cos(a) * 165, cy + math.sin(a) * 165),
                   (cx + math.cos(a + 0.12) * 95, cy + math.sin(a + 0.12) * 95)], fill=jitter(ink, rnd, 5))
    d.ellipse([cx - 80, cy - 80, cx + 80, cy + 80], fill=ink)
    d.ellipse([cx - 55, cy - 55, cx + 55, cy + 55], fill=base)
    d.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], fill=ink)
    d.text((cx, 790), "HAND PRINTED", font=font(46, True), fill=ink, anchor="mm")
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([90, 300, 610, 900], fill=255)
    for off in (0, 30):
        md.arc([200 + off, 40 + off // 2, 500 + off, 560], 180, 360, fill=255, width=34)
        d.arc([200 + off, 40 + off // 2, 500 + off, 560], 180, 360, fill=shade(base, 0.9 - off / 300), width=34)
    d.line([90, 330, 610, 330], fill=shade(base, 0.85), width=4)  # hem
    return finish(fab, mask, rnd, n_folds=4)


def cushion(base, inks, rnd):
    w, h = 820, 820
    fab = Image.new("RGB", (w, h), base)
    ikat(fab, inks, rnd, band=130)
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    pts = []
    for i in range(400):  # pillow outline with pinched corners
        t = i / 400 * 2 * math.pi
        ct, st = math.cos(t), math.sin(t)
        ex, ey = math.copysign(abs(ct) ** 0.5, ct), math.copysign(abs(st) ** 0.5, st)  # squircle
        pinch = 1 - 0.07 * (1 - abs(abs(ct) - abs(st)))  # edges sag inward between corners
        pts.append((410 + 370 * ex * pinch, 410 + 370 * ey * pinch))
    md.polygon(pts, fill=255)
    fab = weave(grain(fab))
    pm = Image.new("L", (w, h), 170)
    ImageDraw.Draw(pm).ellipse([110, 110, 710, 710], fill=255)
    pm = pm.filter(ImageFilter.GaussianBlur(90))
    fab = ImageChops.multiply(fab, Image.merge("RGB", (pm, pm, pm)))
    fab = light(fab)
    ImageDraw.Draw(fab).line(pts + [pts[0]], fill=shade(inks[0], 0.7), width=10)  # piping
    fab.putalpha(mask)
    return fab


def runner(base, ink, rnd):
    w, h = 1100, 380
    fab = Image.new("RGB", (w, h), base)
    block_print(fab, ink, rnd, step=70, motif="flower")
    d = ImageDraw.Draw(fab)
    for x in (70, 92, w - 106, w - 84):
        d.rectangle([x, 0, x + 12, h], fill=ink)
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([40, 40, w - 40, h - 40], fill=255)
    for y in range(55, h - 50, 46):  # tassels
        for x0, dx in ((40, -1), (w - 40, 1)):
            tri = [(x0, y), (x0, y + 24), (x0 + dx * 34, y + 12)]
            md.polygon(tri, fill=255)
            d.polygon(tri, fill=ink)
    return finish(fab, mask, rnd, vertical_folds=False, n_folds=3)


def kurta(base, ink, rnd):
    w, h = 720, 1000
    fab = Image.new("RGB", (w, h), base)
    d = ImageDraw.Draw(fab)
    for _ in range(170):  # scattered buti embroidery
        x, y = rnd.randint(0, w), rnd.randint(0, h)
        r = rnd.randint(5, 8)
        for k in range(5):
            a = k * 2 * math.pi / 5
            d.ellipse([x + math.cos(a) * r - 3, y + math.sin(a) * r - 3, x + math.cos(a) * r + 3, y + math.sin(a) * r + 3], fill=ink)
    pts = [(300, 60), (360, 105), (420, 60), (555, 110), (668, 520), (595, 548), (500, 300),
           (548, 965), (172, 965), (220, 300), (125, 548), (52, 520), (165, 110)]
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    d.line([360, 105, 360, 330], fill=shade(base, 0.82), width=6)  # placket
    for y in (150, 200, 250, 300):
        d.ellipse([352, y - 8, 368, y + 8], fill=shade(ink, 0.9), outline=shade(base, 0.7))
    for t in range(0, 21):  # neckline embroidery
        for (ax, ay), (bx, by) in (((300, 60), (360, 105)), ((360, 105), (420, 60))):
            x, y = ax + (bx - ax) * t / 20, ay + (by - ay) * t / 20 + 14
            d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=ink)
    d.line([52, 520, 125, 548], fill=ink, width=10)
    d.line([668, 520, 595, 548], fill=ink, width=10)
    return finish(fab, mask, rnd, n_folds=7)


# ---------- scenes ----------

def background(kind, rnd):
    if kind == "wood":
        bg = Image.new("RGB", (S, S), (139, 94, 62))
        d = ImageDraw.Draw(bg)
        y = 0
        while y < S:
            d.line([0, y, S, y + rnd.randint(-20, 20)], fill=jitter((112, 72, 45), rnd, 12), width=rnd.randint(1, 4))
            y += rnd.randint(6, 22)
        for y in range(0, S, 240):
            d.line([0, y, S, y], fill=(80, 50, 30), width=3)
        bg = bg.filter(ImageFilter.GaussianBlur(1.2))
    else:
        bg = Image.new("RGB", (S, S), (236, 230, 220) if kind == "linen" else (214, 222, 226))
        bg = weave(bg, step=4, dark=240)
    bg = grain(bg, 3)
    return light(bg, 0.3, 0.25, 175)


def place(scene, item, cx, cy, height, angle):
    it = item.rotate(angle, expand=True, resample=Image.BICUBIC)
    k = min(height / it.size[1], scene.size[0] * 0.88 / it.size[0])
    height = it.size[1] * k
    it = it.resize((max(1, int(it.size[0] * k)), int(height)), Image.LANCZOS)
    x, y = int(cx - it.size[0] / 2), int(cy - it.size[1] / 2)
    sh = Image.new("RGBA", it.size, (30, 20, 10, 0))
    sh.putalpha(it.getchannel("A").point(lambda v: v * 95 // 255).filter(ImageFilter.GaussianBlur(18)))
    scene.alpha_composite(sh, (x + 22, y + 28))
    scene.alpha_composite(it, (x, y))


def camera(img):
    img = img.convert("RGB")
    img = grain(img, 5)
    return img.filter(ImageFilter.GaussianBlur(0.6))


PRODUCTS = [
    ("01-blockprint-scarf", "scarf", scarf, "wood", 0.85, [
        ("indigo", (32, 52, 104), (232, 228, 214)),
        ("madder-red", (238, 228, 208), (168, 38, 36)),
        ("mustard", (214, 162, 42), (92, 56, 28)),
    ]),
    ("02-canvas-tote", "tote", tote, "linen", 0.8, [
        ("natural", (226, 214, 188), (30, 30, 30)),
        ("black", (34, 34, 36), (238, 234, 222)),
        ("olive", (104, 110, 60), (236, 228, 200)),
    ]),
    ("03-ikat-cushion-cover", "cushion", cushion, "linen", 0.72, [
        ("teal", (238, 232, 218), [(22, 112, 118), (196, 120, 60)]),
        ("rust", (236, 226, 210), [(172, 72, 36), (60, 60, 60)]),
    ]),
    ("04-table-runner", "runner", runner, "wood", 0.5, [
        ("leaf-green", (240, 234, 220), (46, 110, 64)),
        ("rose-pink", (242, 232, 226), (200, 80, 120)),
        ("charcoal", (232, 230, 224), (60, 62, 66)),
    ]),
    ("05-cotton-kurta", "kurta", kurta, "blue", 0.86, [
        ("white", (244, 243, 238), (210, 205, 190)),
        ("sky-blue", (150, 192, 224), (246, 246, 246)),
        ("sage", (150, 172, 140), (246, 242, 230)),
    ]),
]


# ---------- shooting styles ----------

def studio_bg(w, h):
    """Seamless paper sweep, white to soft grey."""
    bg = Image.new("RGB", (w, h), (250, 250, 250))
    d = ImageDraw.Draw(bg)
    for y in range(h):
        v = int(252 - 22 * max(0, (y / h - 0.55)) / 0.45) if y > h * 0.55 else 252 - int(8 * (1 - y / (h * 0.55)))
        d.line([0, y, w, y], fill=(v, v, v - 1))
    return bg


def shot_studio(items, hfrac, angle_fn):
    w, h = 1400, 1400
    scene = studio_bg(w, h).convert("RGBA")
    n = len(items)
    for i, it in enumerate(items):
        cx = w * (i + 0.5) / n
        place(scene, it, cx, h * 0.48, h * hfrac * (0.92 if n == 1 else 0.6), angle_fn(i) * 0.3)
    img = scene.convert("RGB").filter(ImageFilter.UnsharpMask(2, 60, 2))
    return img, 92


def home_bg(kind, w, h, rnd):
    if kind == "bedsheet":
        bg = Image.new("RGB", (w, h), (222, 214, 232))
        d = ImageDraw.Draw(bg)
        for x in range(0, w, 60):
            d.rectangle([x, 0, x + 18, h], fill=(196, 186, 214))
        for y in range(0, h, 60):
            d.rectangle([0, y, w, y + 18], fill=(196, 186, 214))
        bg = folds(bg, rnd, n=9, vertical=False, depth=50, blur=35)
    elif kind == "tiles":
        bg = Image.new("RGB", (w, h), (205, 198, 186))
        d = ImageDraw.Draw(bg)
        for x in range(0, w, 300):
            d.line([x, 0, x, h], fill=(160, 152, 140), width=5)
        for y in range(0, h, 300):
            d.line([0, y, w, y], fill=(160, 152, 140), width=5)
        for _ in range(400):
            x, y = rnd.randint(0, w), rnd.randint(0, h)
            d.ellipse([x, y, x + 6, y + 4], fill=jitter((180, 172, 160), rnd, 15))
    else:  # sofa
        bg = Image.new("RGB", (w, h), (120, 96, 80))
        bg = folds(weave(bg, 4, 236), rnd, n=6, vertical=True, depth=60, blur=40)
    return grain(bg, 3)


def shot_phone(items, hfrac, kind, rnd):
    """Handheld shot at home: 3:4 portrait, tilted, warm bulb light, off-centre, noisy, soft."""
    w, h = 1080, 1440
    scene = home_bg(kind, w, h, rnd).convert("RGBA")
    n = len(items)
    for i, it in enumerate(items):
        cx = w * (i + 0.5) / n + rnd.randint(-70, 70)
        place(scene, it, cx, h * 0.5 + rnd.randint(-80, 60), h * hfrac * (0.85 if n == 1 else 0.48), rnd.uniform(-12, 12))
    img = scene.convert("RGB")
    # handheld perspective: the top of the frame is further away
    k = rnd.randint(40, 90)
    img = img.transform((w, h), Image.QUAD, (-k, 0, -k // 3, h, w + k // 3, h, w + k, 0), Image.BICUBIC)
    img = img.rotate(rnd.uniform(-3, 3), resample=Image.BICUBIC, fillcolor=(40, 36, 32))
    m = 0.13  # crop past the black wedges the tilt leaves
    img = img.crop((int(w * m), int(h * m), int(w * (1 - m)), int(h * (1 - m)))).resize((w, h), Image.LANCZOS)
    img = ImageChops.multiply(img, Image.new("RGB", (w, h), (255, 232, 196)))  # tungsten cast
    shadow = Image.new("L", (w, h), 255)  # the photographer's shadow creeping in
    sx, sy = rnd.choice([(0, h), (w, h), (w, 0)])
    ImageDraw.Draw(shadow).ellipse([sx - 420, sy - 380, sx + 420, sy + 380], fill=165)
    shadow = shadow.filter(ImageFilter.GaussianBlur(90))
    img = ImageChops.multiply(img, Image.merge("RGB", (shadow,) * 3))
    img = light(img, rnd.uniform(0.3, 0.7), 0.2, 150)
    img = img.filter(ImageFilter.GaussianBlur(rnd.uniform(1.1, 1.8)))
    img = grain(img, 2)
    return img, 72


def shot_table(items, hfrac, bgkind, rnd, short):
    scene = background(bgkind, rnd).convert("RGBA")
    n = len(items)
    for i, it in enumerate(items):
        if short == "runner":
            place(scene, it, S / 2, S * (i + 0.6) / (n + 0.2) if n > 1 else S / 2, S * (0.3 if n > 1 else hfrac), -14 if n == 1 else -6 + i * 4)
        else:
            place(scene, it, S * (i + 0.5) / n, S / 2 + (40 if i % 2 else -30), S * hfrac * (1 if n == 1 else 0.62), rnd.uniform(-6, 6))
    return camera(scene), 86


# style per SKU, then the all-colours shot last
STYLES = {
    "scarf": ["phone:sofa", "studio", "table", "phone:bedsheet"],
    "tote": ["studio", "phone:tiles", "studio", "studio"],
    "cushion": ["phone:sofa", "studio", "phone:bedsheet"],
    "runner": ["table", "phone:tiles", "studio", "table"],
    "kurta": ["studio", "phone:bedsheet", "phone:sofa", "studio"],
}

for folder, short, fn, bgkind, hfrac, skus in PRODUCTS:
    out = OUT / folder
    out.mkdir(parents=True, exist_ok=True)
    rnd = random.Random(folder)
    styles = STYLES[short]
    shots = [(name, [fn(base, ink, random.Random(folder + name))]) for name, base, ink in skus]
    shots.append(("all-colours", [fn(b, i, random.Random(folder + n)) for n, b, i in skus]))
    for (name, items), style in zip(shots, styles):
        if short == "runner" and len(items) > 1 and style != "table":
            style = "table"
        if style == "studio":
            img, q = shot_studio(items, hfrac, lambda i: rnd.uniform(-5, 5))
        elif style.startswith("phone"):
            img, q = shot_phone(items, hfrac, style.split(":")[1], rnd)
        else:
            img, q = shot_table(items, hfrac, bgkind, rnd, short)
        tag = style.split(":")[0]
        img.save(out / f"{short}_{name}_{tag}.jpg", quality=q)
    print(folder, [(n, st) for (n, _), st in zip(shots, styles)])
