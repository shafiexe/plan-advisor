import httpx
import os
import json
import logging
from datetime import datetime, date, timedelta

log = logging.getLogger(__name__)

_CONDITION_EMOJI = {
    "sunny": "☀️",
    "clear": "☀️",
    "partly cloudy": "⛅",
    "cloudy": "☁️",
    "overcast": "☁️",
    "light rain": "🌦️",
    "rain": "🌧️",
    "heavy rain": "🌧️",
    "thunderstorm": "⛈️",
    "foggy": "🌫️",
    "fog": "🌫️",
    "windy": "💨",
    "snow": "❄️",
    "snowy": "❄️",
}

_OWM_ICON_COND = {
    "01": ("Sunny", "☀️"),
    "02": ("Partly Cloudy", "⛅"),
    "03": ("Cloudy", "☁️"),
    "04": ("Overcast", "☁️"),
    "09": ("Light Rain", "🌦️"),
    "10": ("Rain", "🌧️"),
    "11": ("Thunderstorm", "⛈️"),
    "13": ("Snowy", "❄️"),
    "50": ("Foggy", "🌫️"),
}


def _emoji_for_condition(condition: str) -> str:
    low = condition.lower()
    for key, em in _CONDITION_EMOJI.items():
        if key in low:
            return em
    return "🌤️"


async def get_weather_forecast(
    destination: str,
    travel_date: str = "",
    days: int = 7,
) -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY", "")
    if api_key:
        try:
            result = await _fetch_openweather(destination, travel_date, days, api_key)
            if not result.get("error"):
                return result
        except Exception as e:
            log.warning("OpenWeatherMap failed (%s), falling back to Claude Haiku", e)
    return await _claude_forecast(destination, travel_date, days)


async def _fetch_openweather(
    destination: str,
    travel_date: str,
    days: int,
    api_key: str,
) -> dict:
    url = (
        f"https://api.openweathermap.org/data/2.5/forecast"
        f"?q={destination}&appid={api_key}&units=metric&cnt=56"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            return {"error": f"OpenWeatherMap returned {resp.status_code}", "destination": destination}
        data = resp.json()

    city_name = data.get("city", {}).get("name", destination)
    country   = data.get("city", {}).get("country", "")
    sunrise_ts = data.get("city", {}).get("sunrise", 0)
    sunset_ts  = data.get("city", {}).get("sunset", 0)
    sunrise_str = datetime.utcfromtimestamp(sunrise_ts).strftime("%H:%M") if sunrise_ts else "06:00"
    sunset_str  = datetime.utcfromtimestamp(sunset_ts).strftime("%H:%M") if sunset_ts else "18:00"

    # Group 3-hourly forecasts by date
    daily: dict[str, list] = {}
    for item in data.get("list", []):
        dt_str = item["dt_txt"].split(" ")[0]  # YYYY-MM-DD
        daily.setdefault(dt_str, []).append(item)

    # If travel_date given, start from that date; otherwise use today
    try:
        start = date.fromisoformat(travel_date) if travel_date else date.today()
    except ValueError:
        start = date.today()

    result_days = []
    for i in range(min(days, 8)):
        d_date = start + timedelta(days=i)
        d_str  = d_date.isoformat()
        slots  = daily.get(d_str, [])

        if slots:
            temps      = [s["main"]["temp"] for s in slots]
            humids     = [s["main"]["humidity"] for s in slots]
            winds      = [s["wind"]["speed"] * 3.6 for s in slots]  # m/s → kph
            precips    = [s.get("rain", {}).get("3h", 0) + s.get("snow", {}).get("3h", 0) for s in slots]
            temp_high  = round(max(temps), 1)
            temp_low   = round(min(temps), 1)
            humidity   = int(sum(humids) / len(humids))
            wind_kph   = round(sum(winds) / len(winds), 1)
            precip_mm  = sum(precips)
            precip_chance = min(int(precip_mm * 20), 100)  # rough estimate

            # Pick the most common weather icon code prefix
            icons = [s.get("weather", [{}])[0].get("icon", "01d")[:2] for s in slots]
            modal_icon = max(set(icons), key=icons.count)
            cond, emoji = _OWM_ICON_COND.get(modal_icon, ("Partly Cloudy", "⛅"))
        else:
            # No data for this date — generate plausible estimate
            temp_high = 28.0
            temp_low  = 20.0
            humidity  = 60
            wind_kph  = 15.0
            precip_chance = 20
            cond, emoji = "Partly Cloudy", "⛅"

        # UV index: crude estimate by month & condition
        uv_index = _estimate_uv(d_date.month, cond)

        # Travel note
        travel_note = _travel_note(cond, precip_chance, uv_index, wind_kph)

        result_days.append({
            "date":         d_str,
            "day_name":     d_date.strftime("%A"),
            "condition":    cond,
            "emoji":        emoji,
            "temp_high":    temp_high,
            "temp_low":     temp_low,
            "humidity":     humidity,
            "wind_kph":     wind_kph,
            "precip_chance": precip_chance,
            "uv_index":     uv_index,
            "sunrise":      sunrise_str,
            "sunset":       sunset_str,
            "travel_note":  travel_note,
        })

    best_days  = [d["day_name"] for d in result_days if d["precip_chance"] < 20 and d["temp_high"] < 38]
    worst_days = [d["day_name"] for d in result_days if d["precip_chance"] >= 60 or d["temp_high"] >= 40]

    temp_avg = sum(d["temp_high"] for d in result_days) / max(len(result_days), 1)
    overall_summary = _overall_summary(result_days, temp_avg)
    packing_tip = _packing_tip(result_days)

    return {
        "destination":        f"{city_name}, {country}" if country else city_name,
        "start_date":         result_days[0]["date"] if result_days else start.isoformat(),
        "source":             "openweathermap",
        "days":               result_days,
        "overall_summary":    overall_summary,
        "packing_weather_tip": packing_tip,
        "best_days":          best_days[:3],
        "worst_days":         worst_days[:2],
    }


async def _claude_forecast(destination: str, travel_date: str, days: int) -> dict:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    start_str = travel_date if travel_date else date.today().isoformat()

    prompt = f"""Generate a realistic {days}-day weather forecast for {destination} starting from {start_str or 'this week'}.

Return ONLY valid JSON (no markdown):
{{
  "destination": "...",
  "start_date": "YYYY-MM-DD",
  "source": "estimate",
  "days": [
    {{
      "date": "YYYY-MM-DD",
      "day_name": "Monday",
      "condition": "Sunny | Partly Cloudy | Cloudy | Light Rain | Heavy Rain | Thunderstorm | Foggy | Windy | Snowy",
      "emoji": "☀️",
      "temp_high": 32,
      "temp_low": 24,
      "humidity": 65,
      "wind_kph": 15,
      "precip_chance": 10,
      "uv_index": 8,
      "sunrise": "06:15",
      "sunset": "18:45",
      "travel_note": "Great day for outdoor sightseeing"
    }}
  ],
  "overall_summary": "Warm and sunny with one rainy day mid-week",
  "packing_weather_tip": "Pack light cottons; bring a compact rain jacket for Thursday",
  "best_days": ["Monday", "Tuesday"],
  "worst_days": ["Thursday"]
}}

Rules:
- Generate realistic seasonal weather for {destination} at this time of year (September 2026)
- travel_note: practical advice for each day (best for outdoor/indoor activities, carry umbrella, apply sunscreen, etc.)
- Dates must start from {start_str} and increment daily
- best_days: days with low rain chance and comfortable temperatures
- worst_days: days with high rain chance or extreme heat/cold"""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        log.error("Claude Haiku weather forecast error: %s", e)
        return {
            "destination": destination,
            "start_date":  start_str,
            "source":      "estimate",
            "error":       str(e),
            "days":        [],
            "overall_summary": "Unable to generate forecast",
            "packing_weather_tip": "Check local weather before travel",
            "best_days":   [],
            "worst_days":  [],
        }


def _estimate_uv(month: int, condition: str) -> int:
    """Rough UV index by month and sky condition."""
    base = [3, 4, 5, 6, 7, 8, 9, 8, 7, 5, 4, 3][month - 1]
    cond_lower = condition.lower()
    if "cloud" in cond_lower or "overcast" in cond_lower:
        return max(1, base - 3)
    if "rain" in cond_lower or "storm" in cond_lower or "fog" in cond_lower:
        return max(1, base - 4)
    return base


def _travel_note(condition: str, precip_chance: int, uv_index: int, wind_kph: float) -> str:
    cond_lower = condition.lower()
    if "thunderstorm" in cond_lower or "heavy rain" in cond_lower:
        return "Stay indoors; visit museums, cafes, or shopping malls"
    if "light rain" in cond_lower or precip_chance >= 60:
        return "Carry a compact umbrella; good for indoor attractions"
    if "rain" in cond_lower and precip_chance >= 40:
        return "Bring a rain jacket; mornings may be clearer"
    if uv_index >= 8:
        return "Apply SPF 50+ sunscreen; wear a hat and stay hydrated"
    if "fog" in cond_lower:
        return "Foggy morning; plan outdoor sightseeing for afternoon"
    if wind_kph >= 40:
        return "Strong winds — avoid exposed hilltops; great for indoor activities"
    if "sunny" in cond_lower or "clear" in cond_lower:
        return "Perfect day for outdoor sightseeing and photography"
    return "Good day to explore the city"


def _overall_summary(days: list, temp_avg: float) -> str:
    rainy = sum(1 for d in days if d["precip_chance"] >= 40)
    sunny = sum(1 for d in days if d["precip_chance"] < 20 and "sun" in d["condition"].lower())
    if rainy >= 4:
        return f"Mostly wet week with average highs around {temp_avg:.0f}°C — pack for rain"
    if rainy >= 2:
        return f"Mix of sun and showers; average {temp_avg:.0f}°C — a jacket handy"
    if sunny >= 5:
        return f"Largely sunny and warm at {temp_avg:.0f}°C — great week for outdoor plans"
    return f"Partly cloudy week with average highs around {temp_avg:.0f}°C"


def _packing_tip(days: list) -> str:
    max_temp = max((d["temp_high"] for d in days), default=28)
    min_temp = min((d["temp_low"] for d in days), default=18)
    rainy    = any(d["precip_chance"] >= 40 for d in days)
    hot      = max_temp >= 35
    cold     = min_temp <= 10
    rainy_days = [d["day_name"] for d in days if d["precip_chance"] >= 40]

    parts = []
    if hot:
        parts.append("light breathable fabrics and SPF 50+ sunscreen")
    elif cold:
        parts.append("warm layers and a windproof jacket")
    else:
        parts.append("light cottons and a light jacket for evenings")

    if rainy and rainy_days:
        parts.append(f"compact rain jacket for {', '.join(rainy_days[:2])}")

    return "Pack " + "; bring a ".join(parts) if len(parts) > 1 else "Pack " + parts[0]
