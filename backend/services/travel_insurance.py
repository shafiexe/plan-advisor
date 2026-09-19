import anthropic, json, os, logging
log = logging.getLogger(__name__)


async def get_travel_insurance(
    destination: str,
    duration_days: int = 7,
    trip_cost: float = 0,
    activities: list[str] | None = None,
    currency: str = "INR",
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    activities_str = ", ".join(activities) if activities else "general tourism"

    prompt = f"""Create a travel insurance guide for a {duration_days}-day trip to {destination}.
Trip cost: {currency} {trip_cost or "unknown"}. Activities: {activities_str}.

Return ONLY valid JSON (no markdown):
{{
  "destination": "{destination}",
  "duration_days": {duration_days},
  "recommendation": "short verdict e.g. 'Strongly recommended — UAE requires travel insurance for visa'",
  "coverage_types": [
    {{
      "type": "Medical Emergency",
      "emoji": "🏥",
      "why": "one sentence why this matters for this destination",
      "recommended_minimum": "₹50 lakh / $50,000",
      "essential": true
    }}
  ],
  "cost_estimate": {{
    "range": "₹800–₹2,500",
    "per": "per person for this trip",
    "note": "prices vary by age and provider"
  }},
  "providers": [
    {{"name": "HDFC Ergo", "note": "good for India residents travelling abroad"}},
    {{"name": "Tata AIG", "note": "covers pre-existing conditions"}},
    {{"name": "Bajaj Allianz", "note": "popular for backpackers"}},
    {{"name": "World Nomads", "note": "best for adventure activities"}}
  ],
  "tips": ["tip1", "tip2", "tip3"],
  "visa_requirement": true
}}

Coverage types to consider (include all relevant ones):
- Medical Emergency & Hospitalisation (essential: true)
- Trip Cancellation / Curtailment (essential: trip_cost > 0)
- Baggage Loss & Delay (essential: false)
- Flight Delay / Missed Connection (essential: false)
- Adventure Sports Coverage (essential: only if activities include adventure)
- COVID-19 Coverage (essential: false)
- Personal Liability (essential: false for most trips)

Set visa_requirement: true if the destination country requires travel insurance for a visa (e.g. Schengen, UAE, etc.)"""

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
        log.error("Insurance error: %s", e)
        return {"destination": destination, "coverage_types": [], "error": str(e)}
