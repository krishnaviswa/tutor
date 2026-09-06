"""Draw labelled NCERT-aligned diagrams and download Wikimedia Commons images."""
from __future__ import annotations

import json
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "images"
OUT.mkdir(parents=True, exist_ok=True)

CREAM = (255, 252, 245)
INK = (28, 36, 42)
TEAL = (13, 115, 119)
TEAL_D = (8, 78, 82)
GREEN = (46, 160, 90)
ORANGE = (232, 140, 48)
PINK = (232, 92, 128)
BLUE = (66, 135, 220)
PURPLE = (120, 80, 180)
YELLOW = (255, 214, 80)
WHITE = (255, 255, 255)
CYTO = (186, 236, 206)
NUC = (255, 186, 198)
MEM = (90, 170, 230)
WALL = (196, 154, 90)
GOLD = (245, 196, 72)

WIKI_FILES = [
    ("Differences between simple animal and plant cells (en).svg", "wiki_plant_animal.png"),
    ("Animal cell structure en.svg", "wiki_animal_cell.png"),
    ("Plant cell structure svg.svg", "wiki_plant_cell.png"),
    ("Average prokaryote cell- en.svg", "wiki_prokaryote.png"),
    ("Cell membrane detailed diagram en.svg", "wiki_membrane.png"),
    ("Animal mitochondrion diagram en.svg", "wiki_mitochondrion.png"),
    ("Chloroplast diagram.svg", "wiki_chloroplast.png"),
    ("Diagram human cell nucleus.svg", "wiki_nucleus.png"),
]

HEADERS = {
    "User-Agent": "NCERTCellSlides/1.0 (educational classroom materials; Class 11 Biology)"
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path(r"C:\Windows\Fonts") / name
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def text_wh(draw: ImageDraw.ImageDraw, text: str, fnt) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def rounded(draw: ImageDraw.ImageDraw, xy, fill, outline=None, width=2, radius=18):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def label(draw, xy, text, fnt, fill=INK, anchor="lt"):
    draw.text(xy, text, font=fnt, fill=fill, anchor=anchor)


def card_title(draw, x, y, w, title):
    rounded(draw, (x, y, x + w, y + 44), TEAL, radius=12)
    fnt = font(18, True)
    tw, th = text_wh(draw, title, fnt)
    draw.text((x + (w - tw) / 2, y + (44 - th) / 2 - 1), title, font=fnt, fill=WHITE)


def new_canvas(w, h, color=CREAM) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (w, h), color)
    return im, ImageDraw.Draw(im)


def draw_cell_shapes():
    im, d = new_canvas(1600, 1000)
    d.text((40, 24), "Figure 8.1 style  |  Cell shapes (NCERT Class 11, Ch. 8)", font=font(28, True), fill=TEAL_D)

    panels = [
        ("Red blood cell", "round and biconcave", "disc-like; ~7.0 µm"),
        ("White blood cell", "amoeboid", "irregular; can change shape"),
        ("Columnar epithelial cell", "long and narrow", "lining / absorption"),
        ("Nerve cell", "branched and long", "among the longest cells"),
        ("Mesophyll cell", "round and oval", "leaf photosynthesis"),
        ("A tracheid", "elongated", "xylem conduction"),
    ]
    w, h = 480, 420
    gap_x, gap_y = 40, 50
    ox, oy = 40, 80
    for i, (name, shape, note) in enumerate(panels):
        col, row = i % 3, i // 3
        x = ox + col * (w + gap_x)
        y = oy + row * (h + gap_y)
        rounded(d, (x, y, x + w, y + h), WHITE, TEAL, 3, 22)
        card_title(d, x + 16, y + 14, w - 32, name)
        cx, cy = x + w // 2, y + 210
        if i == 0:
            d.ellipse((cx - 90, cy - 38, cx + 90, cy + 38), fill=(200, 40, 50), outline=INK, width=2)
            d.ellipse((cx - 70, cy - 18, cx + 70, cy + 18), fill=(255, 170, 175), outline=INK, width=1)
            d.text((cx, cy - 6), "biconcave", font=font(14, True), fill=WHITE, anchor="mm")
        elif i == 1:
            d.polygon(
                [(cx - 70, cy), (cx - 40, cy - 55), (cx + 10, cy - 70), (cx + 80, cy - 20),
                 (cx + 70, cy + 40), (cx + 10, cy + 70), (cx - 50, cy + 50), (cx - 90, cy + 10)],
                fill=(245, 220, 150), outline=INK,
            )
            d.ellipse((cx - 18, cy - 18, cx + 18, cy + 18), fill=NUC, outline=PINK, width=2)
        elif i == 2:
            d.rounded_rectangle((cx - 40, cy - 90, cx + 40, cy + 90), 12, fill=(255, 220, 170), outline=INK, width=2)
            d.ellipse((cx - 22, cy - 50, cx + 22, cy - 6), fill=NUC, outline=PINK, width=2)
            d.line((cx - 40, cy + 90, cx + 40, cy + 90), fill=WALL, width=6)
        elif i == 3:
            d.ellipse((cx - 36, cy - 28, cx + 20, cy + 28), fill=(255, 210, 160), outline=INK, width=2)
            d.ellipse((cx - 18, cy - 12, cx + 6, cy + 12), fill=NUC, outline=PINK, width=2)
            d.line((cx + 18, cy, cx + 150, cy), fill=PURPLE, width=6)
            d.line((cx + 150, cy, cx + 170, cy - 20), fill=PURPLE, width=4)
            d.line((cx + 150, cy, cx + 170, cy + 20), fill=PURPLE, width=4)
            for ang in (-50, -20, 25, 55):
                import math
                dx, dy = 55 * math.cos(ang / 57.3), 55 * math.sin(ang / 57.3)
                d.line((cx - 20, cy, cx - 20 + dx, cy + dy), fill=BLUE, width=3)
        elif i == 4:
            d.ellipse((cx - 85, cy - 60, cx + 85, cy + 60), fill=(140, 210, 90), outline=GREEN, width=3)
            d.ellipse((cx - 70, cy - 45, cx + 70, cy + 45), fill=(200, 240, 160), outline=GREEN, width=1)
            d.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), fill=NUC, outline=PINK, width=2)
            d.ellipse((cx + 30, cy - 10, cx + 58, cy + 18), fill=(80, 160, 60), outline=GREEN, width=1)
        else:
            d.rounded_rectangle((cx - 140, cy - 28, cx + 140, cy + 28), 14, fill=(210, 180, 120), outline=WALL, width=3)
            for px in range(cx - 110, cx + 111, 40):
                d.ellipse((px - 8, cy - 8, px + 8, cy + 8), outline=INK, width=2)
        d.text((x + 24, y + h - 78), shape, font=font(20, True), fill=TEAL_D)
        d.text((x + 24, y + h - 46), note, font=font(16), fill=INK)

    im.save(OUT / "cell_shapes.png", quality=95)


def draw_cell_sizes():
    im, d = new_canvas(1600, 900)
    d.text((40, 24), "Figure 8.2 style  |  Comparison of cell size (NCERT 8.3 / 8.4)", font=font(28, True), fill=TEAL_D)

    items = [
        ("Viruses", "0.02 - 0.2 µm", 18, (180, 180, 190)),
        ("PPLO", "about 0.1 µm", 28, (160, 200, 230)),
        ("Mycoplasma", "0.3 µm  (smallest cells)", 40, (120, 190, 220)),
        ("Typical bacteria", "1 - 5 µm  (often 3 - 5 µm)", 70, (80, 170, 120)),
        ("Human RBC", "about 7.0 µm diameter", 110, (200, 50, 60)),
        ("Typical eukaryotic cell", "10 - 20 µm", 170, (70, 140, 210)),
        ("Nerve cells", "among the longest cells", 220, (150, 90, 190)),
        ("Ostrich egg", "largest isolated single cell", 280, (240, 200, 80)),
    ]
    y = 90
    for name, size, bar, color in items:
        rounded(d, (40, y, 1560, y + 88), WHITE, TEAL, 2, 16)
        d.ellipse((70, y + 18, 130, y + 78), fill=color, outline=INK, width=2)
        d.text((160, y + 14), name, font=font(22, True), fill=TEAL_D)
        d.text((160, y + 48), size, font=font(18), fill=INK)
        d.rounded_rectangle((720, y + 32, 720 + bar * 2.6, y + 60), 8, fill=color, outline=INK, width=1)
        y += 98
    d.text((40, 860), "NCERT: Mycoplasmas 0.3 µm; bacteria 3-5 µm; human RBC ~7.0 µm; ostrich egg = largest isolated cell.", font=font(16), fill=TEAL_D)
    im.save(OUT / "cell_sizes.png", quality=95)


def draw_bacterial_shapes():
    im, d = new_canvas(1600, 720)
    d.text((40, 24), "Four basic shapes of bacteria  |  NCERT 8.4", font=font(28, True), fill=TEAL_D)
    shapes = [
        ("Bacillus", "rod like", lambda cx, cy: d.rounded_rectangle((cx - 110, cy - 36, cx + 110, cy + 36), 20, fill=(70, 170, 110), outline=INK, width=3)),
        ("Coccus", "spherical", lambda cx, cy: d.ellipse((cx - 70, cy - 70, cx + 70, cy + 70), fill=(90, 160, 220), outline=INK, width=3)),
        ("Vibrio", "comma shaped", lambda cx, cy: d.arc((cx - 90, cy - 70, cx + 90, cy + 90), 200, 20, fill=(220, 130, 50), width=28)),
        ("Spirillum", "spiral", None),
    ]
    w = 360
    for i, (name, desc, fn) in enumerate(shapes):
        x = 40 + i * 390
        rounded(d, (x, 90, x + w, 680), WHITE, TEAL, 3, 22)
        card_title(d, x + 16, 106, w - 32, name)
        cx, cy = x + w // 2, 360
        if name == "Spirillum":
            pts = []
            for t in range(0, 220, 4):
                import math
                px = cx - 90 + t * 0.85
                py = cy + 48 * math.sin(t / 18)
                pts.append((px, py))
            d.line(pts, fill=PURPLE, width=14)
        elif name == "Vibrio":
            import math
            pts = []
            for t in range(30, 160, 3):
                rad = t / 57.3
                pts.append((cx + 90 * math.cos(rad), cy + 70 * math.sin(rad)))
            d.line(pts, fill=ORANGE, width=22)
        else:
            fn(cx, cy)
        d.text((cx, 560), desc, font=font(22, True), fill=TEAL_D, anchor="mm")
        d.text((cx, 600), "NCERT 8.4", font=font(16), fill=INK, anchor="mm")
    im.save(OUT / "bacterial_shapes.png", quality=95)


def draw_prokaryote():
    im, d = new_canvas(1600, 1000)
    d.text((40, 20), "Prokaryotic cell (bacterium)  |  NCERT 8.4 / 8.4.1  |  labelled", font=font(26, True), fill=TEAL_D)

    # cell body
    d.ellipse((180, 220, 980, 820), fill=(255, 220, 120), outline=(210, 160, 40), width=18)  # capsule / glycocalyx
    d.ellipse((210, 250, 950, 790), fill=WALL, outline=(140, 100, 40), width=10)  # wall
    d.ellipse((230, 270, 930, 770), fill=MEM, outline=BLUE, width=6)  # membrane
    d.ellipse((245, 285, 915, 755), fill=CYTO, outline=None)  # cytoplasm

    # nucleoid
    d.ellipse((430, 430, 730, 640), fill=(255, 230, 160), outline=ORANGE, width=3)
    d.arc((460, 460, 700, 610), 20, 300, fill=PINK, width=5)

    # plasmid
    d.ellipse((320, 500, 390, 560), outline=PURPLE, width=4)

    # ribosomes
    for px, py in [(340, 360), (380, 400), (700, 350), (760, 420), (300, 620), (780, 620), (500, 330), (620, 700)]:
        d.ellipse((px, py, px + 18, py + 18), fill=(80, 90, 160), outline=INK, width=1)

    # mesosome infolding
    d.polygon([(230, 480), (340, 500), (340, 560), (230, 540)], fill=MEM, outline=TEAL_D, width=2)

    # inclusion
    d.ellipse((620, 650, 700, 720), fill=GOLD, outline=ORANGE, width=2)

    # flagellum
    import math
    pts = []
    for t in range(0, 260, 3):
        pts.append((980 + t, 500 + 28 * math.sin(t / 16)))
    d.line(pts, fill=INK, width=6)
    d.ellipse((965, 488, 995, 518), fill=ORANGE, outline=INK, width=2)  # basal / hook region

    # fimbriae
    for ang in range(-40, 50, 12):
        rad = ang / 57.3
        x0 = 200 + 40 * math.cos(rad + 3.2)
        y0 = 520 + 200 * math.sin(rad + 3.2)
        d.line((180, 520, 80, y0 - 40), fill=(90, 90, 90), width=2)

    labels = [
        (1080, 240, "Glycocalyx (capsule / slime)"),
        (1080, 300, "Cell wall (shape + support)"),
        (1080, 360, "Plasma membrane (selectively permeable)"),
        (1080, 420, "Cytoplasm"),
        (1080, 480, "Nucleoid (naked circular DNA)"),
        (1080, 540, "Plasmid (extra circular DNA)"),
        (1080, 600, "70S ribosomes (50S + 30S)"),
        (1080, 660, "Mesosome (membrane infolding)"),
        (1080, 720, "Inclusion body (not membrane-bound)"),
        (1080, 780, "Flagellum: filament, hook, basal body"),
        (1080, 840, "Fimbriae / pili: attachment, NOT motility"),
    ]
    fnt = font(18, True)
    for x, y, t in labels:
        d.rounded_rectangle((x - 12, y - 8, 1570, y + 28), 8, fill=WHITE, outline=TEAL, width=2)
        d.text((x, y), t, font=fnt, fill=INK)
    d.text((40, 950), "Mycoplasma: prokaryote with NO cell wall. Chromatophores (pigments) occur in cyanobacteria, not the same as mesosomes.", font=font(16), fill=TEAL_D)
    im.save(OUT / "prokaryote_labelled.png", quality=95)


def draw_plant_animal():
    im, d = new_canvas(1800, 1000)
    d.text((40, 16), "Eukaryotic cells  |  NCERT Figure 8.3  |  plant vs animal", font=font(26, True), fill=TEAL_D)

    # plant
    rounded(d, (30, 70, 880, 970), WHITE, GREEN, 3, 20)
    d.text((455, 95), "PLANT CELL", font=font(24, True), fill=GREEN, anchor="mm")
    d.rectangle((90, 140, 820, 920), fill=WALL, outline=(140, 100, 40), width=10)
    d.rectangle((110, 160, 800, 900), fill=MEM, outline=BLUE, width=5)
    d.rectangle((120, 170, 790, 890), fill=(210, 245, 200), outline=None)
    d.rectangle((160, 320, 620, 860), fill=(180, 230, 255), outline=BLUE, width=3)  # vacuole
    d.ellipse((480, 200, 680, 380), fill=NUC, outline=PINK, width=4)
    d.ellipse((540, 250, 620, 330), fill=(220, 70, 90), outline=INK, width=2)  # nucleolus
    d.ellipse((200, 210, 300, 290), fill=(70, 150, 60), outline=GREEN, width=3)  # chloroplast
    d.ellipse((700, 500, 770, 560), fill=(255, 150, 90), outline=ORANGE, width=2)  # mito
    d.polygon([(720, 220), (800, 250), (720, 280), (800, 310), (720, 340)], fill=(255, 230, 120), outline=ORANGE, width=2)  # golgi
    d.text((200, 400), "large vacuole", font=font(16, True), fill=TEAL_D)
    d.text((200, 230), "chloroplast", font=font(14, True), fill=WHITE)
    d.text((500, 215), "nucleus", font=font(14, True), fill=INK)
    d.text((140, 150), "cell wall", font=font(16, True), fill=WHITE)
    d.text((130, 175), "plasma membrane", font=font(13, True), fill=TEAL_D)
    d.text((700, 575), "mitochondrion", font=font(13, True), fill=INK)
    d.text((630, 200), "Golgi", font=font(13, True), fill=INK)
    d.line((90, 400, 40, 400), fill=GREEN, width=3)
    d.text((40, 410), "plasmodesmata", font=font(13, True), fill=GREEN)
    d.text((160, 880), "middle lamella glues neighbouring walls (calcium pectate)", font=font(14), fill=INK)

    # animal
    rounded(d, (920, 70, 1770, 970), WHITE, PINK, 3, 20)
    d.text((1345, 95), "ANIMAL CELL", font=font(24, True), fill=PINK, anchor="mm")
    d.ellipse((1000, 160, 1690, 920), fill=MEM, outline=BLUE, width=6)
    d.ellipse((1020, 180, 1670, 900), fill=(255, 230, 230), outline=None)
    d.ellipse((1280, 360, 1500, 560), fill=NUC, outline=PINK, width=4)
    d.ellipse((1340, 420, 1430, 510), fill=(220, 70, 90), outline=INK, width=2)
    d.ellipse((1100, 400, 1180, 460), fill=(255, 150, 90), outline=ORANGE, width=2)
    d.ellipse((1540, 620, 1600, 680), fill=(180, 80, 200), outline=PURPLE, width=2)  # lysosome
    d.ellipse((1120, 700, 1160, 740), fill=(40, 40, 40), outline=INK, width=2)
    d.ellipse((1165, 700, 1205, 740), fill=(40, 40, 40), outline=INK, width=2)  # centrioles
    for i in range(8):
        d.line((1345, 160, 1280 + i * 18, 120), fill=BLUE, width=3)  # microvilli
    d.text((1300, 340), "nucleus", font=font(16, True), fill=INK)
    d.text((1090, 470), "mitochondrion", font=font(14, True), fill=INK)
    d.text((1480, 690), "lysosome", font=font(14, True), fill=PURPLE)
    d.text((1100, 760), "centriole pair", font=font(14, True), fill=INK)
    d.text((1260, 125), "microvilli", font=font(14, True), fill=BLUE)
    d.text((1040, 200), "plasma membrane (no cell wall)", font=font(14, True), fill=TEAL_D)
    d.text((1040, 860), "No large central vacuole; no chloroplast; centrioles present", font=font(14), fill=INK)

    im.save(OUT / "plant_animal.png", quality=95)


def draw_membrane():
    im, d = new_canvas(1600, 900)
    d.text((40, 20), "Fluid mosaic model  |  Singer and Nicolson (1972)  |  NCERT Fig. 8.4", font=font(26, True), fill=TEAL_D)
    # bilayer
    y1, y2 = 300, 520
    d.rectangle((80, y1, 1520, y2), fill=(180, 220, 255))
    for x in range(100, 1500, 36):
        d.ellipse((x, y1 - 18, x + 28, y1 + 18), fill=(70, 140, 220), outline=BLUE, width=2)
        d.ellipse((x, y2 - 18, x + 28, y2 + 18), fill=(70, 140, 220), outline=BLUE, width=2)
        d.line((x + 14, y1 + 18, x + 14, y2 - 18), fill=(255, 210, 80), width=3)
    # integral protein
    d.rounded_rectangle((420, 250, 500, 570), 20, fill=(220, 90, 90), outline=INK, width=2)
    d.rounded_rectangle((980, 250, 1080, 570), 20, fill=(90, 170, 90), outline=INK, width=2)
    # peripheral
    d.ellipse((700, 230, 780, 280), fill=(180, 80, 200), outline=INK, width=2)
    d.ellipse((700, 540, 780, 590), fill=(180, 80, 200), outline=INK, width=2)
    # cholesterol marks
    for x in (300, 600, 1200, 1350):
        d.polygon([(x, 390), (x + 12, 410), (x, 430), (x - 12, 410)], fill=ORANGE, outline=INK)
    # sugar chains
    d.line((460, 250, 460, 190), fill=PINK, width=3)
    d.ellipse((448, 160, 472, 190), fill=GOLD, outline=PINK, width=2)

    tags = [
        (80, 640, "Phospholipid bilayer: polar heads outside, hydrophobic tails inside"),
        (80, 690, "Integral proteins: partly or fully buried in the membrane"),
        (80, 740, "Peripheral proteins: lie on the surface"),
        (80, 790, "Cholesterol present; sugars on outer face"),
        (80, 840, "Human RBC membrane: about 52% protein and 40% lipids (NCERT 8.5.1)"),
    ]
    for x, y, t in tags:
        d.text((x, y), t, font=font(20, True), fill=INK)
    d.text((500, 200), "sugar", font=font(16, True), fill=PINK)
    d.text((360, 400), "integral\nprotein", font=font(14, True), fill=WHITE)
    d.text((790, 236), "peripheral protein", font=font(16, True), fill=PURPLE)
    im.save(OUT / "fluid_mosaic.png", quality=95)


def draw_cell_wall():
    im, d = new_canvas(1500, 800)
    d.text((40, 20), "Plant cell wall  |  NCERT 8.5.2", font=font(28, True), fill=TEAL_D)
    layers = [
        ("Middle lamella", "calcium pectate; glues neighbouring cells", (230, 180, 80)),
        ("Primary wall", "young cell; capable of growth", (200, 160, 90)),
        ("Secondary wall", "inner side, towards the membrane, as cell matures", (160, 120, 60)),
        ("Plasma membrane", "living boundary of the protoplast", MEM),
        ("Cytoplasm + plasmodesmata", "plasmodesmata connect neighbouring cytoplasm", CYTO),
    ]
    y = 90
    widths = [1400, 1280, 1140, 980, 820]
    for (name, desc, color), w in zip(layers, widths):
        x = (1500 - w) // 2
        rounded(d, (x, y, x + w, y + 110), color, INK, 2, 16)
        fill = WHITE if name != "Cytoplasm + plasmodesmata" else INK
        d.text((x + 24, y + 18), name, font=font(22, True), fill=fill if color != CYTO else TEAL_D)
        d.text((x + 24, y + 58), desc, font=font(18), fill=WHITE if color not in (CYTO, MEM) else INK)
        y += 118
    d.text((40, 740), "Algae: cellulose, galactans, mannans, CaCO3. Other plants: cellulose, hemicellulose, pectins, proteins.", font=font(16), fill=TEAL_D)
    im.save(OUT / "cell_wall.png", quality=95)


def draw_endomembrane():
    im, d = new_canvas(1600, 900)
    d.text((40, 18), "Endomembrane system  |  NCERT 8.5.3  |  ER + Golgi + lysosomes + vacuoles", font=font(24, True), fill=TEAL_D)
    boxes = [
        (40, 80, "Rough ER (RER)", "ribosomes on surface\nprotein synthesis / secretion\ncontinuous with nuclear envelope", (255, 210, 160)),
        (420, 80, "Smooth ER (SER)", "no ribosomes\nmajor site of lipid synthesis\nsteroid hormones in animal cells", (255, 230, 140)),
        (800, 80, "Golgi apparatus", "cisternae 0.5-1.0 µm\ncis = forming face\ntrans = maturing face\npackaging; glycoproteins", (255, 220, 90)),
        (1180, 80, "Lysosomes", "Golgi packaging\nacid hydrolases\n(lipases, proteases,\ncarbohydrases)", (200, 140, 220)),
        (40, 430, "Vacuoles", "tonoplast membrane\nup to 90% of plant cell\nion storage; sap\ncontractile vacuole in Amoeba", (160, 210, 245)),
        (620, 430, "NOT in this system", "Mitochondria\nChloroplast\nPeroxisomes\n(functions not coordinated\nwith ER-Golgi-lysosome-vacuole)", (255, 200, 200)),
        (1180, 430, "Exam trap", "NEET often adds mitochondria\nor chloroplast to the list.\nReject those options.\nNCERT 8.5.3", (255, 230, 180)),
    ]
    for x, y, title, body, col in boxes:
        rounded(d, (x, y, x + 360, y + 300), col, TEAL, 3, 18)
        d.text((x + 18, y + 16), title, font=font(20, True), fill=TEAL_D)
        d.text((x + 18, y + 60), body, font=font(16), fill=INK)
    d.text((40, 780), "Materials from ER fuse at the cis face of Golgi and leave from the trans face.", font=font(18, True), fill=INK)
    d.text((40, 820), "RER frequent in cells actively involved in protein synthesis and secretion.", font=font(18), fill=INK)
    im.save(OUT / "endomembrane.png", quality=95)


def draw_energy():
    im, d = new_canvas(1700, 950)
    d.text((40, 16), "Mitochondrion and chloroplast  |  NCERT 8.5.4 and 8.5.5", font=font(26, True), fill=TEAL_D)

    # mitochondrion
    rounded(d, (30, 70, 820, 920), WHITE, ORANGE, 3, 18)
    d.text((425, 95), "MITOCHONDRION", font=font(22, True), fill=ORANGE, anchor="mm")
    d.ellipse((90, 160, 760, 520), fill=(255, 200, 150), outline=ORANGE, width=8)
    d.ellipse((110, 180, 740, 500), fill=(255, 230, 200), outline=(200, 80, 40), width=4)
    # cristae
    for y in (250, 320, 390, 450):
        d.polygon([(200, y), (500, y - 18), (500, y + 18)], fill=(200, 80, 40), outline=None)
    d.text((140, 200), "outer membrane", font=font(14, True), fill=INK)
    d.text((200, 300), "crista", font=font(14, True), fill=WHITE)
    d.text((560, 360), "matrix", font=font(16, True), fill=TEAL_D)
    notes = [
        "Sausage-shaped / cylindrical; 0.2-1.0 µm x 1.0-4.1 µm",
        "Double membrane; inner folds = cristae",
        "Matrix: circular DNA, RNA, 70S ribosomes",
        "Site of aerobic respiration; ATP = power house",
        "Divide by fission",
    ]
    for i, t in enumerate(notes):
        d.text((70, 560 + i * 50), "- " + t, font=font(18), fill=INK)

    # chloroplast
    rounded(d, (860, 70, 1670, 920), WHITE, GREEN, 3, 18)
    d.text((1265, 95), "CHLOROPLAST", font=font(22, True), fill=GREEN, anchor="mm")
    d.ellipse((930, 160, 1600, 520), fill=(170, 220, 110), outline=GREEN, width=8)
    d.ellipse((950, 180, 1580, 500), fill=(210, 245, 160), outline=(40, 120, 50), width=4)
    # grana stacks
    for gx in (1080, 1280, 1460):
        for k in range(5):
            d.rounded_rectangle((gx, 280 + k * 12, gx + 70, 290 + k * 12), 3, fill=(40, 120, 40), outline=None)
    d.line((1150, 320, 1280, 320), fill=(40, 120, 40), width=3)
    d.line((1350, 350, 1460, 350), fill=(40, 120, 40), width=3)
    d.text((980, 200), "double membrane", font=font(14, True), fill=INK)
    d.text((1070, 250), "grana (thylakoid stacks)", font=font(14, True), fill=TEAL_D)
    d.text((1380, 430), "stroma", font=font(16, True), fill=TEAL_D)
    notes = [
        "Lens-shaped; 5-10 µm x 2-4 µm; in mesophyll",
        "Thylakoids in stacks = grana; lumen inside",
        "Stroma lamellae connect grana",
        "Stroma: enzymes, circular DNA, 70S ribosomes",
        "Chloroplast / chromoplast / leucoplast",
        "Amyloplast (starch), elaioplast (oils), aleuroplast (protein)",
    ]
    for i, t in enumerate(notes):
        d.text((900, 545 + i * 48), "- " + t, font=font(17), fill=INK)
    im.save(OUT / "energy_organelles.png", quality=95)


def draw_nucleus():
    im, d = new_canvas(1700, 950)
    d.text((40, 16), "Nucleus and chromosomes  |  NCERT 8.5.10  |  Figures 8.11 - 8.13", font=font(24, True), fill=TEAL_D)

    rounded(d, (30, 70, 820, 920), WHITE, PINK, 3, 18)
    d.text((425, 95), "INTERPHASE NUCLEUS", font=font(20, True), fill=PINK, anchor="mm")
    d.ellipse((120, 150, 730, 700), fill=(255, 210, 220), outline=PINK, width=10)
    d.ellipse((145, 175, 705, 675), fill=(255, 236, 240), outline=(180, 60, 90), width=3)
    # pores
    for ang in range(0, 360, 40):
        import math
        rad = ang / 57.3
        px = 425 + 280 * math.cos(rad)
        py = 425 + 250 * math.sin(rad)
        d.ellipse((px - 10, py - 10, px + 10, py + 10), fill=WHITE, outline=PINK, width=2)
    d.ellipse((360, 330, 500, 470), fill=(200, 50, 70), outline=INK, width=2)
    d.text((425, 400), "nucleolus", font=font(14, True), fill=WHITE, anchor="mm")
    d.text((250, 300), "chromatin", font=font(16, True), fill=PINK)
    d.text((200, 160), "nuclear envelope (double membrane)", font=font(14, True), fill=INK)
    d.text((140, 730), "- Perinuclear space 10-50 nm", font=font(17), fill=INK)
    d.text((140, 770), "- Pores: RNA and protein traffic both ways", font=font(17), fill=INK)
    d.text((140, 810), "- Nucleolus: active rRNA synthesis (not membrane-bound)", font=font(17), fill=INK)
    d.text((140, 850), "- Outer membrane continuous with ER; may bear ribosomes", font=font(17), fill=INK)
    d.text((140, 890), "- Anucleate: mammalian RBC; sieve-tube cells", font=font(17), fill=INK)

    rounded(d, (860, 70, 1670, 920), WHITE, TEAL, 3, 18)
    d.text((1265, 95), "CHROMOSOME TYPES (centromere position)", font=font(18, True), fill=TEAL_D, anchor="mm")
    types = [
        ("Metacentric", "middle; two equal arms", 0.5),
        ("Sub-metacentric", "slightly off middle", 0.35),
        ("Acrocentric", "close to one end", 0.18),
        ("Telocentric", "terminal centromere", 0.04),
    ]
    for i, (name, desc, frac) in enumerate(types):
        x = 920 + (i % 2) * 370
        y = 150 + (i // 2) * 370
        rounded(d, (x, y, x + 340, y + 340), CREAM, TEAL, 2, 14)
        d.text((x + 170, y + 20), name, font=font(18, True), fill=TEAL_D, anchor="mt")
        d.text((x + 170, y + 50), desc, font=font(14), fill=INK, anchor="mt")
        top, bot = y + 90, y + 300
        cx = x + 170
        cy = int(top + (bot - top) * frac)
        d.line((cx, top, cx, bot), fill=(80, 40, 120), width=10)
        d.ellipse((cx - 16, cy - 16, cx + 16, cy + 16), fill=GOLD, outline=INK, width=2)
        d.text((cx + 28, cy - 10), "centromere", font=font(13, True), fill=ORANGE)
    im.save(OUT / "nucleus_chromosomes.png", quality=95)


def draw_title_banner():
    im, d = new_canvas(1600, 700, (8, 78, 82))
    d.text((800, 80), "CELL: THE UNIT OF LIFE", font=font(48, True), fill=WHITE, anchor="mm")
    d.text((800, 150), "Class 11 Biology  |  NCERT Chapter 8  |  Morphology + organelles", font=font(22), fill=GOLD, anchor="mm")
    # decorative cells
    d.ellipse((180, 260, 420, 520), fill=CYTO, outline=WHITE, width=4)
    d.ellipse((250, 330, 350, 430), fill=NUC, outline=PINK, width=3)
    d.rounded_rectangle((700, 300, 900, 520), 20, fill=WALL, outline=WHITE, width=4)
    d.ellipse((980, 300, 1220, 500), fill=(255, 180, 170), outline=WHITE, width=4)
    d.ellipse((1400, 340, 1500, 440), fill=(70, 170, 110), outline=WHITE, width=3)
    d.text((300, 560), "plant / animal / bacterium  |  labelled to NCERT terms", font=font(18), fill=WHITE, anchor="mm")
    im.save(OUT / "title_banner.png", quality=95)


def download_wiki():
    log = []
    for filename, dest_name in WIKI_FILES:
        dest = OUT / dest_name
        try:
            r = requests.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query",
                    "titles": f"File:{filename}",
                    "prop": "imageinfo",
                    "iiprop": "url",
                    "iiurlwidth": 1800,
                    "format": "json",
                },
                headers=HEADERS,
                timeout=40,
            )
            r.raise_for_status()
            pages = r.json()["query"]["pages"]
            page = next(iter(pages.values()))
            if "imageinfo" not in page:
                log.append(f"MISS {filename}: no imageinfo")
                continue
            info = page["imageinfo"][0]
            url = info.get("thumburl") or info["url"]
            img = requests.get(url, headers=HEADERS, timeout=60)
            img.raise_for_status()
            dest.write_bytes(img.content)
            log.append(f"OK {dest_name} <- {filename} ({len(img.content)} bytes)")
        except Exception as exc:
            log.append(f"FAIL {filename}: {exc}")
    (OUT / "wiki_download_log.txt").write_text("\n".join(log), encoding="utf-8")
    print("\n".join(log))
    return log


def main():
    draw_title_banner()
    draw_cell_shapes()
    draw_cell_sizes()
    draw_bacterial_shapes()
    draw_prokaryote()
    draw_plant_animal()
    draw_membrane()
    draw_cell_wall()
    draw_endomembrane()
    draw_energy()
    draw_nucleus()
    print("Drew labelled diagrams into", OUT)
    download_wiki()


if __name__ == "__main__":
    main()
