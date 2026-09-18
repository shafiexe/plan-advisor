import logging
import os
from typing import Optional

import httpx

from services import cache as _cache

log = logging.getLogger(__name__)

CACHE_TTL = int(os.getenv("FLIGHT_CACHE_TTL", "1800"))  # seconds; default 30 min

_BASE = "https://serpapi.com/search.json"

_CABIN_CLASS = {
    "ECONOMY":          1,
    "PREMIUM_ECONOMY":  2,
    "BUSINESS":         3,
    "FIRST":            4,
}


async def search_flights(
    origin: str = "",
    destination: str = "",
    departure_date: str = "",
    return_date: Optional[str] = None,
    adults: int = 1,
    cabin_class: str = "ECONOMY",
    max_results: int = 5,
    currency: str = "INR",
    slices: Optional[list] = None,
) -> dict:
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        raise ValueError(
            "SERPAPI_KEY is not set. Add it to backend/.env — get a free key at serpapi.com"
        )

    cabin = cabin_class.upper()

    # ── Multi-city path ──────────────────────────────────────────────────────
    if slices and len(slices) > 1:
        return await _search_multi_city(slices, adults, cabin, max_results, currency, api_key)

    orig = (origin or "").strip().upper()
    dest = (destination or "").strip().upper()

    # ── Cache lookup ──────────────────────────────────────────────────────────
    cache_key = (
        f"flights:{orig}:{dest}:{departure_date}:{return_date or ''}:"
        f"{cabin}:{adults}:{currency}:{max_results}"
    )
    cached = await _cache.get(cache_key)
    if cached:
        log.info("Cache HIT  %s → %s on %s", orig, dest, departure_date)
        return cached

    log.info("Cache MISS %s → %s on %s — calling Serpapi", orig, dest, departure_date)

    # ── Serpapi call ──────────────────────────────────────────────────────────
    params = {
        "engine":         "google_flights",
        "departure_id":   orig,
        "arrival_id":     dest,
        "outbound_date":  departure_date,
        "adults":         adults,
        "travel_class":   _CABIN_CLASS.get(cabin, 1),
        "currency":       currency,
        "hl":             "en",
        "type":           1 if return_date else 2,
        "api_key":        api_key,
    }
    if return_date:
        params["return_date"] = return_date

    async with httpx.AsyncClient() as c:
        resp = await c.get(_BASE, params=params, timeout=20.0)
        resp.raise_for_status()
        result = _parse(resp.json(), max_results, orig, dest)

    # ── Store in cache ────────────────────────────────────────────────────────
    await _cache.set(cache_key, result, ttl=CACHE_TTL)
    log.info("Cached %s → %s on %s for %ds", orig, dest, departure_date, CACHE_TTL)
    return result


def _duration_str(minutes: int) -> str:
    h, m = divmod(minutes, 60)
    return f"{h}h {m}m" if m else f"{h}h"


async def _search_multi_city(
    slices: list,
    adults: int,
    cabin: str,
    max_results: int,
    currency: str,
    api_key: str,
) -> dict:
    """Run each leg as a separate search and combine."""
    import asyncio as _asyncio

    async def _one(s: dict) -> dict:
        try:
            return await search_flights(
                origin=s["origin"],
                destination=s["destination"],
                departure_date=s["departure_date"],
                adults=adults,
                cabin_class=cabin,
                max_results=max_results,
                currency=currency,
            )
        except Exception as e:
            log.warning("Multi-city leg error: %s", e)
            return {"flights_found": 0, "results": [], "origin": s.get("origin", ""), "destination": s.get("destination", "")}

    leg_results = await _asyncio.gather(*[_one(s) for s in slices])

    all_results = []
    for i, leg in enumerate(leg_results):
        for r in leg.get("results", []):
            r["leg"] = i + 1
            all_results.append(r)

    labels = " → ".join(
        f"{s['origin']}-{s['destination']} ({s['departure_date']})" for s in slices
    )
    return {
        "flights_found":  len(all_results),
        "origin":         slices[0]["origin"],
        "destination":    slices[-1]["destination"],
        "is_multi_city":  True,
        "legs":           [{"origin": s["origin"], "destination": s["destination"], "departure_date": s["departure_date"]} for s in slices],
        "route_label":    labels,
        "price_level":    "",
        "typical_range":  [],
        "results":        all_results,
    }


def _parse(raw: dict, max_results: int, origin: str = "", destination: str = "") -> dict:
    best   = raw.get("best_flights", [])
    others = raw.get("other_flights", [])
    all_flights = (best + others)[:max_results]

    results = []
    for offer in all_flights:
        legs = offer.get("flights", [])
        if not legs:
            continue

        segments = []
        for leg in legs:
            dep = leg.get("departure_airport", {})
            arr = leg.get("arrival_airport", {})
            segments.append({
                "from":          dep.get("id", ""),
                "from_name":     dep.get("name", ""),
                "to":            arr.get("id", ""),
                "to_name":       arr.get("name", ""),
                "departs":       dep.get("time", ""),
                "arrives":       arr.get("time", ""),
                "airline":       leg.get("airline", ""),
                "airline_logo":  leg.get("airline_logo", ""),
                "flight_number": leg.get("flight_number", ""),
                "duration":      _duration_str(leg.get("duration", 0)),
                "airplane":      leg.get("airplane", ""),
            })

        price_raw = offer.get("price", 0)
        currency  = raw.get("search_parameters", {}).get("currency", "USD")
        results.append({
            "price":          f"{price_raw} {currency}",
            "price_number":   price_raw,
            "currency":       currency,
            "total_duration": _duration_str(offer.get("total_duration", 0)),
            "stops":          len(legs) - 1,
            "segments":       segments,
            "airline_logo":   offer.get("airline_logo", legs[0].get("airline_logo", "") if legs else ""),
            "airline":        legs[0].get("airline", "") if legs else "",
            "is_best":        offer in (raw.get("best_flights") or []),
        })

    insights = raw.get("price_insights", {})
    return {
        "flights_found": len(results),
        "origin":        raw.get("search_parameters", {}).get("departure_id", origin),
        "destination":   raw.get("search_parameters", {}).get("arrival_id", destination),
        "price_level":   insights.get("price_level", ""),
        "typical_range": insights.get("typical_price_range", []),
        "results":       results,
    }
