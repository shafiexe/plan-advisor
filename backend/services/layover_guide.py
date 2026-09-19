import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def get_layover_guide(
    airport: str,
    layover_duration_hours: float,
    nationality: str = "India",
    has_priority_pass: bool = False,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    prompt = f"""You are a travel expert. Generate a practical layover guide for someone with {layover_duration_hours} hours at {airport}.
Nationality: {nationality}. Has Priority Pass lounge access: {has_priority_pass}.

Return ONLY valid JSON (no markdown) matching this EXACT schema:
{{
  "airport": "{airport}",
  "city": "city name",
  "layover_hours": {layover_duration_hours},
  "verdict": "Worth leaving the airport" | "Stay airside" | "Short city hop possible",
  "verdict_reason": "one sentence explaining the verdict",
  "visa_note": "e.g. 'Indians get visa-on-arrival for Dubai' or 'Airside transit only — no visa needed to stay in terminal'",
  "airside_options": [
    {{
      "name": "option name",
      "emoji": "emoji",
      "duration": "e.g. 30 min",
      "description": "short description",
      "tip": "practical tip"
    }}
  ],
  "city_options": [
    {{
      "name": "attraction or area",
      "emoji": "emoji",
      "distance": "e.g. 15 min by metro",
      "duration": "time needed",
      "description": "short description",
      "recommended": true or false
    }}
  ],
  "lounges": [
    {{
      "name": "lounge name",
      "terminal": "T3",
      "access": "Priority Pass | Pay per visit | Airline lounge",
      "highlight": "one key feature"
    }}
  ],
  "time_plan": [
    {{"time": "0:00", "activity": "Clear immigration"}},
    {{"time": "0:30", "activity": "Take metro to city center"}}
  ],
  "warning": "e.g. 'Leave city by 2h before departure — factor in metro + security' or null",
  "tips": ["practical tip 1", "practical tip 2"]
}}

Rules:
- verdict: choose based on layover_hours:
  - < 3h → "Stay airside"
  - 3-5h → "Short city hop possible"
  - > 5h → "Worth leaving the airport"
- city_options: only include if layover is long enough to realistically visit
- airside_options: always include (shopping, dining, lounge, prayer room, etc.)
- lounges: include 2-3 real lounges at this airport
- time_plan: practical minute-by-minute schedule for the layover
- tips: 2-4 practical tips (e.g. "Keep your boarding pass handy for re-entry", "Airport WiFi is free at DXB")
- visa_note: important — tell whether {nationality} passport holders need a transit visa"""

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
        log.error("Layover guide error: %s", e)
        return {
            "airport": airport,
            "city": "",
            "layover_hours": layover_duration_hours,
            "verdict": "Stay airside",
            "verdict_reason": "Could not generate guide",
            "visa_note": "",
            "airside_options": [],
            "city_options": [],
            "lounges": [],
            "time_plan": [],
            "warning": None,
            "tips": [],
            "error": str(e),
        }
