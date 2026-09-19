import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def get_packing_list(
    destination: str,
    duration_days: int = 7,
    trip_type: str = "leisure",     # leisure | business | adventure | beach
    weather: str = "warm",          # warm | cold | rainy | mixed
    activities: list[str] | None = None,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    activities_str = ", ".join(activities) if activities else "general sightseeing"

    prompt = f"""Create a packing list for a {duration_days}-day {trip_type} trip to {destination}.
Weather: {weather}. Activities: {activities_str}.

Return ONLY valid JSON (no markdown) matching this EXACT schema:
{{
  "destination": "{destination}",
  "duration_days": {duration_days},
  "trip_type": "{trip_type}",
  "categories": [
    {{
      "name": "Category Name",
      "emoji": "single emoji",
      "items": [
        {{"item": "item name", "essential": true, "note": "optional short tip or null"}}
      ]
    }}
  ],
  "tips": ["tip1", "tip2", "tip3"]
}}

Categories to include (in order):
1. 📄 Documents & Money (passport, visa, insurance, cards, cash)
2. 👔 Clothing (tailored to weather + duration, avoid duplicates)
3. 🧴 Toiletries & Health (essentials only, airline liquid rules)
4. 💻 Electronics & Gadgets (adapters, chargers, etc.)
5. 🎒 Bags & Travel Gear (day bag, locks, etc.)
6. 💊 Medications (tailored to destination health risks)
7. 🎯 Activity-Specific (based on activities provided)

Rules:
- essential: true means must-have, false means nice-to-have
- Keep notes under 8 words or null
- 5-12 items per category
- Generate 3 practical packing tips"""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:])
            if text.endswith("```"):
                text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        log.error("Packing list error: %s", e)
        return {"destination": destination, "categories": [], "error": str(e)}
