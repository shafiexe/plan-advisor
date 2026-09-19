import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def get_destination_guide(
    destination: str,
    duration_days: int = 5,
    interests: list[str] | None = None,
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    interests_str = ", ".join(interests) if interests else "general sightseeing"
    prompt = f"""Generate a concise travel guide for {destination} ({duration_days} days, interests: {interests_str}).
Return ONLY valid JSON with no markdown, matching EXACTLY this schema:
{{
  "destination": "{destination}",
  "tagline": "one evocative line describing the destination",
  "best_time": "best months/season to visit and why (1-2 sentences)",
  "top_attractions": [
    {{"name": "...", "description": "...", "duration": "e.g. 2-3 hours", "tip": "insider tip"}}
  ],
  "neighbourhoods": [
    {{"name": "...", "vibe": "...", "best_for": "..."}}
  ],
  "food": [
    {{"name": "dish or restaurant type", "description": "...", "must_try": true}}
  ],
  "practical": {{
    "local_transport": "...",
    "tipping": "...",
    "safety": "Very Safe | Safe | Moderate | Exercise Caution",
    "language_tip": "...",
    "currency_tip": "..."
  }},
  "tips": ["tip1", "tip2", "tip3", "tip4"],
  "avoid": ["what to avoid 1", "..."],
  "pack": ["item1", "item2", "item3", "item4", "item5"]
}}
Limit: top_attractions max 5, neighbourhoods max 4, food max 5, tips max 5, avoid max 4, pack max 6."""

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
        log.error("Destination guide error: %s", e)
        return {
            "destination": destination,
            "error": str(e),
            "top_attractions": [],
            "tips": [],
            "food": [],
            "neighbourhoods": [],
            "avoid": [],
            "pack": [],
        }
