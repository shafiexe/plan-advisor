import aiohttp
from urllib.parse import quote


async def get_weather(location: str) -> dict:
    """Fetch current weather + 3-day forecast from wttr.in (free, no API key)."""
    url = f"https://wttr.in/{quote(location)}?format=j1"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return {"error": f"Weather service returned {resp.status}", "location": location, "temp_c": 0, "forecast": []}
                data = await resp.json(content_type=None)

        current = data.get("current_condition", [{}])[0]
        nearest = data.get("nearest_area", [{}])[0]
        area_name = nearest.get("areaName", [{}])[0].get("value", location)
        country = nearest.get("country", [{}])[0].get("value", "")

        forecast = []
        for day in data.get("weather", [])[:3]:
            hourly = day.get("hourly", [{}])
            midday = hourly[4] if len(hourly) > 4 else (hourly[0] if hourly else {})
            forecast.append({
                "date": day.get("date", ""),
                "max_temp_c": int(day.get("maxtempC", 0)),
                "min_temp_c": int(day.get("mintempC", 0)),
                "description": midday.get("weatherDesc", [{}])[0].get("value", ""),
                "rain_mm": float(midday.get("precipMM", 0)),
                "humidity": int(midday.get("humidity", 0)),
                "wind_kmph": int(midday.get("windspeedKmph", 0)),
            })

        return {
            "location": f"{area_name}, {country}" if country else area_name,
            "temp_c": int(current.get("temp_C", 0)),
            "feels_like_c": int(current.get("FeelsLikeC", 0)),
            "description": current.get("weatherDesc", [{}])[0].get("value", ""),
            "humidity": int(current.get("humidity", 0)),
            "wind_kmph": int(current.get("windspeedKmph", 0)),
            "visibility_km": int(current.get("visibility", 0)),
            "uv_index": int(current.get("uvIndex", 0)),
            "forecast": forecast,
        }
    except Exception as e:
        return {"error": str(e), "location": location, "temp_c": 0, "forecast": []}
