"""
Ground transport search via SerpAPI Google search.
Returns real schedule/price snippets that Claude synthesises into a comparison.
"""
import logging
import os
import httpx

log = logging.getLogger(__name__)
_BASE = "https://serpapi.com/search.json"


async def _google_search(query: str, num: int = 5) -> list[dict]:
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        raise ValueError("SERPAPI_KEY is not set")

    params = {"engine": "google", "q": query, "num": num, "api_key": api_key}
    async with httpx.AsyncClient() as c:
        resp = await c.get(_BASE, params=params, timeout=15.0)
        resp.raise_for_status()
        raw = resp.json()

    snippets = []
    for r in raw.get("organic_results", [])[:num]:
        snippets.append({
            "title":   r.get("title", ""),
            "snippet": r.get("snippet", ""),
            "link":    r.get("link", ""),
        })
    return snippets


async def search_trains(origin: str, destination: str, date: str) -> dict:
    query = f"train from {origin} to {destination} {date} schedule fare IRCTC"
    snippets = await _google_search(query, num=5)
    return {
        "mode":        "train",
        "origin":      origin,
        "destination": destination,
        "date":        date,
        "results":     snippets,
        "book_at": [
            {"name": "IRCTC",        "url": "https://www.irctc.co.in"},
            {"name": "Cleartrip",    "url": "https://www.cleartrip.com/trains"},
            {"name": "MakeMyTrip",   "url": "https://www.makemytrip.com/railways"},
            {"name": "Paytm Trains", "url": "https://tickets.paytm.com/trains"},
        ],
    }


async def search_buses(origin: str, destination: str, date: str) -> dict:
    query = f"bus from {origin} to {destination} {date} price booking RedBus"
    snippets = await _google_search(query, num=5)
    return {
        "mode":        "bus",
        "origin":      origin,
        "destination": destination,
        "date":        date,
        "results":     snippets,
        "book_at": [
            {"name": "RedBus",     "url": "https://www.redbus.in"},
            {"name": "Cleartrip",  "url": "https://www.cleartrip.com/bus"},
            {"name": "AbhiBus",    "url": "https://www.abhibus.com"},
            {"name": "MakeMyTrip", "url": "https://www.makemytrip.com/bus-tickets"},
        ],
    }
