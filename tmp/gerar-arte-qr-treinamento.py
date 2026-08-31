from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "images" / "treinamento-terminal" / "qr-acesso-recinto-alfandegado.png"
QR_PATH = ROOT / "tmp" / "qr-treinamento-terminal.png"
LOGO_PATH = ROOT / "frontend" / "public" / "images" / "movecta-logo.png"
URL = "https://movecta.jetguard.com.br/treinamento-terminal"


def font(name: str, size: int):
    candidates = [
        Path("C:/Windows/Fonts") / name,
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_centered(draw, text, y, fnt, fill, width, line_gap=10):
    words = text.split()
    lines = []
    current = ""
    max_width = width - 360
    for word in words:
        test = f"{current} {word}".strip()
        if draw.textbbox((0, 0), test, font=fnt)[2] <= max_width:
            current = test
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=fnt)
        x = (width - (bbox[2] - bbox[0])) // 2
        draw.text((x, y), line, font=fnt, fill=fill)
        y += bbox[3] - bbox[1] + line_gap
    return y


def paste_contained(base, image, box):
    x, y, w, h = box
    image = image.convert("RGBA")
    image.thumbnail((w, h), Image.Resampling.LANCZOS)
    px = x + (w - image.width) // 2
    py = y + (h - image.height) // 2
    base.alpha_composite(image, (px, py))


def main():
    W, H = 2480, 3508
    blue = "#356bad"
    blue_dark = "#071225"
    green = "#86e915"
    slate = "#111827"
    muted = "#64748b"

    img = Image.new("RGBA", (W, H), "#f7f9ff")
    draw = ImageDraw.Draw(img)

    # Certificate-inspired top band and abstract Movecta geometry.
    draw.rectangle((0, 0, W, 760), fill=blue)
    draw.polygon([(780, 760), (1295, 120), (1510, 120), (1525, 760)], fill="#ffffff")
    draw.polygon([(1510, 760), (2050, 120), (2260, 120), (2268, 760)], fill="#ffffff")
    draw.rounded_rectangle((1900, 170, 2310, 290), radius=38, fill="#ffffff", outline="#bfdbfe", width=5)
    draw.text((1965, 205), "ACESSO ONLINE", font=font("arialbd.ttf", 40), fill="#1d4ed8")

    # Large subtle lower M.
    m_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    m = ImageDraw.Draw(m_layer)
    m.line([(140, 3040), (830, 2380), (830, 3250), (1660, 2380), (1660, 3250), (2350, 2380)], fill=(11, 116, 255, 42), width=180, joint="curve")
    img.alpha_composite(m_layer)

    logo = Image.open(LOGO_PATH).convert("RGBA")
    paste_contained(img, logo, (165, 145, 520, 155))

    draw.text((165, 425), "TREINAMENTO DE ACESSO AO", font=font("arialbd.ttf", 65), fill="#ffffff", stroke_width=3, stroke_fill="#244f86")
    draw.text((165, 510), "RECINTO ALFANDEGADO", font=font("arialbd.ttf", 90), fill="#ffffff", stroke_width=4, stroke_fill="#244f86")
    draw.line((165, 650, 980, 650), fill=green, width=8)
    draw.ellipse((970, 632, 1008, 670), fill=green)

    # QR card.
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((515, 895, 1965, 2505), radius=70, fill=(15, 23, 42, 62))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    img.alpha_composite(shadow)

    rounded_rect(draw, (500, 860, 1980, 2470), 70, "#ffffff", "#cfe0ff", 5)
    draw.text((0, 0), "", font=font("arial.ttf", 1), fill=slate)

    title = "Aponte a câmera para iniciar o treinamento"
    bbox = draw.textbbox((0, 0), title, font=font("arialbd.ttf", 62))
    draw.text(((W - (bbox[2] - bbox[0])) // 2, 1010), title, font=font("arialbd.ttf", 62), fill=slate)

    qr = Image.open(QR_PATH).convert("RGBA")
    qr_size = 900
    qr = qr.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    qr_x, qr_y = (W - qr_size) // 2, 1140
    img.alpha_composite(qr, (qr_x, qr_y))

    # Logo badge over QR.
    badge_w, badge_h = 360, 138
    badge_x = (W - badge_w) // 2
    badge_y = qr_y + (qr_size - badge_h) // 2
    rounded_rect(draw, (badge_x, badge_y, badge_x + badge_w, badge_y + badge_h), 34, "#ffffff", "#dbeafe", 4)
    paste_contained(img, logo, (badge_x + 35, badge_y + 35, badge_w - 70, badge_h - 70))

    rounded_rect(draw, (760, 2110, 1720, 2196), 34, green, None)
    call = "movecta.jetguard.com.br/treinamento-terminal"
    bbox = draw.textbbox((0, 0), call, font=font("arialbd.ttf", 35))
    draw.text(((W - (bbox[2] - bbox[0])) // 2, 2135), call, font=font("arialbd.ttf", 35), fill=blue_dark)

    # Ordinance and context.
    y = 2635
    y = draw_centered(
        draw,
        "Curso Básico de Conhecimentos Aduaneiros para credenciamento de pessoas em recintos alfandegados.",
        y,
        font("arialbd.ttf", 48),
        slate,
        W,
        14,
    )
    y += 20
    y = draw_centered(
        draw,
        "Conforme PORTARIA ALF/STS Nº 205, DE 22 DE JUNHO DE 2026.",
        y,
        font("arialbd.ttf", 44),
        "#1d4ed8",
        W,
        12,
    )

    draw.text((165, 3290), "Movecta", font=font("arialbd.ttf", 36), fill=muted)
    right = "QR Code fixo para acesso ao treinamento"
    bbox = draw.textbbox((0, 0), right, font=font("arial.ttf", 32))
    draw.text((W - 165 - (bbox[2] - bbox[0]), 3290), right, font=font("arial.ttf", 32), fill=muted)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT, quality=95, dpi=(300, 300))
    print(OUT)


if __name__ == "__main__":
    main()
