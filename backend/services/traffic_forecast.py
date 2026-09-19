from datetime import date
import logging

log = logging.getLogger(__name__)

# Public holidays in India 2025-2027 (add more as needed)
INDIA_HOLIDAYS = {
    # 2026
    "2026-01-01", "2026-01-14",  # New Year, Pongal
    "2026-01-26",                 # Republic Day
    "2026-03-20",                 # Holi
    "2026-04-02",                 # Good Friday (approx)
    "2026-04-14",                 # Tamil New Year / Ambedkar Jayanti
    "2026-04-29",                 # Eid ul-Fitr (approx)
    "2026-08-15",                 # Independence Day
    "2026-10-02",                 # Gandhi Jayanti
    "2026-10-20",                 # Diwali (approx)
    "2026-11-05",                 # Diwali holiday
    "2026-12-25",                 # Christmas
    # 2025
    "2025-01-01", "2025-01-14", "2025-01-26",
    "2025-03-14", "2025-03-31",  # Holi, Eid
    "2025-04-14", "2025-08-15", "2025-10-02",
    "2025-10-20", "2025-12-25",
}

# School vacation periods in Tamil Nadu / Karnataka / Kerala (peak tourist rush)
SCHOOL_VACATION_RANGES = [
    ("04-15", "06-10"),  # Summer vacation (main peak)
    ("10-01", "11-15"),  # Dasara / Diwali break
    ("12-20", "01-05"),  # Christmas / New Year break
]

# Tourist peak seasons by region keyword
PEAK_SEASONS: dict[str, list[tuple[str, str]]] = {
    "ooty": [("04-01", "06-30"), ("10-01", "01-31")],
    "kodaikanal": [("04-01", "06-30"), ("10-01", "01-31")],
    "munnar": [("09-01", "01-31")],
    "manali": [("05-01", "09-30")],
    "shimla": [("04-01", "06-30"), ("12-01", "01-31")],
    "goa": [("11-01", "02-28")],
    "kerala": [("09-01", "03-31")],
    "coorg": [("10-01", "02-28")],
    "mussoorie": [("04-01", "07-31"), ("12-01", "01-15")],
    "lonavala": [("06-01", "09-30"), ("12-01", "01-15")],  # monsoon + winter
}

# Popular routes: (origin_keywords, destination_keywords) → base_time_minutes
# base_time = good weekday morning traffic
POPULAR_ROUTES: list[tuple[list[str], list[str], int]] = [
    (["kondotty", "malappuram", "kozhikode", "calicut"], ["ooty", "udhagamandalam"], 300),
    (["coimbatore", "cbr"], ["ooty", "udhagamandalam"], 180),
    (["bangalore", "bengaluru", "blr"], ["ooty", "udhagamandalam"], 390),
    (["bangalore", "bengaluru", "blr"], ["mysore", "mysuru"], 180),
    (["bangalore", "bengaluru", "blr"], ["coorg", "madikeri"], 270),
    (["bangalore", "bengaluru", "blr"], ["chikmagalur"], 240),
    (["bangalore", "bengaluru", "blr"], ["hampi"], 360),
    (["bangalore", "bengaluru", "blr"], ["goa", "panaji"], 480),
    (["mumbai", "pune"], ["lonavala", "khandala"], 120),
    (["mumbai"], ["goa", "panaji"], 480),
    (["mumbai"], ["nashik"], 180),
    (["pune"], ["mahabaleshwar"], 180),
    (["chennai"], ["pondicherry", "puducherry"], 150),
    (["chennai"], ["mahabalipuram", "mamallapuram"], 90),
    (["chennai"], ["vellore"], 150),
    (["delhi", "new delhi"], ["agra"], 210),
    (["delhi", "new delhi"], ["jaipur"], 270),
    (["delhi", "new delhi"], ["shimla"], 420),
    (["delhi", "new delhi"], ["manali"], 540),
    (["delhi", "new delhi"], ["mussoorie"], 360),
    (["delhi", "new delhi"], ["haridwar", "rishikesh"], 300),
    (["cochin", "kochi", "ernakulam"], ["munnar"], 180),
    (["cochin", "kochi", "ernakulam"], ["alleppey", "alappuzha"], 90),
    (["trivandrum", "thiruvananthapuram"], ["varkala"], 60),
    (["coimbatore", "cbr"], ["kodaikanal", "kodai"], 150),
    (["madurai"], ["rameshwaram"], 180),
    (["madurai"], ["kodaikanal", "kodai"], 120),
]


def _is_in_range(travel_date: date, start_mmdd: str, end_mmdd: str) -> bool:
    """Check if travel_date falls within a MM-DD range (handles year wrap)."""
    sm, sd = int(start_mmdd[:2]), int(start_mmdd[3:])
    em, ed = int(end_mmdd[:2]), int(end_mmdd[3:])
    start = date(travel_date.year, sm, sd)
    end_year = travel_date.year if em >= sm else travel_date.year + 1
    end = date(end_year, em, ed)
    return start <= travel_date <= end


def get_traffic_forecast(
    origin: str,
    destination: str,
    travel_date: str,          # YYYY-MM-DD
    departure_time: str = "06:00",  # HH:MM
) -> dict:
    """
    Returns traffic forecast for the route.
    Result: {
        base_minutes, multiplier, estimated_minutes, estimated_hours_str,
        traffic_level: "light"|"normal"|"heavy"|"very_heavy",
        reason: str,
        advice: str,
        is_holiday: bool,
        is_weekend: bool,
        is_peak_season: bool,
        is_school_vacation: bool,
        departure_time: str,
    }
    """
    try:
        travel_d = date.fromisoformat(travel_date)
    except Exception:
        travel_d = date.today()

    dep_hour = int(departure_time.split(":")[0]) if departure_time else 6
    origin_lower = origin.lower()
    dest_lower = destination.lower()

    # Find base time from route database
    base_minutes = None
    for origins_kw, dests_kw, base in POPULAR_ROUTES:
        if any(kw in origin_lower for kw in origins_kw) and any(kw in dest_lower for kw in dests_kw):
            base_minutes = base
            break
    if base_minutes is None:
        base_minutes = 300  # default 5h for unknown routes

    # Determine traffic factors
    is_holiday = travel_date in INDIA_HOLIDAYS
    weekday = travel_d.weekday()  # 0=Mon, 6=Sun
    is_weekend = weekday >= 5  # Sat or Sun
    is_friday = weekday == 4

    is_school_vacation = any(
        _is_in_range(travel_d, s, e)
        for s, e in SCHOOL_VACATION_RANGES
    )

    is_peak_season = False
    for dest_kw, ranges in PEAK_SEASONS.items():
        if dest_kw in dest_lower:
            if any(_is_in_range(travel_d, s, e) for s, e in ranges):
                is_peak_season = True
                break

    # Departure time factor
    if dep_hour <= 5:
        time_factor = 0.85  # very early, minimal traffic
    elif dep_hour <= 7:
        time_factor = 0.90  # early morning, light
    elif dep_hour <= 9:
        time_factor = 1.00  # normal
    elif dep_hour <= 11:
        time_factor = 1.15  # mid-morning rush to hills
    elif dep_hour <= 14:
        time_factor = 1.25  # peak afternoon, everyone heading to hills
    else:
        time_factor = 1.10  # evening, return traffic

    # Combine factors
    multiplier = time_factor
    reasons: list[str] = []

    if is_holiday:
        multiplier *= 1.60
        reasons.append("public holiday")
    elif is_weekend and is_peak_season:
        multiplier *= 1.50
        reasons.append("weekend + peak season")
    elif is_weekend:
        multiplier *= 1.35
        reasons.append("weekend")
    elif is_friday:
        multiplier *= 1.20
        reasons.append("Friday — weekend getaway traffic starts")

    if is_school_vacation and not is_holiday:
        multiplier *= 1.20
        reasons.append("school vacation period")

    if is_peak_season and not (is_weekend or is_holiday):
        multiplier *= 1.15
        reasons.append("peak tourist season")

    # Cap multiplier at 2.0 (realistic max)
    multiplier = min(multiplier, 2.0)
    estimated_minutes = int(base_minutes * multiplier)
    hours = estimated_minutes // 60
    mins = estimated_minutes % 60
    estimated_hours_str = f"{hours}h {mins}min" if mins else f"{hours}h"

    if multiplier <= 1.0:
        traffic_level = "light"
    elif multiplier <= 1.25:
        traffic_level = "normal"
    elif multiplier <= 1.55:
        traffic_level = "heavy"
    else:
        traffic_level = "very_heavy"

    reason_str = " + ".join(reasons) if reasons else "normal weekday"

    if traffic_level == "very_heavy":
        advice = (
            f"Very heavy traffic expected ({reason_str}). "
            "Depart by 4:00–5:00 AM to avoid gridlock on ghat roads."
        )
    elif traffic_level == "heavy":
        advice = (
            f"Heavy traffic likely ({reason_str}). "
            "Depart early — by 5:30–6:00 AM."
        )
    elif traffic_level == "normal":
        advice = "Normal traffic expected. Depart on time."
    else:
        advice = "Light traffic — early departure ensures smooth journey."

    return {
        "base_minutes": base_minutes,
        "multiplier": round(multiplier, 2),
        "estimated_minutes": estimated_minutes,
        "estimated_hours_str": estimated_hours_str,
        "traffic_level": traffic_level,
        "reason": reason_str,
        "advice": advice,
        "is_holiday": is_holiday,
        "is_weekend": is_weekend,
        "is_peak_season": is_peak_season,
        "is_school_vacation": is_school_vacation,
        "departure_time": departure_time,
    }
