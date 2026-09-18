"""
OTA flight price scraper using scrape.do.

Fetches fully JS-rendered search result pages from MakeMyTrip, Goibibo,
Cleartrip and Yatra, parses flight cards, and returns results in the same
dict format as serpapi_flights. All results are cached in Redis.

CSS selectors are the most likely breakage point — OTA sites update their
HTML often. Check backend logs for parse errors and adjust selectors here.
"""

import asyncio
import logging
import os
import re
from datetime import datetime
from typing import Callable, Optional

import httpx
from bs4 import BeautifulSoup

from services import cache as _cache

log = logging.getLogger(__name__)

SCRAPE_DO_BASE = "https://api.scrape.do"
CACHE_TTL      = int(os.getenv("FLIGHT_CACHE_TTL", "1800"))
RENDER_WAIT_MS = int(os.getenv("OTA_RENDER_WAIT_MS", "15000"))


# ── Date helpers ──────────────────────────────────────────────────────────────

def _to_ddmmyyyy(iso: str, sep: str = "/") -> str:
    d = datetime.strptime(iso, "%Y-%m-%d")
    return d.strftime(f"%d{sep}%m{sep}%Y")

def _to_mmddyyyy(iso: str, sep: str = "/") -> str:
    d = datetime.strptime(iso, "%Y-%m-%d")
    return d.strftime(f"%m{sep}%d{sep}%Y")

def _to_yyyymmdd(iso: str) -> str:
    return iso.replace("-", "")


# ── Cabin class maps ──────────────────────────────────────────────────────────

_MMT_CABIN = {
    "ECONOMY": "E", "PREMIUM_ECONOMY": "PE", "BUSINESS": "B", "FIRST": "F",
}
_CLEARTRIP_CABIN = {
    "ECONOMY": "Economy", "PREMIUM_ECONOMY": "PremiumEconomy",
    "BUSINESS": "Business", "FIRST": "First",
}
_YATRA_CABIN = {
    "ECONOMY": "Y", "PREMIUM_ECONOMY": "S", "BUSINESS": "C", "FIRST": "F",
}


# ── scrape.do fetch ───────────────────────────────────────────────────────────

async def _fetch(url: str, wait_selector: Optional[str] = None) -> Optional[str]:
    """
    OTA scraping is currently disabled — Indian OTAs (MMT, Goibibo, Cleartrip, Yatra)
    serve bot-detection pages regardless of proxy/render settings, making scrape.do
    credits worthless here. Set OTA_SCRAPING_ENABLED=true in .env to re-enable once
    a working extraction strategy is confirmed.
    """
    if os.getenv("OTA_SCRAPING_ENABLED", "false").lower() != "true":
        log.info("OTA scraping disabled (OTA_SCRAPING_ENABLED != true) — skipping %s", url[:60])
        return None

    token = os.getenv("SCRAPE_DO_TOKEN")
    if not token:
        log.error("SCRAPE_DO_TOKEN not set — skipping OTA scrape")
        return None
    try:
        # NOTE: do NOT use super=true — costs 10 credits/request and OTAs still block
        params: dict = {
            "token":          token,
            "url":            url,
            "render":         "true",
            "countryCode":    "IN",
            "waitForTimeout": RENDER_WAIT_MS,
        }
        if wait_selector:
            params["waitForSelector"] = wait_selector

        async with httpx.AsyncClient() as c:
            resp = await c.get(SCRAPE_DO_BASE, params=params, timeout=120.0)

        log.info("scrape.do → HTTP %d  len=%d  url=%s", resp.status_code, len(resp.text), url[:80])
        if resp.status_code != 200:
            log.warning("scrape.do non-200: %s", resp.text[:300])
            return None
        log.debug("scrape.do HTML snippet: %s", resp.text[:1000])
        return resp.text
    except Exception as exc:
        log.warning("scrape.do fetch error: %s", exc)
        return None


# ── Generic helpers ───────────────────────────────────────────────────────────

def _price_from_text(text: str) -> Optional[float]:
    """Extract first number from text like '₹12,500' or 'USD 148'."""
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None

def _stops_from_text(text: str) -> int:
    text = text.lower()
    if any(w in text for w in ("non", "direct", "0 stop")):
        return 0
    m = re.search(r"(\d)", text)
    return int(m.group(1)) if m else 1

def _make_offer(
    airline: str, logo: str, price: float, currency: str,
    dep_time: str, arr_time: str, duration: str, stops: int,
    origin: str, dest: str,
) -> dict:
    return {
        "price":          f"{int(price)} {currency}",
        "price_number":   price,
        "currency":       currency,
        "total_duration": duration,
        "stops":          stops,
        "segments": [{
            "from":          origin,
            "from_name":     origin,
            "to":            dest,
            "to_name":       dest,
            "departs":       dep_time,
            "arrives":       arr_time,
            "airline":       airline,
            "airline_logo":  logo,
            "flight_number": "",
            "duration":      duration,
            "airplane":      "",
        }],
        "airline_logo": logo,
        "airline":      airline,
        "is_best":      False,
    }


# ── MakeMyTrip ────────────────────────────────────────────────────────────────

async def _mmt(
    orig: str, dest: str, date: str,
    adults: int, cabin: str, currency: str, max_results: int,
) -> list[dict]:
    # MMT uses MM/DD/YYYY in the itinerary parameter
    date_fmt   = _to_mmddyyyy(date)
    cabin_code = _MMT_CABIN.get(cabin, "E")
    url = (
        f"https://www.makemytrip.com/flight/search"
        f"?itinerary={orig}-{dest}-{date_fmt}"
        f"&tripType=O&paxType=A-{adults}_C-0_I-0"
        f"&intl=Y&cabinClass={cabin_code}"
    )
    log.info("MMT → %s", url)
    html = await _fetch(url, wait_selector=".fli-list,.listingCard,[data-cy='flightCardWrapper']")
    if not html:
        return []
    results = _parse_mmt(html, orig, dest, max_results)
    log.info("MMT returned %d results", len(results))
    return results

def _parse_mmt(html: str, orig: str, dest: str, max_n: int) -> list[dict]:
    soup   = BeautifulSoup(html, "lxml")
    cards  = (
        soup.select(".fli-list .fliCard") or
        soup.select("[data-cy='flightCardWrapper']") or
        soup.select(".listingCard") or
        []
    )
    results: list[dict] = []
    for card in cards[:max_n]:
        try:
            price_el = (
                card.select_one("[data-cy='flightPrice']") or
                card.select_one(".priceSection .actualPrice") or
                card.select_one(".fliCrd_price")
            )
            price = _price_from_text(price_el.get_text()) if price_el else None
            if not price:
                continue

            airline_el = card.select_one("[data-cy='airlineName']") or card.select_one(".airline-name")
            airline    = airline_el.get_text(strip=True) if airline_el else "Unknown"

            logo_el = card.select_one("img[src*='airlines']") or card.select_one(".airline-logo img")
            logo    = logo_el.get("src", "") if logo_el else ""

            dep_el   = card.select_one("[data-cy='depTime']") or card.select_one(".fliOD_origin .time")
            arr_el   = card.select_one("[data-cy='arrTime']") or card.select_one(".fliOD_dest .time")
            dep_time = dep_el.get_text(strip=True) if dep_el else ""
            arr_time = arr_el.get_text(strip=True) if arr_el else ""

            dur_el  = card.select_one("[data-cy='flightDuration']") or card.select_one(".fliCrd_time")
            duration = dur_el.get_text(strip=True) if dur_el else ""

            stop_el = card.select_one("[data-cy='stops']") or card.select_one(".fliCrd_stops")
            stops   = _stops_from_text(stop_el.get_text()) if stop_el else 1

            # MMT shows INR prices
            results.append(_make_offer(airline, logo, price, "INR", dep_time, arr_time, duration, stops, orig, dest))
        except Exception as e:
            log.debug("MMT card error: %s", e)
    log.info("MMT parsed %d results from %d cards", len(results), len(cards))
    return results


# ── Goibibo ───────────────────────────────────────────────────────────────────

async def _goibibo(
    orig: str, dest: str, date: str,
    adults: int, cabin: str, currency: str, max_results: int,
) -> list[dict]:
    date_fmt = _to_yyyymmdd(date)
    url = (
        f"https://www.goibibo.com/flights/search/"
        f"?source={orig}&destination={dest}"
        f"&departureDate={date_fmt}"
        f"&adults={adults}&children=0&infants=0&cabin={cabin}"
    )
    log.info("Goibibo → %s", url)
    html = await _fetch(url, wait_selector="[class*='FlightCard'],[class*='flightCard'],.listing-card-container")
    if not html:
        return []
    results = _parse_goibibo(html, orig, dest, max_results)
    log.info("Goibibo returned %d results", len(results))
    return results

def _parse_goibibo(html: str, orig: str, dest: str, max_n: int) -> list[dict]:
    soup  = BeautifulSoup(html, "lxml")
    cards = (
        soup.select("[class*='FlightCard']") or
        soup.select(".listing-card-container .flightCard") or
        soup.select(".gi-flight-result-card") or
        []
    )
    results: list[dict] = []
    for card in cards[:max_n]:
        try:
            price_el = (
                card.select_one("[data-testid='price']") or
                card.select_one("[class*='price']")
            )
            price = _price_from_text(price_el.get_text()) if price_el else None
            if not price:
                continue

            airline_el = card.select_one("[data-testid='airline']") or card.select_one("[class*='airline'] [class*='name']")
            airline    = airline_el.get_text(strip=True) if airline_el else "Unknown"

            logo_el = card.select_one("img[src*='airline']")
            logo    = logo_el.get("src", "") if logo_el else ""

            dep_el   = card.select_one("[data-testid='depTime']") or card.select_one("[class*='departure'] [class*='time']")
            arr_el   = card.select_one("[data-testid='arrTime']") or card.select_one("[class*='arrival'] [class*='time']")
            dep_time = dep_el.get_text(strip=True) if dep_el else ""
            arr_time = arr_el.get_text(strip=True) if arr_el else ""

            dur_el  = card.select_one("[data-testid='duration']") or card.select_one("[class*='duration']")
            duration = dur_el.get_text(strip=True) if dur_el else ""

            stop_el = card.select_one("[data-testid='stops']") or card.select_one("[class*='stop']")
            stops   = _stops_from_text(stop_el.get_text()) if stop_el else 1

            results.append(_make_offer(airline, logo, price, "INR", dep_time, arr_time, duration, stops, orig, dest))
        except Exception as e:
            log.debug("Goibibo card error: %s", e)
    log.info("Goibibo parsed %d results from %d cards", len(results), len(cards))
    return results


# ── Cleartrip ─────────────────────────────────────────────────────────────────

async def _cleartrip(
    orig: str, dest: str, date: str,
    adults: int, cabin: str, currency: str, max_results: int,
) -> list[dict]:
    date_fmt   = _to_ddmmyyyy(date, sep="-")
    cabin_code = _CLEARTRIP_CABIN.get(cabin, "Economy")
    url = (
        f"https://www.cleartrip.com/flights/results/"
        f"?from={orig}&to={dest}"
        f"&depart_date={date_fmt}"
        f"&adults={adults}&class={cabin_code}"
    )
    log.info("Cleartrip → %s", url)
    html = await _fetch(url, wait_selector="[class*='FlightCard'],[class*='flight-card'],.SearchCardResult")
    if not html:
        return []
    results = _parse_cleartrip(html, orig, dest, max_results)
    log.info("Cleartrip returned %d results", len(results))
    return results

def _parse_cleartrip(html: str, orig: str, dest: str, max_n: int) -> list[dict]:
    soup  = BeautifulSoup(html, "lxml")
    cards = (
        soup.select("[class*='FlightCard']") or
        soup.select(".flight-card-container .flight-card") or
        soup.select(".SearchCardResult") or
        []
    )
    results: list[dict] = []
    for card in cards[:max_n]:
        try:
            price_el = (
                card.select_one("[class*='Price']") or
                card.select_one("[class*='price'] [class*='amount']")
            )
            price = _price_from_text(price_el.get_text()) if price_el else None
            if not price:
                continue

            airline_el = card.select_one("[class*='airline'] [class*='name']")
            airline    = airline_el.get_text(strip=True) if airline_el else "Unknown"

            logo_el = card.select_one("img[class*='logo']") or card.select_one("img[src*='airline']")
            logo    = logo_el.get("src", "") if logo_el else ""

            dep_el   = card.select_one("[class*='depart'] [class*='time']") or card.select_one("[class*='departure-time']")
            arr_el   = card.select_one("[class*='arrive'] [class*='time']") or card.select_one("[class*='arrival-time']")
            dep_time = dep_el.get_text(strip=True) if dep_el else ""
            arr_time = arr_el.get_text(strip=True) if arr_el else ""

            dur_el  = card.select_one("[class*='duration']")
            duration = dur_el.get_text(strip=True) if dur_el else ""

            stop_el = card.select_one("[class*='stop']")
            stops   = _stops_from_text(stop_el.get_text()) if stop_el else 1

            results.append(_make_offer(airline, logo, price, "INR", dep_time, arr_time, duration, stops, orig, dest))
        except Exception as e:
            log.debug("Cleartrip card error: %s", e)
    log.info("Cleartrip parsed %d results from %d cards", len(results), len(cards))
    return results


# ── Yatra ─────────────────────────────────────────────────────────────────────

async def _yatra(
    orig: str, dest: str, date: str,
    adults: int, cabin: str, currency: str, max_results: int,
) -> list[dict]:
    date_fmt   = _to_ddmmyyyy(date, sep="-")
    cabin_code = _YATRA_CABIN.get(cabin, "Y")
    url = (
        f"https://flights.yatra.com/air-search-result"
        f"?adult={adults}&child=0&infant=0"
        f"&type=O&from={orig}&to={dest}"
        f"&depart_date={date_fmt}&class={cabin_code}"
    )
    log.info("Yatra → %s", url)
    html = await _fetch(url, wait_selector=".flightResultRow,[class*='flight-result']")
    if not html:
        return []
    results = _parse_yatra(html, orig, dest, max_results)
    log.info("Yatra returned %d results", len(results))
    return results

def _parse_yatra(html: str, orig: str, dest: str, max_n: int) -> list[dict]:
    soup  = BeautifulSoup(html, "lxml")
    cards = (
        soup.select(".flightResultRow") or
        soup.select("[class*='flight-result']") or
        soup.select(".boxshadow") or
        []
    )
    results: list[dict] = []
    for card in cards[:max_n]:
        try:
            price_el = card.select_one("[class*='price'] .amount") or card.select_one("[class*='price']")
            price = _price_from_text(price_el.get_text()) if price_el else None
            if not price:
                continue

            airline_el = card.select_one(".airline-name") or card.select_one("[class*='carrier']")
            airline    = airline_el.get_text(strip=True) if airline_el else "Unknown"

            logo_el = card.select_one("img[class*='logo']") or card.select_one("img[src*='airline']")
            logo    = logo_el.get("src", "") if logo_el else ""

            dep_el   = card.select_one(".departure-time") or card.select_one("[class*='dept']")
            arr_el   = card.select_one(".arrival-time")   or card.select_one("[class*='arrv']")
            dep_time = dep_el.get_text(strip=True) if dep_el else ""
            arr_time = arr_el.get_text(strip=True) if arr_el else ""

            dur_el  = card.select_one(".flight-duration") or card.select_one("[class*='duration']")
            duration = dur_el.get_text(strip=True) if dur_el else ""

            stop_el = card.select_one(".stop-count") or card.select_one("[class*='stop']")
            stops   = _stops_from_text(stop_el.get_text()) if stop_el else 1

            results.append(_make_offer(airline, logo, price, "INR", dep_time, arr_time, duration, stops, orig, dest))
        except Exception as e:
            log.debug("Yatra card error: %s", e)
    log.info("Yatra parsed %d results from %d cards", len(results), len(cards))
    return results


# ── Public API ─────────────────────────────────────────────────────────────────

_SCRAPERS: dict[str, Callable] = {
    "MakeMyTrip": _mmt,
    "Goibibo":    _goibibo,
    "Cleartrip":  _cleartrip,
    "Yatra":      _yatra,
}


async def scrape_all_otas(
    origin: str,
    destination: str,
    departure_date: str,
    adults: int = 1,
    cabin_class: str = "ECONOMY",
    max_results: int = 3,
    currency: str = "USD",
) -> dict[str, list[dict]]:
    """
    Run all OTA scrapers in parallel with Redis caching.
    Returns {source_name: [flight_offer, ...]}
    """
    orig  = origin.strip().upper()
    dest  = destination.strip().upper()
    cabin = cabin_class.upper()

    async def _one(name: str, fn: Callable) -> tuple[str, list[dict]]:
        key = f"ota:{name.lower()}:{orig}:{dest}:{departure_date}:{cabin}:{adults}:{max_results}"
        cached = await _cache.get(key)
        if cached is not None:
            log.info("Cache HIT  %s %s→%s", name, orig, dest)
            return name, cached
        log.info("Cache MISS %s %s→%s — scraping", name, orig, dest)
        try:
            results = await fn(orig, dest, departure_date, adults, cabin, currency, max_results)
        except Exception as exc:
            log.warning("%s failed: %s", name, exc)
            results = []
        await _cache.set(key, results, ttl=CACHE_TTL)
        return name, results

    pairs = await asyncio.gather(*[_one(n, fn) for n, fn in _SCRAPERS.items()])
    return dict(pairs)
