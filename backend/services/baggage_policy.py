import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def get_baggage_policy(
    airline: str,
    travel_class: str = "economy",
    route_type: str = "international",  # domestic | international
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""You are a travel expert. Provide accurate baggage policy for {airline} ({travel_class} class, {route_type} travel).

Return ONLY valid JSON (no markdown fences):
{{
  "airline": "{airline}",
  "travel_class": "{travel_class}",
  "route_type": "{route_type}",
  "cabin_baggage": {{
    "allowance": "7 kg",
    "dimensions": "55 × 35 × 25 cm",
    "pieces": 1,
    "note": "Must fit in overhead bin"
  }},
  "checked_baggage": {{
    "allowance": "15 kg",
    "pieces": 1,
    "extra_piece_fee": "₹1,500/kg",
    "note": "Pre-book extra baggage online for 30% discount"
  }},
  "prohibited_items": ["lithium batteries >100Wh", "aerosols >100ml", "sharp objects"],
  "liquid_rule": "100ml per container, in 1L clear zip-lock bag — remove at security",
  "oversize_fee": "₹500–2,000 depending on route",
  "tips": [
    "Weigh bags at home — airport scales can differ by 0.5kg",
    "Pre-purchase extra baggage online — 30-50% cheaper than at airport"
  ],
  "special_items": {{
    "laptop": "Allowed in cabin — remove at security",
    "medicines": "Prescription medicines allowed with doctor letter",
    "sports_equipment": "Contact airline 48h in advance"
  }}
}}
Rules:
- Be accurate for this specific airline in 2025/2026
- If route_type is domestic India, mention DGCA rules
- prohibited_items: common items people forget are restricted
- tips: practical money-saving or hassle-saving advice"""

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
        log.error("Baggage policy error: %s", e)
        return {"airline": airline, "travel_class": travel_class, "route_type": route_type, "error": str(e)}
