import anthropic
import json
import os
import logging
from datetime import date

log = logging.getLogger(__name__)


async def get_trip_recap(
    destination: str,
    travel_date: str,        # YYYY-MM-DD departure
    return_date: str = "",   # YYYY-MM-DD return
    hotel: str = "",
    total_budget: str = "",  # e.g. "₹82,000" or "USD 1200"
    places_visited: list[str] | None = None,
    highlights: list[str] | None = None,
    trip_style: str = "",    # e.g. "family", "solo", "couple"
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # Compute duration
    duration = 0
    if travel_date and return_date:
        try:
            duration = (date.fromisoformat(return_date) - date.fromisoformat(travel_date)).days
        except Exception:
            duration = 0

    places_str = ", ".join(places_visited) if places_visited else ""
    highlights_str = ", ".join(highlights) if highlights else ""

    prompt = f"""Generate a warm, personal post-trip recap for a trip to {destination}.
Trip: {travel_date} to {return_date or travel_date} ({duration} days).
Hotel: {hotel or 'not specified'}.
Budget: {total_budget or 'not specified'}.
Places/activities: {places_str or 'typical tourist spots'}.
Highlights: {highlights_str or 'none specified'}.
Trip style: {trip_style or 'leisure'}.

Return ONLY valid JSON (no markdown) matching this EXACT schema:
{{
  "destination": "{destination}",
  "dates": "Oct 1 – Oct 8, 2024",
  "duration_days": {duration},
  "headline": "7 magical days in the Land of the Rising Sun",
  "narrative": "2-3 sentence warm narrative summary of the trip experience",
  "stats": {{
    "days": {duration},
    "cities_visited": ["Tokyo", "Kyoto"],
    "places_count": 12,
    "total_spent": "₹82,000",
    "avg_daily_spend": "₹11,714",
    "hotel_nights": {duration}
  }},
  "highlights": ["top highlight 1", "top highlight 2", "top highlight 3"],
  "hidden_gems": ["something they might have missed or should try next time"],
  "next_time": ["1-2 things to do differently or add on a return visit"],
  "travel_style_label": "Cultural Explorer",
  "mood_emoji": "🌸",
  "rating": 4.5
}}

Rules:
- narrative: warm, second-person ("You spent your mornings..."), upbeat
- highlights: 3-5 specific activities or moments (infer from places_visited if provided)
- travel_style_label: one of: Family Adventure, Solo Explorer, Romantic Getaway, Cultural Explorer, Budget Backpacker, Luxury Traveller, Business Tripper, Group Tour
- mood_emoji: single emoji matching the trip vibe
- rating: a float 4.0–5.0 (always positive for a recap — this is celebratory)
- If budget is not provided, omit total_spent and avg_daily_spend from stats (set to null)"""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        log.error("Trip recap error: %s", e)
        return {
            "destination": destination,
            "headline": "Your trip to " + destination,
            "error": str(e),
        }
