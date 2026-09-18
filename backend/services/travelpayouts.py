import os
import logging
from datetime import datetime, timedelta
import httpx

from services import cache as _cache

log = logging.getLogger(__name__)

_BASE = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"
CACHE_TTL = int(os.getenv("FLIGHT_CACHE_TTL", "1800"))

_AIRLINES: dict[str, str] = {
    "AI": "Air India",       "6E": "IndiGo",           "UK": "Vistara",
    "SG": "SpiceJet",        "G8": "Go First",          "IX": "Air India Express",
    "I5": "Air Asia India",  "QP": "Akasa Air",
    "EK": "Emirates",        "FZ": "flydubai",          "WY": "Oman Air",
    "QR": "Qatar Airways",   "EY": "Etihad Airways",    "SQ": "Singapore Airlines",
    "TK": "Turkish Airlines","LH": "Lufthansa",         "BA": "British Airways",
    "AA": "American Airlines","UA": "United Airlines",  "DL": "Delta Air Lines",
    "AF": "Air France",      "KL": "KLM",               "MS": "EgyptAir",
    "ET": "Ethiopian Airlines","KE": "Korean Air",      "CX": "Cathay Pacific",
    "MH": "Malaysia Airlines","TG": "Thai Airways",     "NH": "ANA",
    "JL": "Japan Airlines",  "OZ": "Asiana Airlines",   "LX": "Swiss",
    "OS": "Austrian",        "AY": "Finnair",            "SK": "SAS",
    "IB": "Iberia",          "VY": "Vueling",            "FR": "Ryanair",
    "U2": "easyJet",
}


def _duration_str(minutes: int) -> str:
    h, m = divmod(int(minutes), 60)
    return f"{h}h {m}m" if m else f"{h}h"


def _calc_arrival(dep_str: str, duration_min: int) -> str:
    try:
        dt = datetime.strptime(dep_str[:16].replace("T", " "), "%Y-%m-%d %H:%M")
        return (dt + timedelta(minutes=duration_min)).strftime("%Y-%m-%d %H:%M")
    except Exception:
        return ""


async def search_travelpayouts(
    origin: str,
    destination: str,
    departure_date: str,
    adults: int = 1,
    cabin_class: str = "ECONOMY",
    max_results: int = 5,
    currency: str = "USD",
    return_date: str | None = None,
) -> list[dict]:
    """
    Fetch cheapest flights from Travelpayouts/Aviasales data API.
    Returns a list of FlightOffer-compatible dicts with source="Travelpayouts".
    """
    token = os.getenv("TRAVELPAYOUTS_TOKEN")
    if not token:
        log.error("TRAVELPAYOUTS_TOKEN not set")
        return []

    orig = origin.strip().upper()
    dest = destination.strip().upper()
    curr = currency.lower()

    cache_key = f"tp:{orig}:{dest}:{departure_date}:{cabin_class}:{curr}:{max_results}"
    cached = await _cache.get(cache_key)
    if cached is not None:
        log.info("Cache HIT Travelpayouts %s→%s", orig, dest)
        return cached

    log.info("Cache MISS Travelpayouts %s→%s — calling API", orig, dest)

    base_params: dict = {
        "origin":      orig,
        "destination": dest,
        "one_way":     "false" if return_date else "true",
        "currency":    curr,
        "sorting":     "price",
        "limit":       min(max_results * 2, 30),
        "token":       token,
    }
    if return_date:
        base_params["return_at"] = return_date

    # Try specific date first; fall back to month-level (YYYY-MM) if empty
    date_candidates = [departure_date, departure_date[:7]] if len(departure_date) > 7 else [departure_date]

    flights: list[dict] = []
    for date_str in date_candidates:
        params = {**base_params, "departure_at": date_str}
        try:
            async with httpx.AsyncClient() as c:
                resp = await c.get(_BASE, params=params, timeout=20.0)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.warning("Travelpayouts API error: %s", exc)
            return []

        if not data.get("success"):
            log.warning("Travelpayouts success=false: %s", data)
            return []

        flights = data.get("data") or []
        if flights:
            log.info("Travelpayouts %s→%s: %d results with departure_at=%s",
                     orig, dest, len(flights), date_str)
            break
        log.info("Travelpayouts %s→%s: 0 results for %s, retrying with month", orig, dest, date_str)
    currency_code = (data.get("currency") or curr).upper()
    results: list[dict] = []

    for f in flights[:max_results]:
        try:
            price = float(f.get("price") or 0)
            if not price:
                continue

            airline_code = str(f.get("airline", ""))
            airline_name = _AIRLINES.get(airline_code, airline_code or "Unknown")

            dep_str = str(f.get("departure_at") or "")
            dep_fmt = dep_str[:16].replace("T", " ")

            duration_min = int(
                f.get("duration") or f.get("duration_to") or 0
            )
            duration_str = _duration_str(duration_min) if duration_min else ""
            arr_fmt = _calc_arrival(dep_str, duration_min) if dep_str and duration_min else ""

            stops = int(f.get("transfers") or 0)
            flight_number = f"{airline_code}{f.get('flight_number', '')}".strip()
            logo = f"https://www.gstatic.com/flights/airline_logos/70px/{airline_code}.png"
            link_path = f.get("link", "")
            booking_link = f"https://www.aviasales.com{link_path}" if link_path else ""

            offer: dict = {
                "price":          f"{int(price)} {currency_code}",
                "price_number":   price,
                "currency":       currency_code,
                "total_duration": duration_str,
                "stops":          stops,
                "segments": [{
                    "from":          orig,
                    "from_name":     orig,
                    "to":            dest,
                    "to_name":       dest,
                    "departs":       dep_fmt,
                    "arrives":       arr_fmt,
                    "airline":       airline_name,
                    "airline_logo":  logo,
                    "flight_number": flight_number,
                    "duration":      duration_str,
                    "airplane":      "",
                }],
                "airline_logo":  logo,
                "airline":       airline_name,
                "is_best":       False,
                "booking_link":  booking_link,
                "source":        "Travelpayouts",
            }
            results.append(offer)
        except Exception as exc:
            log.debug("Travelpayouts offer parse error: %s", exc)

    await _cache.set(cache_key, results, ttl=CACHE_TTL)
    log.info("Travelpayouts returned %d results for %s→%s", len(results), orig, dest)
    return results
