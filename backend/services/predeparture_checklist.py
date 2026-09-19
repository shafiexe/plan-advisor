import anthropic
import json
import os
import logging
from datetime import date, timedelta

log = logging.getLogger(__name__)


async def get_predeparture_checklist(
    destination: str,
    travel_date: str,       # YYYY-MM-DD
    nationality: str = "India",
    trip_type: str = "leisure",
    visa_required: bool = False,
    has_insurance: bool = False,
    group_size: int = 1,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    today = date.today()
    try:
        travel_d = date.fromisoformat(travel_date)
        days_until = (travel_d - today).days
    except Exception:
        travel_d = today + timedelta(days=30)
        days_until = 30

    prompt = f"""You are a travel planner. Generate a pre-departure checklist for a trip to {destination} on {travel_date} ({days_until} days from today).
Nationality: {nationality}. Trip type: {trip_type}. Group size: {group_size}.
Visa required: {visa_required}. Has insurance: {has_insurance}.

Return ONLY valid JSON (no markdown fences):
{{
  "destination": "{destination}",
  "travel_date": "{travel_date}",
  "days_until_travel": {days_until},
  "tasks": [
    {{
      "id": "visa_apply",
      "task": "Apply for Japan visa",
      "category": "documents",
      "priority": "critical",
      "deadline_days_before": 45,
      "deadline_date": "YYYY-MM-DD",
      "done": false,
      "note": "Takes 5-7 business days. Book VFS appointment online.",
      "emoji": "🛂"
    }}
  ],
  "summary": "one-line summary e.g. '12 tasks — 3 critical, 2 due this week'"
}}

TASK RULES:
- deadline_date = travel_date minus deadline_days_before (compute exact date)
- category must be one of: documents | booking | health | finance | packing | communication | group
- Include 8-15 tasks covering:
  DOCUMENTS: passport validity check (critical, 60d before), visa if required (critical, 45d), print tickets (3d)
  BOOKING: hotel confirmation (critical if not done, 30d), travel insurance if not done (14d), airport transfer (7d)
  HEALTH: vaccinations if needed for {destination} (30d), travel medicines (7d), first aid kit (3d)
  FINANCE: notify bank of travel (3d), exchange currency (7d), check credit card foreign fees (14d)
  PACKING: check baggage limits (7d), weigh luggage (1d), pack essentials (1d)
  COMMUNICATION: local SIM or international plan (7d), download offline maps (1d), share itinerary with family (1d)
  GROUP (only if group_size > 4): collect all passports/IDs list (14d), distribute emergency contacts (3d), group WhatsApp created (7d)
- priority: critical = must do or trip fails; high = strongly recommended; medium = good to have; low = optional
- Skip visa task if visa_required is false
- Skip insurance task if has_insurance is true
- deadline_date must be a real calculated date"""

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
        log.error("Pre-departure checklist error: %s", e)
        return {"destination": destination, "travel_date": travel_date, "days_until_travel": days_until, "tasks": [], "error": str(e)}
