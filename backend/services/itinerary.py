import anthropic, json, os, logging
log = logging.getLogger(__name__)


async def get_itinerary(
    destination: str,
    start_date: str,       # YYYY-MM-DD
    end_date: str,         # YYYY-MM-DD
    interests: list[str] | None = None,
    hotel_area: str = "",
) -> dict:
    from datetime import date
    try:
        d1 = date.fromisoformat(start_date)
        d2 = date.fromisoformat(end_date)
        num_days = (d2 - d1).days + 1
        num_days = min(max(num_days, 1), 10)  # cap 1–10
    except Exception:
        num_days = 5

    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    interests_str = ", ".join(interests) if interests else "sightseeing, food, culture"

    prompt = f"""Create a {num_days}-day travel itinerary for {destination} starting {start_date}.
Hotel area: {hotel_area or "central"}.  Interests: {interests_str}.

Return ONLY valid JSON (no markdown) matching this EXACT schema:
{{
  "destination": "{destination}",
  "start_date": "{start_date}",
  "end_date": "{end_date}",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "short catchy theme e.g. 'Old City & Culture'",
      "slots": [
        {{
          "time": "09:00",
          "period": "Morning",
          "activity": "activity name",
          "description": "1-sentence what to do/see",
          "duration": "e.g. 2 hours",
          "location": "area or landmark name",
          "tip": "one practical insider tip",
          "type": "sightseeing|food|transport|leisure|shopping|adventure"
        }}
      ]
    }}
  ]
}}
Rules:
- Each day must have 5-7 slots covering Morning (2-3), Afternoon (2), Evening (1-2)
- Include realistic travel times between locations
- Day 1 first slot should be "Arrive & check in" if it's a travel day
- Include at least one meal slot per period (breakfast/lunch/dinner)
- types: use exactly one of: sightseeing, food, transport, leisure, shopping, adventure
- Keep descriptions concise (under 15 words each)
- Generate exactly {num_days} days"""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:])
            if text.endswith("```"):
                text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        log.error("Itinerary generation error: %s", e)
        return {"destination": destination, "start_date": start_date, "end_date": end_date, "days": [], "error": str(e)}
