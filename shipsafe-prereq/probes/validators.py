"""C14. Courier slip validators: UPU S10 check digit and address match."""
from __future__ import annotations

import re
import unicodedata

S10_RE = re.compile(r"^[A-Z]{2}\d{9}[A-Z]{2}$")
WEIGHTS = (8, 6, 4, 2, 3, 5, 9, 7)


def s10_check_digit(serial8: str) -> int:
    s = sum(int(d) * w for d, w in zip(serial8, WEIGHTS))
    c = 11 - (s % 11)
    return {10: 0, 11: 5}.get(c, c)


def s10_valid(num: str) -> bool:
    num = re.sub(r"\s+", "", num or "").upper()
    if not S10_RE.match(num):
        return False
    digits = num[2:11]
    return s10_check_digit(digits[:8]) == int(digits[8])


def s10_make(prefix: str, serial8: str, country: str) -> str:
    return f"{prefix}{serial8}{s10_check_digit(serial8)}{country}"


_COUNTRY_ALIASES = {
    "germany": "DE", "deutschland": "DE", "de": "DE",
    "united states": "US", "usa": "US", "us": "US",
    "india": "IN", "in": "IN", "united kingdom": "GB", "uk": "GB", "gb": "GB",
}


def _norm(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _country(s: str | None) -> str:
    raw = (s or "").strip().lower()
    return _COUNTRY_ALIASES.get(raw, raw.upper())


def address_match(slip: dict, paypal_shipping: dict) -> dict:
    """slip: {destination_city, destination_postcode, destination_country}
    paypal_shipping: purchase_units[].shipping.address (admin_area_2, postal_code, country_code)
    """
    city = _norm(slip.get("destination_city")) == _norm(paypal_shipping.get("admin_area_2"))
    pc = _norm(slip.get("destination_postcode")) == _norm(paypal_shipping.get("postal_code"))
    cc = _country(slip.get("destination_country")) == _country(paypal_shipping.get("country_code"))
    return {"city": city, "postcode": pc, "country": cc, "match": city and pc and cc}


def _tests() -> list[tuple[str, bool, bool]]:
    results = []
    cases = [
        ("EE482913507IN", True),
        ("EE482913508IN", False),
        ("RR287043775IN", True),
        ("EE 482 913 507 IN", True),   # spaced, as printed on slips
        ("EE48291350IN", False),       # 8 digits only
        ("ee482913507in", True),       # lower case from OCR
        ("EE123456785IN", s10_check_digit("12345678") == 5),
    ]
    for num, expected in cases:
        got = s10_valid(num)
        results.append((f"s10_valid({num!r})", expected, got))

    ok = address_match(
        {"destination_city": "BERLIN", "destination_postcode": "10119", "destination_country": "GERMANY"},
        {"admin_area_2": "Berlin", "postal_code": "10119", "country_code": "DE"})
    results.append(("address_match Berlin/10119/DE", True, ok["match"]))
    bad = address_match(
        {"destination_city": "MUNICH", "destination_postcode": "80331", "destination_country": "GERMANY"},
        {"admin_area_2": "Berlin", "postal_code": "10119", "country_code": "DE"})
    results.append(("address_match Munich vs Berlin", False, bad["match"]))
    umlaut = address_match(
        {"destination_city": "Köln", "destination_postcode": "50667", "destination_country": "DE"},
        {"admin_area_2": "KOLN", "postal_code": "50667", "country_code": "DE"})
    results.append(("address_match Köln vs KOLN", True, umlaut["match"]))
    return results


if __name__ == "__main__":
    import json
    import sys
    from pathlib import Path

    res = _tests()
    for name, exp, got in res:
        print(f"{'ok ' if exp == got else 'FAIL'} {name} expected={exp} got={got}")
    print("check digit for EE12345678?IN ->", s10_check_digit("12345678"),
          "so valid number is", s10_make("EE", "12345678", "IN"))
    out = Path(__file__).resolve().parent.parent / "evidence" / "c14-validators.json"
    out.write_text(json.dumps([{"case": n, "expected": e, "got": g, "pass": e == g} for n, e, g in res], indent=2))
    sys.exit(0 if all(e == g for _, e, g in res) else 1)
