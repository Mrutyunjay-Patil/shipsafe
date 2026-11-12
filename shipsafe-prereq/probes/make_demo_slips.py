"""Fresh courier slips for the demo video, addressed to the sandbox buyer (San Jose, US).

Each tracking number is new and passes the UPU S10 check digit, so ShipSafe's duplicate check
stays quiet. One extra slip is addressed to Berlin to show the address-mismatch check.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

from make_slips import barcode, font
from validators import s10_make, s10_valid

OUT = Path(__file__).resolve().parents[2] / "submission" / "demo-assets"
OUT.mkdir(parents=True, exist_ok=True)
SAN_JOSE = ["Jerry Maguire", "2211 N First St", "SAN JOSE CA 95131", "UNITED STATES"]
BERLIN = ["M. Schneider", "Torstrasse 101", "BERLIN 10119", "GERMANY"]


def slip(tracking: str, to: list[str], contents: str) -> Image.Image:
    W, H = 900, 1200
    im = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(im)
    d.rectangle([20, 20, W - 20, H - 20], outline="black", width=3)
    d.text((W // 2, 70), "INDIA POST", font=font(64, True), fill="#b91c1c", anchor="mm")
    d.text((W // 2, 140), "Speed Post International (EMS)", font=font(34), fill="black", anchor="mm")
    d.line([40, 180, W - 40, 180], fill="black", width=2)
    d.text((60, 210), "Booking Office: JAIPUR GPO 302001", font=font(26), fill="black")
    d.text((60, 250), "Date: 12/11/2026   Weight: 0.240 kg   Postage: Rs 1,350.00", font=font(24), fill="black")
    barcode(d, 120, 320, 660, 140, tracking)
    spaced = f"{tracking[:2]} {tracking[2:5]} {tracking[5:8]} {tracking[8:11]} {tracking[11:]}"
    d.text((W // 2, 500), spaced, font=font(48, True), fill="black", anchor="mm")
    d.line([40, 560, W - 40, 560], fill="black", width=2)
    d.text((60, 590), "TO:", font=font(30, True), fill="black")
    for i, line in enumerate(to):
        d.text((120, 640 + i * 46), line, font=font(34), fill="black")
    d.text((60, 900), f"Contents: {contents}   Value: USD 28.00", font=font(22), fill="black")
    d.text((W // 2, H - 60), "Track at indiapost.gov.in", font=font(22), fill="#444", anchor="mm")
    return im.rotate(2, expand=True, fillcolor="#f4f1ea")


if __name__ == "__main__":
    for i, serial in enumerate(["61204857", "73315068", "84426179"], 1):
        t = s10_make("EE", serial, "IN")
        assert s10_valid(t)
        slip(t, SAN_JOSE, "1 x cotton scarf").save(OUT / f"slip-{i}-san-jose-{t}.png")
    t = s10_make("EE", "95537280", "IN")
    slip(t, BERLIN, "1 x cotton scarf").save(OUT / f"slip-wrong-address-berlin-{t}.png")
    print(sorted(p.name for p in OUT.glob("slip-*.png")))
