"""
Bus search — uses free APIs already configured:

1. SerpAPI (SERPAPI_KEY, already used for flights)
   • engine=google  — rich snippets from RedBus / AbhiBus
   • engine=google_local — bus operator listings near route

2. Scrape.do (SCRAPE_DO_TOKEN, already in .env)
   • Renders AbhiBus search page JS → parses real seat/price/type data

Priority: Scrape.do (richer) → SerpAPI (fallback) → stub booking links only
Add ETRAVELSMART_API_KEY later for B2B live-seat API.
"""

import json
import logging
import os
import re
from datetime import datetime
from typing import Optional

import httpx

from services import cache as _cache

log = logging.getLogger(__name__)
_CACHE_TTL = 900  # 15 min

_SERPAPI  = "https://serpapi.com/search.json"
_SCRAPEDO = "https://api.scrape.do"


# ── Normalised shape ──────────────────────────────────────────────────────────

def _make_bus(
    operator: str,
    bus_type: str,
    ac: bool,
    sleeper: bool,
    semi_sleeper: bool,
    departure: str,
    arrival: str,
    duration: str,
    fare: float,
    currency: str,
    available_seats: int,
    total_seats: int,
    rating: float,
    amenities: list,
    boarding_points: list,
    dropping_points: list,
    booking_link: str,
    source: str,
) -> dict:
    return {
        "operator":        operator,
        "bus_type":        bus_type,
        "ac":              ac,
        "sleeper":         sleeper,
        "semi_sleeper":    semi_sleeper,
        "seater":          not sleeper and not semi_sleeper,
        "departure":       departure,
        "arrival":         arrival,
        "duration":        duration,
        "fare":            fare,
        "currency":        currency,
        "available_seats": available_seats,
        "total_seats":     total_seats,
        "rating":          rating,
        "amenities":       amenities,
        "boarding_points": boarding_points,
        "dropping_points": dropping_points,
        "booking_link":    booking_link,
        "source":          source,
    }


# ── Method 1: Scrape.do → AbhiBus ─────────────────────────────────────────────

async def _search_abhibus(
    origin: str,
    destination: str,
    date: str,         # YYYY-MM-DD
    max_results: int = 10,
    currency: str = "INR",
) -> list[dict]:
    """
    Scrape AbhiBus search results using Scrape.do (renders JS).
    AbhiBus embeds a __NEXT_DATA__ JSON blob in the page that has
    full bus listings with type, fare, seats, operator.
    """
    token = os.getenv("SCRAPE_DO_TOKEN")
    if not token:
        raise ValueError("SCRAPE_DO_TOKEN not set")

    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        date_str = dt.strftime("%d-%b-%Y")      # e.g. "20-Sep-2026"
    except ValueError:
        date_str = date

    orig = origin.lower().replace(" ", "-")
    dest = destination.lower().replace(" ", "-")
    target_url = (
        f"https://www.abhibus.com/bus/{orig}-to-{dest}/{date_str}/1/S"
    )

    params = {
        "token":  token,
        "url":    target_url,
        "render": "true",        # execute JS so __NEXT_DATA__ is populated
    }

    async with httpx.AsyncClient() as c:
        resp = await c.get(_SCRAPEDO, params=params, timeout=35.0)
        resp.raise_for_status()
        html = resp.text

    return _parse_abhibus_html(html, origin, destination, date, currency, max_results)


def _parse_abhibus_html(
    html: str,
    origin: str,
    destination: str,
    date: str,
    currency: str,
    max_results: int,
) -> list[dict]:
    """Extract bus listings from AbhiBus's __NEXT_DATA__ JSON embed."""
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
    if not match:
        return []

    try:
        next_data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return []

    # Navigate to buses list — path varies by AbhiBus version
    buses_raw: list = []
    try:
        page_props = next_data["props"]["pageProps"]
        buses_raw = (
            page_props.get("busData")
            or page_props.get("buses")
            or page_props.get("searchResult", {}).get("buses", [])
            or []
        )
    except (KeyError, TypeError):
        # Try flattening the whole structure to find bus objects
        buses_raw = _deep_find_buses(next_data)

    results = []
    for b in buses_raw[:max_results]:
        try:
            results.append(_normalise_abhibus(b, origin, destination, date, currency))
        except Exception:
            continue

    return [r for r in results if r is not None]


def _normalise_abhibus(b: dict, origin: str, destination: str, date: str, currency: str) -> Optional[dict]:
    """Map one AbhiBus bus dict to our normalised shape."""
    bus_type_raw = str(b.get("busType") or b.get("type") or b.get("vehicleType") or "")
    ac        = "non" not in bus_type_raw.lower() and ("a/c" in bus_type_raw.lower() or "ac" in bus_type_raw.lower() or "volvo" in bus_type_raw.lower())
    sleeper   = "sleeper" in bus_type_raw.lower() and "semi" not in bus_type_raw.lower()
    semi      = "semi" in bus_type_raw.lower()

    fare  = float(b.get("fare") or b.get("price") or b.get("minFare") or b.get("basePrice") or 0)
    avail = int(b.get("availableSeats") or b.get("seatsAvailable") or b.get("availableCount") or 0)
    total = int(b.get("totalSeats") or avail + 5)

    dep = b.get("departureTime") or b.get("depTime") or b.get("startTime") or ""
    arr = b.get("arrivalTime") or b.get("arrTime") or b.get("endTime") or ""
    dur = b.get("duration") or b.get("travelDuration") or _calc_duration(dep, arr)

    operator = b.get("operatorName") or b.get("travelName") or b.get("busName") or "Unknown"
    rating   = float(b.get("rating") or b.get("operatorRating") or 0)
    amenities= _extract_amenities(b)

    link = b.get("bookingLink") or b.get("link") or _abhibus_link(origin, destination, date)

    if fare == 0 and avail == 0:
        return None

    return _make_bus(
        operator=operator,
        bus_type=bus_type_raw or _infer_type(ac, sleeper, semi),
        ac=ac, sleeper=sleeper, semi_sleeper=semi,
        departure=dep, arrival=arr, duration=dur,
        fare=fare, currency=currency,
        available_seats=avail, total_seats=total,
        rating=rating, amenities=amenities,
        boarding_points=[], dropping_points=[],
        booking_link=link, source="AbhiBus",
    )


def _deep_find_buses(data, depth=0) -> list:
    """Recursively look for a list of bus-shaped objects."""
    if depth > 6:
        return []
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
        if any(k in data[0] for k in ("busType", "fare", "operatorName", "departureTime", "busName")):
            return data
    if isinstance(data, dict):
        for v in data.values():
            found = _deep_find_buses(v, depth + 1)
            if found:
                return found
    return []


# ── Method 2: SerpAPI → parse Google rich snippets ────────────────────────────

async def _search_serpapi(
    origin: str,
    destination: str,
    date: str,
    max_results: int = 10,
    currency: str = "INR",
) -> list[dict]:
    """
    Two targeted Google searches via SerpAPI; parse rich snippets
    for bus operator/type/price/timing. Results are approximate but real.
    """
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        raise ValueError("SERPAPI_KEY not set")

    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        date_display = dt.strftime("%d %b %Y")
    except ValueError:
        date_display = date

    queries = [
        f"AC sleeper semi-sleeper bus {origin} to {destination} {date_display} price redbus abhibus",
        f"non AC sleeper seater bus {origin} to {destination} {date_display} KSRTC MSRTC booking",
    ]

    snippets: list[dict] = []
    for q in queries:
        params = {"engine": "google", "q": q, "num": 8, "api_key": api_key, "hl": "en", "gl": "in"}
        try:
            async with httpx.AsyncClient() as c:
                resp = await c.get(_SERPAPI, params=params, timeout=15.0)
                resp.raise_for_status()
                raw = resp.json()

            # Answer box / rich result (most structured)
            ab = raw.get("answer_box") or {}
            if ab.get("answer") or ab.get("snippet"):
                snippets.append({"title": ab.get("title", ""), "snippet": ab.get("answer") or ab.get("snippet", ""), "link": ab.get("link", "")})

            for r in raw.get("organic_results", [])[:6]:
                snippets.append({
                    "title":   r.get("title", ""),
                    "snippet": r.get("snippet", ""),
                    "link":    r.get("link", ""),
                })
        except Exception as e:
            log.warning("SerpAPI query failed: %s", e)

    return _parse_snippets(snippets, origin, destination, date, currency, max_results)


def _parse_snippets(
    snippets: list[dict],
    origin: str,
    destination: str,
    date: str,
    currency: str,
    max_results: int,
) -> list[dict]:
    """Extract bus data from Google search result snippets using regex."""
    results: list[dict] = []
    seen: set = set()

    for s in snippets:
        title   = s.get("title", "")
        snippet = s.get("snippet", "")
        link    = s.get("link", "")
        text    = f"{title} {snippet}"

        buses = _extract_buses_from_text(text, origin, destination, date, currency, link)
        for b in buses:
            key = (b["operator"].lower(), b["departure"])
            if key not in seen:
                seen.add(key)
                results.append(b)
                if len(results) >= max_results:
                    return results

    return results


# Patterns for extracting bus data from natural-language snippets
_RE_PRICE    = re.compile(r'[₹Rs\.]+\s*(\d{3,5})', re.IGNORECASE)
_RE_TIME     = re.compile(r'\b(\d{1,2}:\d{2})\s*(?:am|pm)?\b', re.IGNORECASE)
_RE_SEATS    = re.compile(r'(\d+)\s+seats?\s*(?:available|left|remaining)', re.IGNORECASE)
_RE_DURATION = re.compile(r'(\d+)\s*h(?:rs?)?\s*(\d+)?\s*m(?:in)?', re.IGNORECASE)
_RE_RATING   = re.compile(r'(\d(?:\.\d)?)\s*(?:/5|stars?|★)', re.IGNORECASE)

_KNOWN_OPERATORS = [
    "VRL Travels", "SRS Travels", "KSRTC", "MSRTC", "GSRTC", "TSRTC", "TNSTC",
    "Parveen Travels", "Orange Travels", "Kallada Travels", "Greenline", "Raj National Express",
    "National Travels", "Morning Star", "Paul Travels", "Chartered Bus", "IntrCity",
    "NueGo", "Zingbus", "AbhiBus", "Redbus"
]

_AC_KEYWORDS     = ["a/c", " ac ", "volvo", "scania", "mercedes", "air condition"]
_NONAC_KEYWORDS  = ["non-ac", "non ac", "ordinary"]
_SLEEPER_KW      = ["sleeper", "2+1", "berth"]
_SEMI_KW         = ["semi-sleeper", "semi sleeper", "push back"]
_SEATER_KW       = ["seater", "2+2", "seat"]
_AMENITY_MAP     = {"wifi": "WiFi", "usb": "USB Charging", "water": "Water Bottle",
                    "blanket": "Blanket", "snack": "Snacks", "movie": "Movie",
                    "charging": "USB Charging", "pillow": "Pillow"}


def _classify_bus(text: str) -> tuple[bool, bool, bool]:
    """Return (ac, sleeper, semi_sleeper) from text."""
    t = text.lower()
    ac      = any(k in t for k in _AC_KEYWORDS) and not any(k in t for k in _NONAC_KEYWORDS)
    semi    = any(k in t for k in _SEMI_KW)
    sleeper = any(k in t for k in _SLEEPER_KW) and not semi
    return ac, sleeper, semi


def _extract_buses_from_text(
    text: str,
    origin: str,
    destination: str,
    date: str,
    currency: str,
    link: str,
) -> list[dict]:
    """Parse one snippet; may return 0-3 bus objects."""
    if not text.strip():
        return []

    prices   = [float(m.group(1)) for m in _RE_PRICE.finditer(text)]
    times    = [m.group(1) for m in _RE_TIME.finditer(text)]
    seats_m  = _RE_SEATS.search(text)
    dur_m    = _RE_DURATION.search(text)
    rating_m = _RE_RATING.search(text)

    if not prices:
        return []

    ac, sleeper, semi = _classify_bus(text)

    operator = next((op for op in _KNOWN_OPERATORS if op.lower() in text.lower()), "")
    if not operator:
        # Try to grab first Title-Case word sequence before a dash
        m = re.match(r'^([A-Z][a-zA-Z\s&]+?)(?:\s[-–|]|\s+bus|\s+from)', text)
        operator = m.group(1).strip() if m else "Bus Operator"

    duration = ""
    if dur_m:
        h = int(dur_m.group(1))
        m2 = int(dur_m.group(2) or 0)
        duration = f"{h}h {m2}m" if m2 else f"{h}h"

    amenities = [label for kw, label in _AMENITY_MAP.items() if kw in text.lower()]

    departure = times[0] if times else ""
    arrival   = times[1] if len(times) > 1 else ""

    buses = []
    for i, fare in enumerate(prices[:3]):
        if fare < 100:           # skip likely non-price numbers
            continue
        # Vary bus types if multiple prices (heuristic)
        if i == 1 and ac:
            ac_i, sl_i, semi_i = False, sleeper, semi
        else:
            ac_i, sl_i, semi_i = ac, sleeper, semi

        buses.append(_make_bus(
            operator=operator,
            bus_type=_infer_type(ac_i, sl_i, semi_i),
            ac=ac_i, sleeper=sl_i, semi_sleeper=semi_i,
            departure=departure, arrival=arrival, duration=duration,
            fare=fare, currency=currency,
            available_seats=int(seats_m.group(1)) if seats_m else 0,
            total_seats=0,
            rating=float(rating_m.group(1)) if rating_m else 0.0,
            amenities=amenities,
            boarding_points=[], dropping_points=[],
            booking_link=link or _redbus_link(origin, destination, date),
            source="Google via SerpAPI",
        ))

    return buses


# ── Public entry point ────────────────────────────────────────────────────────

async def search_buses(
    origin: str,
    destination: str,
    date: str,
    adults: int = 1,
    max_results: int = 10,
    currency: str = "INR",
) -> dict:
    """
    Search buses using free, already-configured services.
    Order: Scrape.do/AbhiBus → SerpAPI/Google → booking links only.
    """
    cache_key = f"buses:{origin}:{destination}:{date}:{adults}:{currency}:{max_results}"
    cached = await _cache.get(cache_key)
    if cached:
        return cached

    buses: list[dict] = []
    source_used = "none"
    error: Optional[str] = None

    # ── 1. Scrape.do → AbhiBus (renders JS, real seat data) ──────────────────
    if os.getenv("SCRAPE_DO_TOKEN"):
        try:
            buses = await _search_abhibus(origin, destination, date, max_results, currency)
            if buses:
                source_used = "AbhiBus"
                log.info("AbhiBus: %d buses for %s→%s", len(buses), origin, destination)
        except Exception as e:
            log.warning("AbhiBus scrape failed: %s", e)
            error = str(e)

    # ── 2. SerpAPI → Google rich snippets (free, already configured) ──────────
    if not buses and os.getenv("SERPAPI_KEY"):
        try:
            buses = await _search_serpapi(origin, destination, date, max_results, currency)
            if buses:
                source_used = "Google Search"
                error = None
                log.info("SerpAPI: %d buses for %s→%s", len(buses), origin, destination)
        except Exception as e:
            log.warning("SerpAPI bus search failed: %s", e)
            error = str(e)

    # Sort: non-zero seats first, then by price
    buses.sort(key=lambda b: (b["available_seats"] == 0, b["fare"]))

    result = {
        "origin":      origin,
        "destination": destination,
        "date":        date,
        "buses_found": len(buses),
        "source":      source_used,
        "results":     buses,
        "error":       error if not buses else None,
        "book_at": [
            {"name": "redBus",     "url": _redbus_link(origin, destination, date)},
            {"name": "AbhiBus",    "url": _abhibus_link(origin, destination, date)},
            {"name": "Cleartrip",  "url": "https://www.cleartrip.com/bus"},
            {"name": "MakeMyTrip", "url": "https://www.makemytrip.com/bus-tickets"},
        ],
    }

    if buses:
        await _cache.set(cache_key, result, ttl=_CACHE_TTL)

    return result


# ── Helpers ───────────────────────────────────────────────────────────────────

def _infer_type(ac: bool, sleeper: bool, semi: bool) -> str:
    prefix = "AC" if ac else "Non-AC"
    if sleeper:  return f"{prefix} Sleeper"
    if semi:     return f"{prefix} Semi-Sleeper"
    return f"{prefix} Seater"


def _calc_duration(dep: str, arr: str) -> str:
    try:
        d = datetime.strptime(dep, "%H:%M")
        a = datetime.strptime(arr, "%H:%M")
        diff = int((a - d).total_seconds() / 60)
        if diff < 0: diff += 1440
        h, m = divmod(diff, 60)
        return f"{h}h {m}m" if m else f"{h}h"
    except Exception:
        return ""


def _extract_amenities(b: dict) -> list[str]:
    raw = b.get("amenities") or b.get("facilities") or b.get("Amenities") or []
    if isinstance(raw, list):
        return [str(a.get("name") or a.get("facilityName") or a) for a in raw[:8]]
    inferred = []
    mapping = {"wifi": "WiFi", "usb": "USB Charging", "water": "Water Bottle",
               "blanket": "Blanket", "snack": "Snacks", "movie": "Movie"}
    for key, label in mapping.items():
        if b.get(key) or b.get(key.capitalize()):
            inferred.append(label)
    return inferred


def _redbus_link(origin: str, destination: str, date: str) -> str:
    o = origin.lower().replace(" ", "-")
    d = destination.lower().replace(" ", "-")
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        ds = dt.strftime("%d-%b-%Y")
    except Exception:
        ds = date
    return f"https://www.redbus.in/bus-tickets/{o}-to-{d}?onward={ds}"


def _abhibus_link(origin: str, destination: str, date: str) -> str:
    o = origin.lower().replace(" ", "-")
    d = destination.lower().replace(" ", "-")
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        ds = dt.strftime("%d-%b-%Y")
    except Exception:
        ds = date
    return f"https://www.abhibus.com/bus/{o}-to-{d}/{ds}/1/S"
