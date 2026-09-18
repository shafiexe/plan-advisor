"""
Fetch cheapest-per-day prices for a full month using Travelpayouts.
"""
import logging
import os
from collections import defaultdict

import httpx

from services import cache as _cache

log = logging.getLogger(__name__)

_BASE = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"
CACHE_TTL = int(os.getenv("FLIGHT_CACHE_TTL", "1800"))


async def get_price_calendar(
    origin: str,
    destination: str,
    year_month: str,        # "2026-10"
    currency: str = "INR",
) -> dict:
    """
    Returns prices for each day in the given month.
    Hits Travelpayouts with departure_at=YYYY-MM and limit=31.
    """
    token = os.getenv("TRAVELPAYOUTS_TOKEN")
    if not token:
        log.error("TRAVELPAYOUTS_TOKEN not set")
        return _empty(origin, destination, year_month, currency)

    orig = origin.strip().upper()
    dest = destination.strip().upper()
    curr = currency.lower()
    month = year_month[:7]  # ensure YYYY-MM

    cache_key = f"cal:{orig}:{dest}:{month}:{curr}"
    cached = await _cache.get(cache_key)
    if cached is not None:
        log.info("Cache HIT calendar %s→%s %s", orig, dest, month)
        return cached

    log.info("Cache MISS calendar %s→%s %s — calling API", orig, dest, month)

    params = {
        "origin":       orig,
        "destination":  dest,
        "departure_at": month,
        "one_way":      "true",
        "currency":     curr,
        "sorting":      "price",
        "limit":        31,
        "token":        token,
    }

    try:
        async with httpx.AsyncClient() as c:
            resp = await c.get(_BASE, params=params, timeout=20.0)
        resp.raise_for_status()
        raw = resp.json()
    except Exception as exc:
        log.warning("Travelpayouts calendar error: %s", exc)
        return _empty(orig, dest, month, currency)

    if not raw.get("success"):
        return _empty(orig, dest, month, currency)

    currency_code = (raw.get("currency") or curr).upper()
    flights = raw.get("data") or []

    # Keep only the cheapest flight per day
    by_date: dict[str, dict] = {}
    for f in flights:
        dep = str(f.get("departure_at") or "")[:10]  # "2026-10-13"
        price = float(f.get("price") or 0)
        if not dep or not price:
            continue
        if dep not in by_date or price < by_date[dep]["price"]:
            link = f.get("link", "")
            by_date[dep] = {
                "date":     dep,
                "price":    price,
                "airline":  str(f.get("airline") or ""),
                "currency": currency_code,
                "link":     f"https://www.aviasales.com{link}" if link else "",
            }

    prices = sorted(by_date.values(), key=lambda x: x["date"])

    result = {
        "origin":      orig,
        "destination": dest,
        "year_month":  month,
        "currency":    currency_code,
        "prices":      prices,
    }
    await _cache.set(cache_key, result, ttl=CACHE_TTL)
    log.info("Calendar %s→%s %s: %d days with prices", orig, dest, month, len(prices))
    return result


def _empty(origin: str, destination: str, year_month: str, currency: str) -> dict:
    return {
        "origin":      origin,
        "destination": destination,
        "year_month":  year_month,
        "currency":    currency.upper(),
        "prices":      [],
    }
