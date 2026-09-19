import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def get_local_events(
    destination: str,
    travel_date: str,     # YYYY-MM-DD
    return_date: str = "",
    interests: list[str] | None = None,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    interests_str = ", ".join(interests) if interests else "general"
    date_range = f"{travel_date} to {return_date}" if return_date else travel_date

    prompt = f"""List notable events, festivals, and things happening in {destination} around {date_range}.
Interests: {interests_str}.

Return ONLY valid JSON (no markdown) matching this EXACT schema:
{{
  "destination": "{destination}",
  "travel_dates": "{date_range}",
  "events": [
    {{
      "name": "event name",
      "type": "festival|concert|sports|holiday|exhibition|market|cultural|food",
      "emoji": "single emoji",
      "date_range": "exact dates or 'Late October' etc.",
      "description": "2-sentence description",
      "highlights": ["highlight 1", "highlight 2"],
      "tips": "one practical tip e.g. 'Book tickets in advance'",
      "free": true or false
    }}
  ],
  "season_note": "one sentence about what's special about visiting at this time of year",
  "holidays": ["any public holidays during dates e.g. 'Diwali - Oct 20'"],
  "busy_periods": "e.g. 'School holidays — expect crowds at attractions' or null"
}}

Rules:
- Include 4-8 events (real, recurring events Claude knows about for this month/season)
- If no specific events are known, include seasonal highlights, cultural experiences, and local markets
- types: use exactly one of: festival, concert, sports, holiday, exhibition, market, cultural, food
- free: true only if genuinely free to attend
- holidays: list public holidays that fall within the travel dates"""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:])
            if text.endswith("```"):
                text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        log.error("Local events error: %s", e)
        return {"destination": destination, "events": [], "error": str(e)}
