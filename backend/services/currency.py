"""Currency conversion service using the free open.er-api.com API (no key required).

In-memory cache with 1-hour TTL to avoid hammering the free API.
"""
import time
import httpx

_CACHE: dict[str, dict] = {}
_CACHE_TTL = 3600  # 1 hour in seconds

CURRENCY_META: dict[str, dict[str, str]] = {
    "INR": {"name": "Indian Rupee",       "symbol": "₹",   "flag": "🇮🇳"},
    "USD": {"name": "US Dollar",          "symbol": "$",   "flag": "🇺🇸"},
    "EUR": {"name": "Euro",               "symbol": "€",   "flag": "🇪🇺"},
    "GBP": {"name": "British Pound",      "symbol": "£",   "flag": "🇬🇧"},
    "AED": {"name": "UAE Dirham",         "symbol": "د.إ", "flag": "🇦🇪"},
    "THB": {"name": "Thai Baht",          "symbol": "฿",   "flag": "🇹🇭"},
    "SGD": {"name": "Singapore Dollar",   "symbol": "S$",  "flag": "🇸🇬"},
    "JPY": {"name": "Japanese Yen",       "symbol": "¥",   "flag": "🇯🇵"},
    "AUD": {"name": "Australian Dollar",  "symbol": "A$",  "flag": "🇦🇺"},
    "MYR": {"name": "Malaysian Ringgit",  "symbol": "RM",  "flag": "🇲🇾"},
}

TARGET_CURRENCIES = list(CURRENCY_META.keys())


async def get_exchange_rates(base_currency: str, amount: float) -> dict:
    """Fetch exchange rates from open.er-api.com and return converted amounts
    for the 10 major travel currencies.

    Returns:
        {
            "base_currency": "USD",
            "amount": 100.0,
            "rates": [
                {"currency": "Indian Rupee", "code": "INR", "symbol": "₹",
                 "rate": 84.5, "converted": 8450.0, "flag": "🇮🇳"},
                ...
            ],
            "error": None
        }
    """
    base = base_currency.upper().strip()
    now = time.time()

    # Serve from cache if still fresh
    cached = _CACHE.get(base)
    if cached and (now - cached["ts"]) < _CACHE_TTL:
        raw_rates = cached["rates"]
    else:
        try:
            url = f"https://open.er-api.com/v6/latest/{base}"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()

            if data.get("result") != "success":
                return {
                    "error": f"API error: {data.get('error-type', 'unknown')}",
                    "base_currency": base,
                    "amount": amount,
                    "rates": [],
                }

            raw_rates = data["rates"]
            _CACHE[base] = {"rates": raw_rates, "ts": now}
        except Exception as exc:
            return {
                "error": str(exc),
                "base_currency": base,
                "amount": amount,
                "rates": [],
            }

    rates = []
    for code in TARGET_CURRENCIES:
        if code == base:
            # Include the base currency itself so the UI can show it
            meta = CURRENCY_META[code]
            rates.append({
                "currency":  meta["name"],
                "code":      code,
                "symbol":    meta["symbol"],
                "rate":      1.0,
                "converted": round(amount, 2),
                "flag":      meta["flag"],
            })
            continue

        rate = raw_rates.get(code)
        if rate is None:
            continue

        meta = CURRENCY_META[code]
        rates.append({
            "currency":  meta["name"],
            "code":      code,
            "symbol":    meta["symbol"],
            "rate":      round(float(rate), 4),
            "converted": round(amount * float(rate), 2),
            "flag":      meta["flag"],
        })

    return {
        "base_currency": base,
        "amount": amount,
        "rates": rates,
        "error": None,
    }
