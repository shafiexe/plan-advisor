import anthropic
import json
import os
import logging

log = logging.getLogger(__name__)


async def plan_group_trip(
    origin: str,
    destination: str,
    travel_date: str,
    return_date: str = "",
    group_type: str = "family",
    group_size: int = 1,
    adults: int = 1,
    children: int = 0,
    elderly: int = 0,
    departure_time: str = "06:00",
    return_time: str = "22:00",
    transport_mode: str = "bus",
    religion: str = "",
    food_plan: str = "carry",
    budget_per_person: str = "",
    pre_booked_activities: list[str] | None = None,
    special_needs: list[str] | None = None,
    nationality: str = "India",
    currency: str = "INR",
) -> dict:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    group_desc = f"{group_size} people" + (
        f" ({adults} adults"
        + (f", {children} kids" if children else "")
        + (f", {elderly} elderly" if elderly else "")
        + ")"
        if (children or elderly)
        else ""
    )
    is_day_trip = not return_date or return_date == travel_date
    duration = "1-day trip" if is_day_trip else f"multi-day trip"
    activities_str = (
        "\n".join(f"  - {a}" for a in (pre_booked_activities or []))
        if pre_booked_activities
        else "  None pre-booked"
    )
    needs_str = ", ".join(special_needs) if special_needs else "none mentioned"

    prompt = f"""You are an expert travel planner. Plan a {duration} for {group_desc} from {origin} to {destination} on {travel_date}.

Group type: {group_type}
Transport: {transport_mode}
Departure: {departure_time} from {origin}
{'Return by: ' + return_time if is_day_trip else 'Return date: ' + return_date}
Religion: {religion or 'not specified'}
Food plan: {food_plan} (carry own food / catering / restaurant stops / mix)
Budget per person: {budget_per_person or 'not specified'}
Pre-booked activities:
{activities_str}
Special needs: {needs_str}
Currency: {currency}, Nationality: {nationality}

Return ONLY valid JSON (no markdown fences) matching this EXACT schema:
{{
  "origin": "{origin}",
  "destination": "{destination}",
  "travel_date": "{travel_date}",
  "group_type": "{group_type}",
  "group_size": {group_size},
  "duration": "{duration}",

  "timeline": [
    {{
      "time": "06:00",
      "activity": "Depart from {origin}",
      "type": "travel|prayer|food|toilet|sightseeing|activity|rest|hotel",
      "duration_min": 30,
      "location": "specific place name or 'En route'",
      "notes": "practical note e.g. 'take roll call before departing'",
      "cost_per_person": 0,
      "alert": "optional important warning e.g. 'Plastic bags banned in Ooty — use cloth bags'"
    }}
  ],

  "prayer_schedule": [
    {{
      "prayer": "Fajr|Dhuhr|Asr|Maghrib|Isha",
      "time": "05:15",
      "location": "nearest mosque name or 'Clean roadside spot / petrol pump'",
      "duration_min": 15,
      "notes": "e.g. 'Perform before boarding bus at 06:00'"
    }}
  ],

  "places": [
    {{
      "name": "Botanical Garden, Ooty",
      "entry_fee_adult": 30,
      "entry_fee_child": 15,
      "duration_recommended": "1.5 hours",
      "best_time": "Morning",
      "notes": "e.g. 'Carry water, limited shade'",
      "plastic_restricted": false
    }}
  ],

  "toilet_stops": [
    {{
      "location": "HP Petrol Pump, Walayar",
      "approx_time": "08:30",
      "type": "petrol_pump|public_toilet|hotel|restaurant",
      "notes": "Clean, 24-hour"
    }}
  ],

  "food_plan": {{
    "plan_type": "{food_plan}",
    "meals": [
      {{
        "meal": "Breakfast|Lunch|Dinner|Snacks",
        "time": "08:00",
        "option": "Carry from home / Catering team serves at X / Restaurant stop at Y",
        "location": "specific place",
        "notes": "e.g. 'Serve before Dhuhr prayer stop'"
      }}
    ],
    "catering_checklist": ["Pots x 3", "Ladles x 3", "Plates x 55 (50+5 spare)", "Water cans x 5 (20L each)", "Hand wash liquid x 2", "Garbage bags x 10", "Serving table / mat", "Paper napkins x 100"],
    "halal_note": "All food must be halal — confirm with caterer"
  }},

  "cost_breakdown": {{
    "transport_per_person": 0,
    "entry_fees_per_person": 0,
    "food_per_person": 0,
    "toy_train_per_person": 0,
    "miscellaneous_per_person": 150,
    "total_per_person": 0,
    "total_group": 0,
    "petrol_estimate": null,
    "notes": "Petrol cost if own car: approx Rs X for Y km at Z kmpl",
    "activities_breakdown": [
      {{
        "name": "Botanical Garden",
        "fee_adult": 30,
        "fee_child": 15,
        "group_total": 1350
      }}
    ]
  }},

  "packing_list": {{
    "mandatory_everyone": ["National ID / Aadhaar", "Cash (ATM limited in hills)", "Warm jacket (Ooty is cold at night)", "Comfortable walking shoes", "Sunscreen SPF 50", "Water bottle"],
    "group_coordinator": ["Printed ticket copies x 50", "First aid kit (bandages, antiseptic, ORS)", "Motion sickness tablets (Avomine/Phenergan)", "Kids paracetamol syrup", "Torch / power bank", "Emergency contact list"],
    "for_kids": ["Diapers if toddlers", "Wet wipes x 2 packs", "Change of clothes x 2", "Kids snacks", "Paper/mat to sit on ground", "Motion sickness syrup"],
    "for_elderly": ["Walking stick if needed", "Regular medicines (7-day supply)", "Compression socks for long bus ride"],
    "catering_team": ["Pots, ladles, plates", "LPG stove if reheating needed", "Cloth bags (plastic banned in Ooty)"],
    "bus_travel": ["Plastic covers/bags (for motion sickness — keep accessible)", "Extra clothes in case of vomiting", "Towel", "Hand sanitizer"],
    "muslim_specific": ["Prayer mat (small travel size)", "Compass / Qibla app", "Wudu water bottle for tayammum if needed"],
    "weather_specific": []
  }},

  "alerts": [
    {{
      "type": "restriction|timing|health|safety|booking",
      "message": "Warning message here",
      "severity": "high|medium|low"
    }}
  ],

  "emergency_info": {{
    "nearest_hospital": "Government Hospital, Ooty — 0423-2444212",
    "police": "Ooty Police — 0423-2443422",
    "ambulance": "108",
    "tour_coordinator_tip": "Assign one adult per 8 members as group leader with walkie-talkie or WhatsApp group"
  }},

  "dinner_hotel_suggestion": {{
    "name": "Hotel name (halal/veg, on return route)",
    "location": "City, State",
    "approx_cost_per_head": 200,
    "cuisine": "South Indian / Halal",
    "notes": "Call ahead to reserve table for {group_size}"
  }},

  "summary": "2-3 sentence overview of the plan",
  "group_tips": ["tip 1", "tip 2", "tip 3"]
}}

RULES:
- timeline: complete hour-by-hour from {departure_time} to end of day, including ALL stops — prayer, food, toilet, sightseeing, pre-booked activities. Pre-booked activities MUST appear at their exact times.
- prayer_schedule: ONLY include if religion is 'muslim'. Calculate actual Fajr/Dhuhr/Asr/Maghrib/Isha times for {destination} on {travel_date} (estimate based on season/latitude).
- catering_checklist: ONLY include if food_plan is 'catering' or 'carry'. Scale quantities to group_size.
- halal_note: ONLY include if religion is 'muslim'
- petrol_estimate: ONLY include if transport_mode is 'own_car'. Estimate distance x Rs 8.5/km (average car mileage).
- plastic_restricted: true for Ooty, hill stations in Tamil Nadu and Kerala with known restrictions
- cost_breakdown: calculate totals (total_per_person = sum of all per-person costs, total_group = total_per_person x group_size)
- alerts: always include plastic restriction alert for Ooty; include motion sickness alert for bus + hills
- packing_list: tailor to actual context — omit sections not relevant (e.g. omit catering_team if food_plan is 'restaurant')
- dinner_hotel_suggestion: suggest on the return route, halal-certified if religion is muslim
- group_tips: 3-5 practical tips specific to this trip type and size"""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8000,
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
        log.error("Group trip planner error: %s", e)
        return {
            "origin": origin,
            "destination": destination,
            "travel_date": travel_date,
            "group_type": group_type,
            "group_size": group_size,
            "duration": duration,
            "timeline": [],
            "prayer_schedule": [],
            "places": [],
            "toilet_stops": [],
            "food_plan": {"plan_type": food_plan, "meals": [], "catering_checklist": []},
            "cost_breakdown": {
                "transport_per_person": 0,
                "entry_fees_per_person": 0,
                "food_per_person": 0,
                "toy_train_per_person": 0,
                "miscellaneous_per_person": 0,
                "total_per_person": 0,
                "total_group": 0,
                "petrol_estimate": None,
                "notes": "",
            },
            "packing_list": {"mandatory_everyone": []},
            "alerts": [],
            "emergency_info": {
                "nearest_hospital": "",
                "police": "",
                "ambulance": "108",
                "tour_coordinator_tip": "",
            },
            "summary": "",
            "group_tips": [],
            "error": str(e),
        }
