import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def get_airport_transit(
    airport_iata: str,          # e.g. "DXB"
    airport_name: str = "",     # e.g. "Dubai International Airport"
    hotel_area: str = "",       # e.g. "Downtown Dubai" or hotel name
    currency: str = "INR",      # for cost estimates
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    dest = hotel_area or "city centre"
    curr_label = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£", "AED": "AED"}.get(currency, currency)

    prompt = f"""Describe how to get from {airport_name or airport_iata} airport to {dest}.

Return ONLY valid JSON (no markdown) matching this EXACT schema:
{{
  "airport_iata": "{airport_iata}",
  "airport_name": "full airport name",
  "destination": "{dest}",
  "options": [
    {{
      "mode": "Metro",
      "emoji": "🚇",
      "duration": "35 min",
      "cost": "AED 10 (~₹230)",
      "frequency": "every 10 min",
      "steps": ["Take Red Line from Terminal 3", "Exit at Union station", "Transfer to Green Line", "Exit at City Centre"],
      "tip": "Buy a Nol card at the airport (AED 25 deposit)",
      "recommended": true
    }}
  ],
  "tip": "overall tip for this airport e.g. allow extra time during peak hours"
}}

Include ALL realistic options (metro, bus, taxi, Uber/Grab/Ola, shuttle, ferry if applicable).
Mark recommended: true for the best value option.
Provide costs in local currency with {curr_label} equivalent if different.
Keep steps concise (max 4 steps each).
Return 2-5 options depending on what's available."""

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
        log.error("Airport transit error: %s", e)
        return {"airport_iata": airport_iata, "options": [], "error": str(e)}
