import os
import time
import httpx
from typing import Optional

# Use sandbox for dev, switch to api.amadeus.com for production
_BASE = "https://test.api.amadeus.com"

_token: Optional[str] = None
_token_expiry: float = 0.0


async def _get_token() -> str:
    global _token, _token_expiry

    client_id = os.getenv("AMADEUS_CLIENT_ID")
    client_secret = os.getenv("AMADEUS_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise ValueError(
            "AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are not set. "
            "Sign up at developers.amadeus.com and add them to backend/.env"
        )

    if _token and time.time() < _token_expiry - 60:
        return _token  # reuse valid token

    async with httpx.AsyncClient() as c:
        resp = await c.post(
            f"{_BASE}/v1/security/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        _token = data["access_token"]
        _token_expiry = time.time() + data["expires_in"]
        return _token


async def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None,
    adults: int = 1,
    cabin_class: str = "ECONOMY",
    max_results: int = 5,
    currency: str = "USD",
) -> dict:
    token = await _get_token()

    params = {
        "originLocationCode": origin.strip().upper(),
        "destinationLocationCode": destination.strip().upper(),
        "departureDate": departure_date,
        "adults": adults,
        "travelClass": cabin_class.upper(),
        "max": min(max_results, 10),
        "currencyCode": currency,
    }
    if return_date:
        params["returnDate"] = return_date

    async with httpx.AsyncClient() as c:
        resp = await c.get(
            f"{_BASE}/v2/shopping/flight-offers",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=20.0,
        )
        resp.raise_for_status()
        return _parse(resp.json())


def _parse(raw: dict) -> dict:
    """Simplify Amadeus response for Claude to summarise."""
    offers = raw.get("data", [])
    carriers = raw.get("dictionaries", {}).get("carriers", {})

    results = []
    for offer in offers[:10]:
        price = offer["price"]["grandTotal"]
        currency = offer["price"]["currency"]
        seats = offer.get("numberOfBookableSeats")

        itineraries = []
        for itin in offer.get("itineraries", []):
            segments = []
            for seg in itin["segments"]:
                dep = seg["departure"]
                arr = seg["arrival"]
                segments.append({
                    "from": dep["iataCode"],
                    "to": arr["iataCode"],
                    "departs": dep["at"],
                    "arrives": arr["at"],
                    "airline": carriers.get(seg["carrierCode"], seg["carrierCode"]),
                    "flight_number": f"{seg['carrierCode']}{seg['number']}",
                    "duration": seg.get("duration", ""),
                })
            itineraries.append({
                "total_duration": itin.get("duration", ""),
                "stops": len(segments) - 1,
                "segments": segments,
            })

        results.append({
            "price": f"{price} {currency}",
            "seats_available": seats,
            "itineraries": itineraries,
        })

    return {
        "flights_found": len(results),
        "origin": raw.get("data", [{}])[0].get("itineraries", [{}])[0]
            .get("segments", [{}])[0].get("departure", {}).get("iataCode", origin if results else ""),
        "destination": raw.get("data", [{}])[0].get("itineraries", [{}])[0]
            .get("segments", [{}])[-1].get("arrival", {}).get("iataCode", "") if results else "",
        "results": results,
    }
