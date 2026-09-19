import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def get_phrasebook(
    destination: str,
    language: str = "",   # auto-detected if empty
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""Generate a travel phrasebook for {destination}{" (language: " + language + ")" if language else ""}.

Return ONLY valid JSON (no markdown) matching this EXACT schema:
{{
  "destination": "{destination}",
  "language": "detected/specified language name e.g. Arabic",
  "script": "Latin" or "Arabic" or "Thai" or "Japanese" or "Devanagari" etc.,
  "categories": [
    {{
      "name": "Greetings",
      "emoji": "👋",
      "phrases": [
        {{
          "english": "Hello",
          "local": "Marhaba (مرحبا)",
          "pronunciation": "mar-HA-ba",
          "category": "greetings"
        }}
      ]
    }}
  ],
  "tip": "one practical language tip e.g. 'Arabic is read right-to-left; locals appreciate any attempt'"
}}

Categories (in order):
1. 👋 Greetings (hello, goodbye, please, thank you, excuse me, sorry)
2. 🗺️ Directions (left, right, straight, near, far, where is...?)
3. 🍽️ Food & Restaurant (menu, bill, vegetarian, allergies, delicious, water)
4. 🛒 Shopping (how much, too expensive, I'll take it, no thank you)
5. 🆘 Emergency (help, doctor, police, hospital, I'm lost, call an ambulance)

Rules:
- Include local script in parentheses after romanization when script is non-Latin
- Pronunciation should use simple English phonetics (syllable-CAPS for stress)
- 4-5 phrases per category (20-25 total)
- Use the primary official language of the destination"""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:])
            if text.endswith("```"):
                text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        log.error("Phrasebook error: %s", e)
        return {"destination": destination, "categories": [], "error": str(e)}
