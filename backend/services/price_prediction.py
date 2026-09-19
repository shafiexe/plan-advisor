import logging
from services.price_calendar import get_price_calendar

log = logging.getLogger(__name__)


async def predict_flight_price(
    origin: str,
    destination: str,
    departure_date: str,   # YYYY-MM-DD
    price: float,
    currency: str = "INR",
) -> dict:
    year_month = departure_date[:7]   # YYYY-MM

    # Fetch calendar prices for context
    try:
        calendar = await get_price_calendar(
            origin=origin,
            destination=destination,
            year_month=year_month,
            currency=currency,
        )
        # price_calendar.py returns {"prices": [...]} where each entry has "price"
        days = calendar.get("prices") or []
        prices = []
        for d in days:
            p = d.get("price")
            if p and isinstance(p, (int, float)) and p > 0:
                prices.append(float(p))
    except Exception as e:
        log.warning("Price calendar fetch failed: %s", e)
        prices = []

    if prices:
        min_p  = min(prices)
        avg_p  = sum(prices) / len(prices)
        max_p  = max(prices)
        # Percentile rank of the queried price (0=cheapest, 100=most expensive)
        below  = sum(1 for p in prices if p <= price)
        pct    = round(below / len(prices) * 100)
    else:
        # No calendar data — use rough benchmarks
        min_p = avg_p = max_p = price
        pct = 50

    # Verdict thresholds
    if prices and price <= min_p * 1.05:
        verdict, color, emoji, label = "great",      "green",  "🟢", "Great Deal"
    elif prices and price <= avg_p * 0.95:
        verdict, color, emoji, label = "good",       "blue",   "🔵", "Good Price"
    elif not prices or price <= avg_p * 1.10:
        verdict, color, emoji, label = "fair",       "amber",  "🟡", "Fair Price"
    elif price <= avg_p * 1.30:
        verdict, color, emoji, label = "expensive",  "orange", "🟠", "A Bit Pricey"
    else:
        verdict, color, emoji, label = "overpriced", "red",    "🔴", "Overpriced"

    # Tip based on verdict
    tips = {
        "great":      "Book now — this is one of the cheapest prices available this month.",
        "good":       "This is below average. A solid time to book.",
        "fair":       "Prices are average. Check a few days around this date for better deals.",
        "expensive":  "Slightly above average. Try dates ±3 days or book early morning flights.",
        "overpriced": "Significantly above average. Consider flexible dates or a connecting flight.",
    }

    return {
        "origin":         origin,
        "destination":    destination,
        "departure_date": departure_date,
        "price":          price,
        "currency":       currency,
        "verdict":        verdict,
        "verdict_label":  label,
        "verdict_color":  color,
        "verdict_emoji":  emoji,
        "min_price":      round(min_p) if prices else None,
        "avg_price":      round(avg_p) if prices else None,
        "max_price":      round(max_p) if prices else None,
        "percentile":     pct if prices else None,
        "sample_size":    len(prices),
        "tip":            tips[verdict],
        "has_data":       bool(prices),
    }
