"""Visa & entry requirements using the Passport Index dataset (ilyankou/passport-index-dataset).

The CSV is fetched once and cached in memory. Country names are normalised before lookup.
"""

import asyncio
import csv
import io
import logging
from functools import lru_cache

import aiohttp

log = logging.getLogger(__name__)

_DATASET_URL = (
    "https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/"
    "passport-index-matrix.csv"
)

# In-memory cache: {(passport, destination): code}
# code: "VF", "VOA", "E", "VR", "-1", or a numeric string like "90"
_CACHE: dict[tuple[str, str], str] | None = None
_HEADERS: list[str] = []   # destination country names in dataset order
_LOCK = asyncio.Lock()


async def _load_dataset() -> None:
    global _CACHE, _HEADERS
    async with aiohttp.ClientSession() as session:
        async with session.get(_DATASET_URL, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                raise RuntimeError(f"Dataset fetch failed: {resp.status}")
            text = await resp.text()

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise RuntimeError("Empty dataset")

    header_row = rows[0]
    _HEADERS = [h.strip() for h in header_row[1:]]  # skip first "Passport" column

    cache: dict[tuple[str, str], str] = {}
    for row in rows[1:]:
        if not row:
            continue
        passport = row[0].strip()
        for dest, code in zip(_HEADERS, row[1:]):
            cache[(passport.lower(), dest.lower())] = code.strip()

    _CACHE = cache
    log.info("Passport Index loaded: %d passport × %d destination combinations", len(rows) - 1, len(_HEADERS))


async def _ensure_loaded() -> None:
    global _CACHE
    if _CACHE is not None:
        return
    async with _LOCK:
        if _CACHE is None:
            try:
                await _load_dataset()
            except Exception as e:
                log.error("Failed to load Passport Index: %s", e)
                _CACHE = {}


# Common aliases → dataset name
_ALIASES: dict[str, str] = {
    "usa": "United States",
    "us": "United States",
    "united states of america": "United States",
    "uk": "United Kingdom",
    "great britain": "United Kingdom",
    "uae": "United Arab Emirates",
    "dubai": "United Arab Emirates",
    "south korea": "Korea, South",
    "north korea": "Korea, North",
    "russia": "Russia",
    "czech republic": "Czech Republic",
    "czechia": "Czech Republic",
    "taiwan": "Taiwan",
    "laos": "Laos",
    "vietnam": "Vietnam",
    "ivory coast": "Cote d'Ivoire",
    "trinidad": "Trinidad and Tobago",
    "brunei": "Brunei",
    "myanmar": "Myanmar",
    "burma": "Myanmar",
    "palestine": "Palestine",
    "macau": "Macao",
    "macao": "Macao",
    "hong kong": "Hong Kong",
    "cape verde": "Cape Verde",
    "timor-leste": "Timor-Leste",
    "east timor": "Timor-Leste",
    "tanzania": "Tanzania",
    "moldova": "Moldova",
    "bolivia": "Bolivia",
    "iran": "Iran",
    "syria": "Syria",
    "north macedonia": "North Macedonia",
    "maldives": "Maldives",
    "sri lanka": "Sri Lanka",
}

_VISA_LABELS: dict[str, dict] = {
    "VF":   {"label": "Visa-Free",         "color": "green",  "emoji": "✅"},
    "VOA":  {"label": "Visa on Arrival",   "color": "blue",   "emoji": "🛂"},
    "E":    {"label": "eVisa Required",    "color": "amber",  "emoji": "💻"},
    "VR":   {"label": "Visa Required",     "color": "red",    "emoji": "🔴"},
    "-1":   {"label": "No Admission",      "color": "red",    "emoji": "🚫"},
}


def _normalise(name: str) -> str:
    """Lower-case, strip, apply aliases."""
    n = name.strip().lower()
    return _ALIASES.get(n, name.strip()).lower()


def _find_country(name: str, is_passport: bool) -> str | None:
    """Return the exact dataset name (case-preserved) or None."""
    normalised = _normalise(name)
    if is_passport:
        # Search passport axis: all unique first-column values (keys are (passport, dest))
        for (p, _), _ in (_CACHE or {}).items():
            if p == normalised:
                return p
    else:
        for h in _HEADERS:
            if h.lower() == normalised:
                return h.lower()
    return None


def _days_note(code: str) -> str:
    try:
        days = int(code)
        return f"Visa-free for up to {days} days"
    except ValueError:
        return ""


async def get_visa_requirements(passport_country: str, destination_country: str) -> dict:
    """Return visa requirement info for a passport → destination pair."""
    await _ensure_loaded()

    if not _CACHE:
        return _error(passport_country, destination_country, "Visa dataset temporarily unavailable")

    p_key = _normalise(passport_country)
    d_key = _normalise(destination_country)

    code = _CACHE.get((p_key, d_key))

    if code is None:
        # Fuzzy: try starts-with
        for (p, d), c in _CACHE.items():
            if p.startswith(p_key[:4]) and d.startswith(d_key[:4]):
                code = c
                break

    if code is None:
        return _error(passport_country, destination_country, "Country pair not found in dataset")

    # Numeric code means visa-free with a day limit
    try:
        days = int(code)
        visa_type = "VF"
        days_allowed = days
    except ValueError:
        visa_type = code
        days_allowed = None

    info = _VISA_LABELS.get(visa_type, {"label": "Unknown", "color": "gray", "emoji": "❓"})

    # Useful supplementary notes by type
    notes: list[str] = []
    if visa_type == "VF":
        if days_allowed:
            notes.append(f"Stay up to {days_allowed} days without a visa.")
        else:
            notes.append("No visa needed — present your passport at immigration.")
        notes += [
            "Passport must be valid for at least 6 months beyond your stay.",
            "Onward or return ticket may be required.",
        ]
    elif visa_type == "VOA":
        notes += [
            "Obtain visa at the airport immigration counter on arrival.",
            "Carry passport-size photos and USD cash for the visa fee.",
            "Passport must be valid for at least 6 months.",
        ]
    elif visa_type == "E":
        notes += [
            "Apply online before travel — processing usually takes 3–7 business days.",
            "Print the eVisa approval or save it digitally.",
            "Passport must be valid for at least 6 months.",
        ]
    elif visa_type == "VR":
        notes += [
            "Apply at the destination country's embassy or consulate in your home country.",
            "Allow 2–8 weeks for processing.",
            "Required documents typically include: passport, photos, bank statements, travel itinerary, and travel insurance.",
        ]

    return {
        "passport_country":    passport_country,
        "destination_country": destination_country,
        "visa_type":           visa_type,
        "label":               info["label"],
        "color":               info["color"],
        "emoji":               info["emoji"],
        "days_allowed":        days_allowed,
        "notes":               notes,
        "error":               None,
    }


def _error(passport: str, destination: str, msg: str) -> dict:
    return {
        "passport_country":    passport,
        "destination_country": destination,
        "visa_type":           "unknown",
        "label":               "Unknown",
        "color":               "gray",
        "emoji":               "❓",
        "days_allowed":        None,
        "notes":               [],
        "error":               msg,
    }
