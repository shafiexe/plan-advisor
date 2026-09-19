import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def compare_hotels(hotels: list[dict], currency: str = "INR") -> dict:
    """
    hotels: list of dicts with keys: name, rating, price, amenities, description, hotel_class
    """
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    hotel_summaries = []
    for i, h in enumerate(hotels[:5]):  # cap at 5
        amenities = ", ".join((h.get("amenities") or [])[:6]) or "not listed"
        hotel_summaries.append(
            f"{i+1}. {h.get('name', 'Unknown')} — "
            f"Rating: {h.get('rating', 'N/A')}/5, "
            f"Price: {h.get('price', 'N/A')} {currency}/night, "
            f"Class: {h.get('hotel_class', 'N/A')}, "
            f"Amenities: {amenities}. "
            f"Description: {h.get('description', '')[:200]}"
        )

    prompt = f"""Compare these hotels and recommend the best one:

{chr(10).join(hotel_summaries)}

Return ONLY valid JSON (no markdown) matching this EXACT schema:
{{
  "hotels": [
    {{
      "name": "exact hotel name from input",
      "pros": ["up to 3 short pros"],
      "cons": ["up to 2 short cons"],
      "value_score": 8,
      "best_for": "e.g. families, couples, business travellers, backpackers",
      "summary": "one sentence"
    }}
  ],
  "winner": "exact name of the best overall hotel",
  "winner_reason": "one sentence explaining why",
  "budget_pick": "exact name of the best value hotel (can be same as winner)",
  "luxury_pick": "exact name of the highest quality hotel (can be same as winner)"
}}

Rules:
- value_score: 1-10 (consider price vs quality, not just rating alone)
- pros/cons: be specific, not generic ("rooftop pool" not "good amenities")
- winner should balance quality AND value, not just pick the most expensive
- budget_pick: best price for acceptable quality
- luxury_pick: highest quality regardless of price"""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:])
            if text.endswith("```"):
                text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        log.error("Hotel comparison error: %s", e)
        return {"hotels": [], "winner": "", "error": str(e)}
