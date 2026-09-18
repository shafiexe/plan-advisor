import logging
import os
from typing import Optional

import httpx

from services import cache as _cache

log = logging.getLogger(__name__)

_BASE    = "https://serpapi.com/search.json"
_CACHE_TTL = 3600  # 1 hour — places data is slower-changing than flights


# ── Hotels ────────────────────────────────────────────────────────────────────

async def search_hotels(
    location: str,
    check_in_date: str,
    check_out_date: str,
    adults: int = 2,
    max_results: int = 5,
    currency: str = "INR",
) -> dict:
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        raise ValueError("SERPAPI_KEY is not set")

    cache_key = f"hotels:{location}:{check_in_date}:{check_out_date}:{adults}:{currency}:{max_results}"
    cached = await _cache.get(cache_key)
    if cached:
        return cached

    params = {
        "engine":         "google_hotels",
        "q":              f"Hotels in {location}",
        "check_in_date":  check_in_date,
        "check_out_date": check_out_date,
        "adults":         adults,
        "currency":       currency,
        "hl":             "en",
        "api_key":        api_key,
    }

    async with httpx.AsyncClient() as c:
        resp = await c.get(_BASE, params=params, timeout=25.0)
        resp.raise_for_status()
        result = _parse_hotels(resp.json(), max_results, location, currency)

    await _cache.set(cache_key, result, ttl=_CACHE_TTL)
    return result


def _parse_hotels(raw: dict, max_results: int, location: str, currency: str) -> dict:
    properties = raw.get("properties", [])[:max_results]
    hotels = []
    for h in properties:
        rate = h.get("rate_per_night", {})
        hotels.append({
            "name":          h.get("name", ""),
            "rating":        h.get("overall_rating", 0),
            "reviews":       h.get("reviews", 0),
            "hotel_class":   h.get("hotel_class", ""),
            "price":         rate.get("lowest", ""),
            "price_before_taxes": rate.get("before_taxes_fees", ""),
            "currency":      currency,
            "amenities":     (h.get("amenities") or [])[:8],
            "thumbnail":     (h.get("images") or [{}])[0].get("thumbnail", ""),
            "link":          h.get("link", ""),
            "description":   h.get("description", ""),
            "nearby":        h.get("nearby_places", []),
        })

    return {
        "location":      location,
        "check_in":      raw.get("search_parameters", {}).get("check_in_date", ""),
        "check_out":     raw.get("search_parameters", {}).get("check_out_date", ""),
        "hotels_found":  len(hotels),
        "results":       hotels,
    }


# ── Restaurants ───────────────────────────────────────────────────────────────

async def find_restaurants(
    location: str,
    cuisine: str = "",
    max_results: int = 8,
) -> dict:
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        raise ValueError("SERPAPI_KEY is not set")

    query = f"{cuisine} restaurants in {location}" if cuisine else f"best restaurants in {location}"
    cache_key = f"restaurants:{location}:{cuisine}:{max_results}"
    cached = await _cache.get(cache_key)
    if cached:
        return cached

    params = {
        "engine":   "google_local",
        "q":        query,
        "location": location,
        "hl":       "en",
        "api_key":  api_key,
    }

    async with httpx.AsyncClient() as c:
        resp = await c.get(_BASE, params=params, timeout=20.0)
        resp.raise_for_status()
        result = _parse_restaurants(resp.json(), max_results, location, cuisine)

    await _cache.set(cache_key, result, ttl=_CACHE_TTL)
    return result


def _parse_restaurants(raw: dict, max_results: int, location: str, cuisine: str) -> dict:
    local = raw.get("local_results", [])[:max_results]
    restaurants = []
    for r in local:
        restaurants.append({
            "name":      r.get("title", ""),
            "rating":    r.get("rating", 0),
            "reviews":   r.get("reviews", 0),
            "type":      r.get("type", ""),
            "address":   r.get("address", ""),
            "hours":     r.get("hours", ""),
            "price":     r.get("price", ""),
            "thumbnail": r.get("thumbnail", ""),
            "phone":     r.get("phone", ""),
        })

    return {
        "location":           location,
        "cuisine_filter":     cuisine,
        "restaurants_found":  len(restaurants),
        "results":            restaurants,
    }
