import asyncio
import os
import json
import datetime
from typing import AsyncGenerator
import anthropic

from services.serpapi_flights import search_flights

SYSTEM_PROMPT = """You are Plan Advisor, a full-service AI travel and lifestyle assistant based in India.
You help users plan every step of their journey — from picking a destination to booking transport, finding hotels and discovering where to eat.

Today's date: {today}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRAVEL PLANNING FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Step 1 — Destination suggestions**
When a user asks about vacations, holidays, or where to go, proactively suggest 3-5 tailored destinations.
For each destination give: why it's great right now, best time to go, rough budget tier (budget/mid-range/luxury), and top 2 highlights.
Ask about their: budget, travel dates, interests (beach/mountains/culture/adventure/food), and duration if not provided.

**Step 2 — Transport comparison**
Once a destination is chosen (or the user asks how to get somewhere), ALWAYS compare ALL available modes:
• **Flight** — call `search_flights` for real prices.
• **Train** — call `search_trains` for schedule & fare snippets, then cite real booking platforms.
• **Bus** — call `search_buses` for options. Only relevant if ≤ ~800 km and the route is served.

Present results as a clear comparison table:
| Mode | Duration | Approx Price | Comfort | Best For | Book At |
Then recommend the best option and explain the trade-off.

**Step 3 — Hotels**
After the user picks transport (or asks about accommodation), call `search_hotels`.
Show name, star rating, price per night, key amenities, and link.
Suggest 1 budget, 1 mid-range, and 1 premium option when possible.
**Do NOT ask for exact dates before searching hotels.** If the user hasn't given check-in/check-out dates, assume a 2-night stay starting 30 days from today, call `search_hotels` immediately, and mention the assumed dates in your response. The user can always refine.

**Step 4 — Restaurants & Food**
After hotels (or when user asks about food), call `find_restaurants`.
Group suggestions by: local cuisine, popular chains, street food/food courts.
Mention must-try dishes for the destination.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOLS AVAILABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Flights (real-time prices):
• `search_flights`       — Google Flights. Single-leg, round-trip, multi-city.
• `compare_flights`      — Google Flights + Travelpayouts side-by-side. Only when user explicitly wants platform comparison.
• `get_price_calendar`   — Cheapest price per day in a month. Use for flexible dates.

Ground transport (real schedule/fare data from web search):
• `search_trains`  — Train schedules and fares. Always call before recommending train travel.
• `search_buses`   — Bus options. Call for routes ≤ 800 km.

Accommodation:
• `search_hotels`  — Real hotel listings with prices, ratings, amenities.

Food:
• `find_restaurants` — Restaurants, food courts, and eateries near any location.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRICING & STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Default currency: INR (₹). Switch only if user asks.
• **Be proactive, not interrogative.** Make reasonable assumptions (default 1 adult, economy class, 2-night stays, dates ~30 days out) and search immediately. Show results first, then offer to refine. Never ask more than one clarifying question at a time.
• Context memory: when user asks follow-ups ("what about next week?", "show business class"), reuse route/location from recent tool calls — never ask them to repeat.
• Be concise but thorough. Use markdown tables and bullet lists. Bold key figures.
• Always end transport/hotel/restaurant sections with a clear recommendation."""


# ── Tool schemas ───────────────────────────────────────────────────────────────

_FLIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "origin":         {"type": "string", "description": "Origin IATA code."},
        "destination":    {"type": "string", "description": "Destination IATA code."},
        "departure_date": {"type": "string", "description": "YYYY-MM-DD."},
        "slices": {
            "type": "array",
            "description": "Multi-city legs. Each: {origin, destination, departure_date}.",
            "items": {
                "type": "object",
                "properties": {
                    "origin":         {"type": "string"},
                    "destination":    {"type": "string"},
                    "departure_date": {"type": "string"},
                },
                "required": ["origin", "destination", "departure_date"],
            },
        },
        "return_date":  {"type": "string", "description": "YYYY-MM-DD. Omit for one-way."},
        "adults":       {"type": "integer", "description": "Adult passengers. Default 1."},
        "cabin_class":  {"type": "string", "enum": ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]},
        "max_results":  {"type": "integer", "description": "Results 1-10. Default 5."},
        "currency":     {"type": "string", "description": "Currency code. Default INR."},
    },
}

_ROUTE_SCHEMA = {
    "type": "object",
    "properties": {
        "origin":      {"type": "string", "description": "Origin city or station name."},
        "destination": {"type": "string", "description": "Destination city or station name."},
        "date":        {"type": "string", "description": "Travel date YYYY-MM-DD."},
    },
    "required": ["origin", "destination", "date"],
}

TOOLS = [
    {
        "name": "search_flights",
        "description": (
            "Search real-time flight prices from Google Flights. "
            "Supports single-leg, round-trip, and multi-city (use slices). "
            "Convert city names to IATA codes (Bangalore→BLR, Dubai→DXB, London→LHR, Mumbai→BOM, Delhi→DEL, Chennai→MAA, Kolkata→CCU, Hyderabad→HYD, Goa→GOI, Kochi→COK)."
        ),
        "input_schema": _FLIGHT_SCHEMA,
    },
    {
        "name": "compare_flights",
        "description": (
            "Compare flight prices across Google Flights AND Travelpayouts simultaneously. "
            "Use ONLY when the user explicitly wants to compare booking platforms."
        ),
        "input_schema": {
            **_FLIGHT_SCHEMA,
            "properties": {
                **_FLIGHT_SCHEMA["properties"],
                "max_results": {"type": "integer", "description": "Results per source (2-4). Default 3."},
            },
        },
    },
    {
        "name": "get_price_calendar",
        "description": (
            "Get cheapest flight price for each day in a month. "
            "Use for flexible dates or 'cheapest day to fly' queries."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "origin":      {"type": "string"},
                "destination": {"type": "string"},
                "year_month":  {"type": "string", "description": "YYYY-MM"},
                "currency":    {"type": "string", "description": "Default INR."},
            },
            "required": ["origin", "destination", "year_month"],
        },
    },
    {
        "name": "search_trains",
        "description": (
            "Search real train schedule and fare data for a route on a given date. "
            "Call this whenever the user asks about trains or when comparing transport modes. "
            "Returns schedule snippets and booking platform links."
        ),
        "input_schema": _ROUTE_SCHEMA,
    },
    {
        "name": "search_buses",
        "description": (
            "Search real bus options with live seat availability, AC/Non-AC types, "
            "Sleeper/Semi-Sleeper/Seater categories, prices and operator ratings. "
            "Use for any bus route query. Supports routes up to ~1500 km."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "origin":      {"type": "string", "description": "Origin city name (e.g. Bangalore, Mumbai)."},
                "destination": {"type": "string", "description": "Destination city name."},
                "date":        {"type": "string", "description": "Travel date YYYY-MM-DD."},
                "adults":      {"type": "integer", "description": "Number of passengers. Default 1."},
                "max_results": {"type": "integer", "description": "Buses to return (5-15). Default 10."},
                "currency":    {"type": "string", "description": "Currency code. Default INR."},
            },
            "required": ["origin", "destination", "date"],
        },
    },
    {
        "name": "search_hotels",
        "description": (
            "Search real hotel listings with prices, ratings and amenities for a destination. "
            "Call when the user asks about accommodation or after transport is decided."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "location":       {"type": "string", "description": "City or area name."},
                "check_in_date":  {"type": "string", "description": "Check-in date YYYY-MM-DD."},
                "check_out_date": {"type": "string", "description": "Check-out date YYYY-MM-DD."},
                "adults":         {"type": "integer", "description": "Number of guests. Default 2."},
                "max_results":    {"type": "integer", "description": "Hotels to return (3-8). Default 5."},
                "currency":       {"type": "string", "description": "Currency code. Default INR."},
            },
            "required": ["location", "check_in_date", "check_out_date"],
        },
    },
    {
        "name": "find_restaurants",
        "description": (
            "Find restaurants, food courts and eateries near a location using real Google Local data. "
            "Call when user asks about food, where to eat, restaurants or food courts."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "location":    {"type": "string", "description": "City, area or landmark."},
                "cuisine":     {"type": "string", "description": "Optional cuisine type (e.g. Indian, Italian, street food)."},
                "max_results": {"type": "integer", "description": "Restaurants to return (5-10). Default 8."},
            },
            "required": ["location"],
        },
    },
]


# ── Claude client ─────────────────────────────────────────────────────────────

def _get_client() -> anthropic.AsyncAnthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set. Add it to backend/.env.")
    return anthropic.AsyncAnthropic(api_key=api_key)


# ── Tool executor ─────────────────────────────────────────────────────────────

def _common_flight_args(ti: dict) -> dict:
    return {
        "origin":         ti.get("origin", ""),
        "destination":    ti.get("destination", ""),
        "departure_date": ti.get("departure_date", ""),
        "return_date":    ti.get("return_date"),
        "adults":         ti.get("adults", 1),
        "cabin_class":    ti.get("cabin_class", "ECONOMY"),
        "max_results":    ti.get("max_results", 5),
        "currency":       ti.get("currency", "INR"),
        "slices":         ti.get("slices"),
    }


async def _run_tool(name: str, tool_input: dict) -> str:
    # ── Flights ──
    if name == "search_flights":
        try:
            result = await search_flights(**_common_flight_args(tool_input))
            result["source"] = "Google Flights"
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "flights_found": 0})

    if name == "compare_flights":
        try:
            from services.travelpayouts import search_travelpayouts
            args = _common_flight_args(tool_input)
            args["max_results"] = tool_input.get("max_results", 3)
            tp_args = {k: v for k, v in args.items()
                       if k in ("origin", "destination", "departure_date",
                                "return_date", "adults", "cabin_class", "max_results", "currency")}
            serpapi_result, tp_results = await asyncio.gather(
                search_flights(**args), search_travelpayouts(**tp_args),
            )
            all_results = []
            for r in serpapi_result.get("results", []):
                r["source"] = "Google Flights"
                all_results.append(r)
            for r in tp_results:
                all_results.append(r)
            all_results.sort(key=lambda x: x.get("price_number", 0) or 0)
            merged = {
                **serpapi_result,
                "results":           all_results,
                "flights_found":     len(all_results),
                "sources_checked":   ["Google Flights", "Travelpayouts"],
                "sources_succeeded": ["Google Flights"] + (["Travelpayouts"] if tp_results else []),
            }
            return json.dumps(merged)
        except Exception as e:
            return json.dumps({"error": str(e), "flights_found": 0})

    if name == "get_price_calendar":
        try:
            from services.price_calendar import get_price_calendar
            result = await get_price_calendar(
                origin=tool_input["origin"],
                destination=tool_input["destination"],
                year_month=tool_input["year_month"],
                currency=tool_input.get("currency", "INR"),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "prices": []})

    # ── Ground transport ──
    if name == "search_trains":
        try:
            from services.ground_transport import search_trains
            result = await search_trains(
                origin=tool_input.get("origin", ""),
                destination=tool_input.get("destination", ""),
                date=tool_input.get("date", ""),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "mode": "train", "results": []})

    if name == "search_buses":
        try:
            from services.bus_search import search_buses as _search_buses
            result = await _search_buses(
                origin=tool_input.get("origin", ""),
                destination=tool_input.get("destination", ""),
                date=tool_input.get("date", ""),
                adults=tool_input.get("adults", 1),
                max_results=tool_input.get("max_results", 10),
                currency=tool_input.get("currency", "INR"),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "buses_found": 0, "results": []})

    # ── Hotels ──
    if name == "search_hotels":
        try:
            from services.places import search_hotels
            result = await search_hotels(
                location=tool_input.get("location", ""),
                check_in_date=tool_input.get("check_in_date", ""),
                check_out_date=tool_input.get("check_out_date", ""),
                adults=tool_input.get("adults", 2),
                max_results=tool_input.get("max_results", 5),
                currency=tool_input.get("currency", "INR"),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "hotels_found": 0, "results": []})

    # ── Restaurants ──
    if name == "find_restaurants":
        try:
            from services.places import find_restaurants
            result = await find_restaurants(
                location=tool_input.get("location", ""),
                cuisine=tool_input.get("cuisine", ""),
                max_results=tool_input.get("max_results", 8),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "restaurants_found": 0, "results": []})

    return json.dumps({"error": f"Unknown tool: {name}"})


# ── UI spinner labels ──────────────────────────────────────────────────────────

def _tool_label(name: str, tool_input: dict) -> str:
    orig = tool_input.get("origin", "")
    dest = tool_input.get("destination", "")
    date = tool_input.get("departure_date") or tool_input.get("date", "")
    loc  = tool_input.get("location", "")

    if name == "search_flights":
        return f"Searching flights {orig} → {dest} on {date}…"
    if name == "compare_flights":
        return f"Comparing Google Flights + Travelpayouts for {orig} → {dest}…"
    if name == "get_price_calendar":
        return f"Fetching price calendar for {orig} → {dest} in {tool_input.get('year_month', '')}…"
    if name == "search_trains":
        return f"Searching trains {orig} → {dest} on {date}…"
    if name == "search_buses":
        return f"Searching buses {orig} → {dest} on {date}…"
    if name == "search_hotels":
        return f"Finding hotels in {loc}…"
    if name == "find_restaurants":
        return f"Finding restaurants in {loc}…"
    return f"Running {name}…"


# ── Streaming ─────────────────────────────────────────────────────────────────

_MAX_HISTORY = int(os.getenv("MAX_HISTORY_MESSAGES", "30"))


def _trim_history(messages: list) -> list:
    """Keep the last _MAX_HISTORY messages, always starting with a user turn."""
    if len(messages) <= _MAX_HISTORY:
        return messages
    trimmed = messages[-_MAX_HISTORY:]
    # Anthropic requires the first message to have role "user"
    while trimmed and trimmed[0].get("role") != "user":
        trimmed = trimmed[1:]
    return trimmed


async def stream_response(messages: list, extra_system: str | None = None) -> AsyncGenerator[dict, None]:
    client = _get_client()
    model  = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")
    system = SYSTEM_PROMPT.format(today=datetime.date.today().isoformat())
    if extra_system:
        system = system + "\n\n" + extra_system
    current_messages = _trim_history(list(messages))

    while True:
        async with client.messages.stream(
            model=model,
            max_tokens=4096,
            system=system,
            tools=TOOLS,
            messages=current_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield {"type": "token", "content": text}
            final = await stream.get_final_message()

        if final.stop_reason == "end_turn":
            break

        if final.stop_reason == "tool_use":
            assistant_content = []
            for block in final.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id":   block.id,
                        "name": block.name,
                        "input": block.input,
                    })
            current_messages.append({"role": "assistant", "content": assistant_content})

            tool_results = []
            for block in final.content:
                if block.type != "tool_use":
                    continue

                yield {"type": "tool_start", "name": block.name, "label": _tool_label(block.name, block.input)}
                result_str = await _run_tool(block.name, block.input)

                # Emit structured data for frontend cards
                if block.name in ("search_flights", "compare_flights"):
                    try:
                        fd = json.loads(result_str)
                        if fd.get("flights_found", 0) > 0:
                            yield {"type": "flight_results", "data": fd}
                    except Exception:
                        pass
                elif block.name == "get_price_calendar":
                    try:
                        cd = json.loads(result_str)
                        if cd.get("prices"):
                            yield {"type": "price_calendar", "data": cd}
                    except Exception:
                        pass
                elif block.name == "search_hotels":
                    try:
                        hd = json.loads(result_str)
                        if hd.get("hotels_found", 0) > 0:
                            yield {"type": "hotel_results", "data": hd}
                    except Exception:
                        pass
                elif block.name == "find_restaurants":
                    try:
                        rd = json.loads(result_str)
                        if rd.get("restaurants_found", 0) > 0:
                            yield {"type": "restaurant_results", "data": rd}
                    except Exception:
                        pass
                elif block.name == "search_trains":
                    try:
                        td = json.loads(result_str)
                        if td.get("results") or td.get("book_at"):
                            yield {"type": "train_results", "data": td}
                    except Exception:
                        pass
                elif block.name == "search_buses":
                    try:
                        bd = json.loads(result_str)
                        if bd.get("buses_found", 0) > 0:
                            yield {"type": "bus_results", "data": bd}
                    except Exception:
                        pass

                tool_results.append({
                    "type":        "tool_result",
                    "tool_use_id": block.id,
                    "content":     result_str,
                })

            current_messages.append({"role": "user", "content": tool_results})
        else:
            break
