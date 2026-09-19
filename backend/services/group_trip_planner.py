import anthropic
import httpx
import json
import os
import logging
from datetime import date
from services.traffic_forecast import get_traffic_forecast

log = logging.getLogger(__name__)

# ── Attraction duration ground truth ─────────────────────────────────────────

# Base visit durations (minutes) for solo/small group — used as ground truth in prompt
ATTRACTION_DURATIONS: dict[str, int] = {
    # Ooty / Nilgiris
    "botanical garden": 120, "government botanical garden": 120,
    "doddabetta peak": 60, "ooty lake": 75, "pine forest": 45,
    "rose garden": 60, "tea factory": 45, "avalanche lake": 90,
    "emerald lake": 60, "toy train": 75, "coonoor": 90,
    "sim's park": 75, "lamb's rock": 45, "dolphin's nose": 60,

    # Kodaikanal
    "kodaikanal lake": 90, "coaker's walk": 45, "pillar rocks": 30,
    "silver cascade": 30, "bryant park": 60, "bear shola falls": 45,

    # Munnar / Kerala
    "eravikulam": 90, "mattupetty dam": 45, "echo point": 30,
    "top station": 60, "chinnar wildlife": 120, "tea museum": 60,
    "attukal waterfalls": 45,

    # Goa
    "calangute beach": 120, "baga beach": 120, "anjuna beach": 90,
    "chapora fort": 60, "basilica of bom jesus": 60, "se cathedral": 45,
    "dudhsagar falls": 120, "old goa": 90,

    # Kerala
    "backwaters alleppey": 180, "periyar": 180, "varkala beach": 90,
    "fort kochi": 120, "chinese fishing nets": 30, "mattancherry palace": 60,

    # Karnataka
    "mysore palace": 90, "chamundi hills": 60, "brindavan gardens": 90,
    "coorg": 240, "abbey falls": 45, "namdroling monastery": 60,
    "talakaveri": 60,

    # Tamil Nadu
    "meenakshi temple": 90, "rameshwaram": 120, "kanyakumari": 120,
    "mahabalipuram": 150, "shore temple": 60, "five rathas": 45,
    "kapaleeshwarar temple": 60, "marina beach": 90,

    # Rajasthan
    "amber fort": 120, "hawa mahal": 45, "city palace jaipur": 90,
    "lake pichola": 60, "city palace udaipur": 90, "mehrangarh fort": 90,
    "jaisalmer fort": 90, "pushkar lake": 45,

    # Delhi / Agra / UP
    "taj mahal": 120, "agra fort": 90, "red fort delhi": 75,
    "qutub minar": 60, "humayun's tomb": 60, "lotus temple": 45,
    "india gate": 30, "akshardham": 150,

    # Mumbai
    "gateway of india": 30, "elephanta caves": 120, "marine drive": 45,
    "chhatrapati shivaji terminus": 30, "juhu beach": 60,

    # Himachal / Hill Stations
    "rohtang pass": 180, "solang valley": 120, "hadimba temple": 45,
    "shimla mall road": 60, "jakhu temple": 45, "kufri": 90,
    "dalhousie": 180, "khajjiar": 60,

    # Ladakh / J&K
    "pangong lake": 120, "nubra valley": 180, "leh palace": 60,
    "shanti stupa": 45, "hemis monastery": 60,

    # Default fallbacks by category
    "beach": 90, "fort": 75, "temple": 60, "palace": 90,
    "museum": 75, "park": 60, "lake": 60, "falls": 45, "peak": 60,
}


def get_attraction_duration(name: str, group_size: int) -> int:
    """Return estimated visit duration in minutes, adjusted for group size."""
    name_lower = name.lower()
    base = 60  # default
    for key, mins in ATTRACTION_DURATIONS.items():
        if key in name_lower:
            base = mins
            break
    # Group size multiplier: base × (1 + group_size / 150)
    # 50 pax → ×1.33, 20 pax → ×1.13, 10 pax → ×1.07
    multiplier = 1 + (group_size / 150)
    return int(base * multiplier)


def boarding_buffer(group_size: int) -> int:
    """Extra minutes for group boarding/alighting at each stop."""
    if group_size <= 4:   return 0
    if group_size <= 15:  return 10
    if group_size <= 30:  return 15
    if group_size <= 50:  return 20
    return 30


def prayer_duration(group_size: int) -> int:
    """Realistic Namaz stop duration for Muslim group."""
    if group_size <= 10:  return 15
    if group_size <= 30:  return 20
    return 30  # 50 pax: wudu queue + salah


def meal_duration(group_size: int, meal_type: str = "lunch") -> int:
    """Time to serve + eat for group, in minutes."""
    base = 30 if meal_type == "snack" else 45
    if group_size > 20: base += 15
    if group_size > 40: base += 15
    return base


# ── SerpAPI attraction lookup ─────────────────────────────────────────────────

async def _fetch_attraction_info(attraction: str, location: str) -> dict:
    """Fetch real attraction data from SerpAPI google_local — hours, rating, address."""
    api_key = os.getenv("SERPAPI_KEY", "")
    if not api_key:
        return {}
    try:
        params = {
            "engine": "google_local",
            "q": f"{attraction} {location}",
            "hl": "en",
            "api_key": api_key,
        }
        async with httpx.AsyncClient() as c:
            resp = await c.get("https://serpapi.com/search.json", params=params, timeout=10.0)
            resp.raise_for_status()
            results = resp.json().get("local_results", [])
            if results:
                r = results[0]
                return {
                    "rating": r.get("rating"),
                    "reviews": r.get("reviews"),
                    "hours": r.get("hours", ""),
                    "address": r.get("address", ""),
                    "type": r.get("type", ""),
                }
    except Exception:
        pass
    return {}


# ── Transport cost database ───────────────────────────────────────────────────

# Realistic transport costs (INR) — hardcoded from market rates
TRANSPORT_COSTS = {
    "bus": {
        # Per day rates for AC Volvo/Tempo Traveller by capacity
        "per_day_ac_volvo_50pax": 12000,
        "per_day_ac_volvo_35pax": 9000,
        "per_day_tempo_traveller_12pax": 4000,
        "per_day_innova_7pax": 2500,
        # Per km rates (approx) for self-drive / taxi
        "per_km_ac": 18,
        "per_km_non_ac": 12,
    },
    "fuel": {
        # Own car petrol estimate
        "petrol_per_litre": 105,
        "avg_kmpl_car": 14,
        "avg_kmpl_suv": 11,
    }
}


def estimate_bus_cost(group_size: int, distance_km: int, days: int = 1) -> dict:
    """Estimate bus rental cost for a group trip."""
    if group_size > 35:
        per_day = TRANSPORT_COSTS["bus"]["per_day_ac_volvo_50pax"]
        vehicles = (group_size + 49) // 50
        vehicle_type = "AC Volvo (50-seater)"
    elif group_size > 12:
        per_day = TRANSPORT_COSTS["bus"]["per_day_ac_volvo_35pax"]
        vehicles = (group_size + 34) // 35
        vehicle_type = "AC Volvo (35-seater)"
    elif group_size > 6:
        per_day = TRANSPORT_COSTS["bus"]["per_day_tempo_traveller_12pax"]
        vehicles = (group_size + 11) // 12
        vehicle_type = "Tempo Traveller (12-seater)"
    else:
        per_day = TRANSPORT_COSTS["bus"]["per_day_innova_7pax"]
        vehicles = 1
        vehicle_type = "Innova/Ertiga"

    total = per_day * vehicles * days
    per_person = total // group_size if group_size else total
    return {
        "vehicle_type": vehicle_type,
        "vehicles_needed": vehicles,
        "cost_per_day_per_vehicle": per_day,
        "total_transport_cost": total,
        "transport_per_person": per_person,
        "note": f"{vehicles} × {vehicle_type} × {days} day(s)"
    }


# ── Main planner function ─────────────────────────────────────────────────────

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

    # ── Pre-compute overhead values ───────────────────────────────────────────
    board_buf = boarding_buffer(group_size)
    prayer_dur = prayer_duration(group_size) if religion.lower() == "muslim" else 0
    lunch_dur = meal_duration(group_size, "lunch")
    snack_dur = meal_duration(group_size, "snack")

    # Compute trip days
    try:
        if not is_day_trip and return_date:
            trip_days = max(1, (date.fromisoformat(return_date) - date.fromisoformat(travel_date)).days)
        else:
            trip_days = 1
    except Exception:
        trip_days = 1

    transport = estimate_bus_cost(group_size, distance_km=400, days=trip_days)

    # Traffic forecast for realistic travel time
    traffic = get_traffic_forecast(origin, destination, travel_date, departure_time)

    # Build attraction times block: match destination keywords against known attractions
    dest_lower = destination.lower()
    dest_words = set(w for w in dest_lower.split() if len(w) > 3)
    relevant_attractions: dict[str, int] = {}
    for key in ATTRACTION_DURATIONS:
        # Include if any dest word appears in key, or key appears in dest
        if any(w in key for w in dest_words) or any(w in dest_lower for w in key.split()):
            relevant_attractions[key] = get_attraction_duration(key, group_size)
    # Always include generic fallback categories
    for cat in ["beach", "fort", "temple", "palace", "museum", "park", "lake", "falls", "peak"]:
        relevant_attractions[cat] = get_attraction_duration(cat, group_size)

    attraction_lines = "\n".join(
        f"  - {k}: {v} min" for k, v in sorted(relevant_attractions.items())
    )

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GROUND TRUTH — use these EXACTLY, do not override:

GROUP SIZE OVERHEAD (for {group_size} people):
- Boarding/alighting buffer per stop: {board_buf} min (add to every travel/sightseeing stop)
- Prayer stop duration: {prayer_dur} min (Namaz + wudu queue for this group size)
- Lunch serving duration: {lunch_dur} min
- Snack stop duration: {snack_dur} min

ATTRACTION VISIT TIMES (already adjusted for {group_size} people):
{attraction_lines}
  - Any unlisted attraction: use 75 min as default

TRANSPORT COSTS (real market rates):
- Vehicle: {transport['vehicle_type']} × {transport['vehicles_needed']}
- Total transport cost: ₹{transport['total_transport_cost']:,}
- Transport per person: ₹{transport['transport_per_person']:,}
- Note: {transport['note']}

TRAVEL TIME (traffic-adjusted for {travel_date}):
- Base travel time {origin}→{destination}: {traffic['base_minutes']} min
- Traffic level: {traffic['traffic_level'].upper()} ({traffic['reason']})
- Estimated travel time with traffic: {traffic['estimated_hours_str']}
- Traffic advice: {traffic['advice']}
- Use {traffic['estimated_minutes']} min as the outbound travel time. Do NOT use any other estimate.
- Also add {traffic['estimated_minutes']} min for return journey (traffic is usually lighter returning).

TIMELINE RULES:
1. Start at {departure_time}. Every stop must have a realistic start time based on cumulative durations.
2. Add {board_buf} min boarding buffer after every travel segment.
3. Never overlap prayer times with sightseeing — Dhuhr and Asr must have dedicated stops.
4. Food serving takes {lunch_dur} min for this group — do not assign less.
5. Factor in travel time between spots (use realistic road speeds: 30 km/h in hills, 60 km/h on highways).
6. The plan MUST fit between {departure_time} and {return_time or '22:00'}. If it doesn't fit, remove the last activity.

COST RULES:
- Transport per person: ₹{transport['transport_per_person']:,} (use exactly this)
- Entry fees: use local rates (Botanical Garden Ooty ₹30/adult, ₹15/child; Doddabetta ₹15; Ooty Lake boating ₹40/person, etc.)
- Catering for {group_size} people: budget ₹120–180/person/meal for south Indian food
- Miscellaneous (tips, parking, guides): ₹150–200/person
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
- cost_breakdown: use transport_per_person = {transport['transport_per_person']} exactly; calculate totals (total_per_person = sum of all per-person costs, total_group = total_per_person x group_size)
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
        result = json.loads(text.strip())

        # Attach traffic forecast to result
        result["traffic_forecast"] = traffic

        # ── Enrich top attraction with real SerpAPI data ──────────────────────
        if result.get("places") and os.getenv("SERPAPI_KEY"):
            top_place = result["places"][0].get("name", "")
            if top_place:
                real_data = await _fetch_attraction_info(top_place, destination)
                if real_data.get("hours"):
                    result["places"][0]["opening_hours"] = real_data["hours"]
                if real_data.get("rating"):
                    result["places"][0]["real_rating"] = real_data["rating"]

        return result

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
