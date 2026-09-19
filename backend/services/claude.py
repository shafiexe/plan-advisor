import asyncio
import os
import json
import datetime
from typing import AsyncGenerator
import anthropic

from services.serpapi_flights import search_flights, search_round_trip, get_flight_status

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
• `search_round_trip`    — Google Flights outbound + return legs searched in parallel. Use for any round-trip or return flight query.
• `compare_flights`      — Google Flights + Travelpayouts side-by-side. Only when user explicitly wants platform comparison.
• `get_price_calendar`   — Cheapest price per day in a month. Use for flexible dates.

Ground transport (real schedule/fare data from web search):
• `search_trains`  — Train schedules and fares. Always call before recommending train travel.
• `search_buses`   — Bus options. Call for routes ≤ 800 km.

Accommodation:
• `search_hotels`  — Real hotel listings with prices, ratings, amenities.

Food:
• `find_restaurants` — Restaurants, food courts, and eateries near any location.

Weather:
• `get_weather`  — Current weather and 3-day forecast for any city. Call when user asks about weather, or proactively after a destination is chosen to give context.

Visa & Entry:
• `get_visa_requirements` — Check visa type (visa-free / on-arrival / eVisa / required), days allowed, and entry notes for any passport → destination pair. Call whenever the user asks about visas, entry requirements, or documents needed for international travel. Default passport to "India" if the user's nationality is not stated.

Currency:
• `convert_currency` — Convert amounts and show live exchange rates for major travel currencies. Call when user mentions prices in foreign currency or asks about conversion.

Destination Guide:
• `get_destination_guide` — Rich destination guide: attractions, neighbourhoods, food, tips, packing list. Call after a destination is confirmed or when user asks what to do there.

Budget:
• `calculate_trip_budget` — Show itemized trip cost breakdown with total. Call when user asks about total cost or after confirming flight + hotel. Estimate meals at ₹2,000-5,000/day depending on destination; activities at 15-20% of total if not specified.
• `split_group_expenses` — Split trip costs among group members, calculate who owes whom. Call when user mentions splitting costs or group travel expenses.

Price analysis:
• `predict_flight_price` — Evaluate if a flight price is a good deal vs typical prices for that route/month. Call when user asks if a price is good/reasonable/worth it.

Itinerary:
• `get_itinerary` — Day-by-day hour-by-hour itinerary (morning/afternoon/evening). Call after confirming travel dates and destination, or when user asks for a schedule/day plan.

Flight status:
• `get_flight_status` — Real-time flight status (on time/delayed/landed), gate, terminal. Call when user asks about a specific flight number.

Packing:
• `get_packing_list` — AI-generated packing list by category (documents, clothing, electronics, etc.). Call when user asks what to pack.

Airport transfer:
• `get_airport_transit` — How to get from airport to hotel/area (metro/bus/taxi/Uber, costs, steps). Call when user asks about airport transport or transfers.

Language:
• `get_phrasebook` — Essential local language phrases (greetings, directions, food, emergency) with pronunciation. Call when user asks for language help or local phrases.

Travel Insurance:
• `get_travel_insurance` — Travel insurance guidance (coverage types, cost estimate, providers). Call when user asks about travel insurance.

Trip Timeline:
• `get_trip_timeline` — Assemble a visual trip timeline from flights, hotel, and itinerary. Call when user asks to see the full trip overview or timeline.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IATA CITY CODES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For round-trip or return flight queries, always call `search_round_trip` instead of calling `search_flights` twice.
Always convert city names to IATA before calling search_flights:
India: Bangalore→BLR, Mumbai→BOM, Delhi→DEL, Chennai→MAA, Kolkata→CCU, Hyderabad→HYD, Goa→GOI, Kochi→COK, Pune→PNQ, Ahmedabad→AMD, Jaipur→JAI, Amritsar→ATQ, Lucknow→LKO, Varanasi→VNS, Nagpur→NAG, Bhubaneswar→BBI, Port Blair→IXZ, Srinagar→SXR, Chandigarh→IXC, Coimbatore→CJB, Mangalore→IXE, Thiruvananthapuram→TRV, Udaipur→UDR, Jodhpur→JDH, Dehradun→DED, Leh→IXL
International: Dubai→DXB, Singapore→SIN, London→LHR, Bangkok→BKK, Kuala Lumpur→KUL, New York→JFK, Paris→CDG, Tokyo→NRT, Sydney→SYD, Abu Dhabi→AUH, Doha→DOH, Colombo→CMB, Kathmandu→KTM, Male→MLE, Phuket→HKT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HANDLING ZERO RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Flights 0 results: verify IATA codes are correct, then retry once with alternative codes if unsure. If still 0, tell the user no direct flights were found and suggest nearby airports or alternative dates.
• Hotels 0 results: the system auto-retries with a simpler query. If still 0, tell the user and suggest nearby cities or alternative dates. Never silently show an empty result.
• Always acknowledge when a search returns nothing — never pretend results exist.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRICING & STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Default currency: INR (₹). Switch only if user asks.
• **Be proactive, never interrogative.** Make reasonable assumptions and search immediately — show results first, refine after. Never ask more than one clarifying question per response. Never ask for information that was already provided (location, passengers, dates). If user_location context is provided, use it as the default origin without asking.
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
            "Always convert city names to IATA codes before calling. "
            "India: BLR(Bangalore) BOM(Mumbai) DEL(Delhi) MAA(Chennai) CCU(Kolkata) HYD(Hyderabad) GOI(Goa) COK(Kochi) PNQ(Pune) AMD(Ahmedabad) JAI(Jaipur) ATQ(Amritsar) LKO(Lucknow) VNS(Varanasi) NAG(Nagpur) IXC(Chandigarh) UDR(Udaipur) IXL(Leh) TRV(Trivandrum). "
            "International: DXB(Dubai) SIN(Singapore) LHR(London) BKK(Bangkok) KUL(KL) JFK(New York) CDG(Paris) NRT(Tokyo) DOH(Doha) MLE(Maldives)."
        ),
        "input_schema": _FLIGHT_SCHEMA,
    },
    {
        "name": "search_round_trip",
        "description": (
            "Search round-trip flights: outbound AND return legs simultaneously. "
            "Use this whenever the user asks for a round trip, return flight, or mentions both departure and return dates. "
            "Always convert city names to IATA codes. Returns both legs with prices."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "origin":         {"type": "string", "description": "IATA code e.g. BLR"},
                "destination":    {"type": "string", "description": "IATA code e.g. DXB"},
                "departure_date": {"type": "string", "description": "YYYY-MM-DD"},
                "return_date":    {"type": "string", "description": "YYYY-MM-DD"},
                "adults":         {"type": "integer", "description": "Default 1"},
                "cabin_class":    {"type": "string",  "description": "economy/business. Default economy"},
                "currency":       {"type": "string",  "description": "Default INR"},
            },
            "required": ["origin", "destination", "departure_date", "return_date"],
        },
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
    {
        "name": "get_weather",
        "description": (
            "Get current weather conditions and 3-day forecast for a destination. "
            "Call when user asks about weather at any location, or proactively when a destination is chosen."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name e.g. 'Dubai', 'Goa', 'Paris'",
                }
            },
            "required": ["location"],
        },
    },
    {
        "name": "get_visa_requirements",
        "description": (
            "Check visa and entry requirements for a specific passport travelling to a destination country. "
            "Call when the user asks about visas, entry requirements, whether they need a visa, or what documents are needed. "
            "Also call proactively for international trips when the user's nationality is known."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "passport_country": {
                    "type": "string",
                    "description": "The traveller's passport / nationality country, e.g. 'India', 'United States'",
                },
                "destination_country": {
                    "type": "string",
                    "description": "The destination country, e.g. 'Thailand', 'United Arab Emirates', 'France'",
                },
            },
            "required": ["passport_country", "destination_country"],

        },
    },
    {
        "name": "get_destination_guide",
        "description": (
            "Generate a comprehensive travel guide for any destination: top attractions, best neighbourhoods, "
            "must-try food, practical tips, what to avoid, and packing list. "
            "Call when user asks for a destination overview, travel guide, things to do, "
            "or after flights/hotels are booked."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "destination": {
                    "type": "string",
                    "description": "Destination city or country name, e.g. 'Tokyo', 'Bali', 'Paris'",
                },
                "duration_days": {
                    "type": "integer",
                    "description": "Trip duration in days. Default 5.",
                },
                "interests": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of traveller interests, e.g. ['beaches', 'food', 'adventure']",
                },
            },
            "required": ["destination"],
        },
    },
    {
        "name": "convert_currency",
        "description": (
            "Convert an amount between currencies and show rates for major travel currencies "
            "(INR, USD, EUR, GBP, AED, THB, SGD, JPY, AUD, MYR). "
            "Call when user asks about exchange rates, currency conversion, or 'how much is X in Y'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "amount": {
                    "type": "number",
                    "description": "The amount to convert.",
                },
                "from_currency": {
                    "type": "string",
                    "description": "Source currency code, e.g. 'USD', 'EUR', 'INR'.",
                },
                "to_currency": {
                    "type": "string",
                    "description": "Optional target currency code, e.g. 'INR'. If omitted, rates for all major currencies are shown.",
                },
            },
            "required": ["amount", "from_currency"],
        },
    },
    {
        "name": "get_itinerary",
        "description": (
            "Generate a detailed day-by-day travel itinerary with morning/afternoon/evening slots. "
            "Call after flights and hotels are confirmed, or when user asks for a day plan, itinerary, or schedule. "
            "Use the confirmed travel dates if known."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "destination":  {"type": "string", "description": "City/country e.g. 'Dubai'"},
                "start_date":   {"type": "string", "description": "YYYY-MM-DD — first day at destination"},
                "end_date":     {"type": "string", "description": "YYYY-MM-DD — last day at destination"},
                "interests":    {"type": "array", "items": {"type": "string"}, "description": "e.g. ['food', 'beaches', 'shopping']"},
                "hotel_area":   {"type": "string", "description": "Hotel location to plan routes from"},
            },
            "required": ["destination", "start_date", "end_date"],
        },
    },
    {
        "name": "predict_flight_price",
        "description": (
            "Check if a flight price is a good deal. Fetches typical prices for the route/month "
            "and returns a verdict: Great Deal / Good Price / Fair Price / A Bit Pricey / Overpriced. "
            "Call when user asks 'is this a good deal?', 'is this price reasonable?', or shares a flight price and wants an opinion."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "origin":         {"type": "string", "description": "IATA code e.g. BLR"},
                "destination":    {"type": "string", "description": "IATA code e.g. DXB"},
                "departure_date": {"type": "string", "description": "YYYY-MM-DD"},
                "price":          {"type": "number",  "description": "The price to evaluate"},
                "currency":       {"type": "string",  "description": "Currency code, default INR"},
            },
            "required": ["origin", "destination", "departure_date", "price"],
        },
    },
    {
        "name": "get_flight_status",
        "description": (
            "Get real-time or scheduled status for a specific flight number. "
            "Call when user asks about a flight status, delay, gate, or arrival time. "
            "Requires a flight number (e.g. 'EK504', 'AI101') and optionally a date."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "flight_number":  {"type": "string", "description": "IATA flight number e.g. EK504"},
                "departure_date": {"type": "string", "description": "YYYY-MM-DD, defaults to today"},
            },
            "required": ["flight_number"],
        },
    },
    {
        "name": "get_packing_list",
        "description": (
            "Generate a categorized packing list for a trip. "
            "Call when user asks what to pack, packing advice, or packing list. "
            "Try to use known destination, duration, and trip type from the conversation."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "destination":   {"type": "string", "description": "Destination city/country"},
                "duration_days": {"type": "integer", "description": "Trip length in days"},
                "trip_type":     {"type": "string", "enum": ["leisure", "business", "adventure", "beach"], "description": "Type of trip"},
                "weather":       {"type": "string", "enum": ["warm", "cold", "rainy", "mixed"], "description": "Expected weather"},
                "activities":    {"type": "array", "items": {"type": "string"}, "description": "e.g. ['swimming', 'hiking', 'fine dining']"},
            },
            "required": ["destination"],
        },
    },
    {
        "name": "get_airport_transit",
        "description": (
            "Describe how to get from an airport to a hotel or area. "
            "Covers metro, bus, taxi, Uber/Grab, shuttle with costs and travel times. "
            "Call when user asks how to get from airport to hotel/city, or about airport transport."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "airport_iata": {"type": "string", "description": "Airport IATA code e.g. DXB"},
                "airport_name": {"type": "string", "description": "Full airport name e.g. Dubai International Airport"},
                "hotel_area":   {"type": "string", "description": "Hotel name or area e.g. Downtown Dubai"},
                "currency":     {"type": "string", "description": "User's currency for cost estimates e.g. INR"},
            },
            "required": ["airport_iata"],
        },
    },
    {
        "name": "get_phrasebook",
        "description": (
            "Generate a travel phrasebook with essential phrases in the local language. "
            "Covers greetings, directions, food, shopping, and emergency phrases with pronunciation. "
            "Call when user asks for local phrases, language help, or how to communicate at destination."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "destination": {"type": "string", "description": "Destination city or country"},
                "language":    {"type": "string", "description": "Language name if known e.g. 'Arabic'"},
            },
            "required": ["destination"],
        },
    },
    {
        "name": "get_travel_insurance",
        "description": (
            "Provide travel insurance guidance: what coverage to get, cost estimates, and providers. "
            "Call when user asks about travel insurance, whether they need it, or what to get."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "destination":   {"type": "string"},
                "duration_days": {"type": "integer"},
                "trip_cost":     {"type": "number", "description": "Total trip cost for trip cancellation coverage estimate"},
                "activities":    {"type": "array", "items": {"type": "string"}},
                "currency":      {"type": "string"},
            },
            "required": ["destination"],
        },
    },
    {
        "name": "split_group_expenses",
        "description": (
            "Split trip expenses equally (or by custom shares) among group members. "
            "Shows each person's share and who owes whom. "
            "Call when user asks to split costs, calculate shares, or divide trip expenses among people."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "members": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of member names e.g. ['Shafi', 'Priya', 'Ravi']",
                },
                "expenses": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name":     {"type": "string",  "description": "Expense name e.g. 'Flight tickets'"},
                            "amount":   {"type": "number",  "description": "Total cost"},
                            "paid_by":  {"type": "string",  "description": "Member who paid (must be in members list)"},
                            "split":    {"type": "string",  "enum": ["equal", "custom"], "description": "How to split"},
                            "shares":   {"type": "object",  "description": "For custom split: {member: amount}"},
                            "emoji":    {"type": "string",  "description": "Emoji for this expense e.g. ✈️"},
                        },
                        "required": ["name", "amount", "paid_by"],
                    },
                    "description": "List of expenses",
                },
                "currency": {"type": "string", "description": "Currency code e.g. INR"},
            },
            "required": ["members", "expenses"],
        },
    },
    {
        "name": "calculate_trip_budget",
        "description": (
            "Calculate total trip cost and show an itemized budget breakdown. "
            "Call this after the user has flight + hotel information, or when they ask about total cost, budget, or how much the trip will cost. "
            "Extract costs from the conversation: flight price, hotel price per night, number of nights, and estimate daily meals and activities."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "destination":          {"type": "string", "description": "Destination city/country"},
                "from_city":            {"type": "string", "description": "Origin city"},
                "currency":             {"type": "string", "description": "Currency code, e.g. INR. Default INR."},
                "flight_cost":          {"type": "number", "description": "Total flight cost (one-way or return) in the given currency"},
                "hotel_cost_per_night": {"type": "number", "description": "Hotel cost per night"},
                "nights":               {"type": "integer", "description": "Number of nights"},
                "daily_meal_budget":    {"type": "number", "description": "Estimated daily food/meal budget"},
                "days":                 {"type": "integer", "description": "Number of days"},
                "activities_budget":    {"type": "number", "description": "Estimated total activities/sightseeing budget. 0 if unknown."},
                "misc_budget":          {"type": "number", "description": "Misc (transport, shopping, tips). 0 if unknown."},
                "num_people":           {"type": "integer", "description": "Number of travellers. Default 1."},
            },
            "required": ["destination", "flight_cost", "hotel_cost_per_night", "nights", "daily_meal_budget", "days"],
        },
    },
    {
        "name": "get_trip_timeline",
        "description": (
            "Assemble a complete trip timeline combining flights, hotel check-in/out, and daily activities. "
            "Call after the user has confirmed flights, hotel, and wants to see the full trip overview. "
            "Populate all known fields from the conversation."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "destination": {"type": "string"},
                "outbound_flight": {
                    "type": "object",
                    "description": "Outbound flight details",
                    "properties": {
                        "flight_number": {"type": "string"},
                        "departure_airport": {"type": "string"},
                        "arrival_airport": {"type": "string"},
                        "departure_datetime": {"type": "string", "description": "ISO datetime or 'YYYY-MM-DD HH:MM'"},
                        "arrival_datetime": {"type": "string"},
                        "airline": {"type": "string"},
                    }
                },
                "return_flight": {
                    "type": "object",
                    "description": "Return flight (optional)",
                    "properties": {
                        "flight_number": {"type": "string"},
                        "departure_airport": {"type": "string"},
                        "arrival_airport": {"type": "string"},
                        "departure_datetime": {"type": "string"},
                        "arrival_datetime": {"type": "string"},
                        "airline": {"type": "string"},
                    }
                },
                "hotel": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "location": {"type": "string"},
                        "check_in_date": {"type": "string", "description": "YYYY-MM-DD"},
                        "check_out_date": {"type": "string", "description": "YYYY-MM-DD"},
                    }
                },
                "itinerary_days": {
                    "type": "array",
                    "description": "Array of days from the itinerary",
                    "items": {
                        "type": "object",
                        "properties": {
                            "day": {"type": "integer"},
                            "date": {"type": "string"},
                            "theme": {"type": "string"},
                            "highlight": {"type": "string", "description": "Single most exciting activity of the day"},
                        }
                    }
                },
            },
            "required": ["destination"],
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

    if name == "search_round_trip":
        try:
            result = await search_round_trip(
                origin=tool_input.get("origin", ""),
                destination=tool_input.get("destination", ""),
                departure_date=tool_input.get("departure_date", ""),
                return_date=tool_input.get("return_date", ""),
                adults=int(tool_input.get("adults", 1)),
                cabin_class=tool_input.get("cabin_class", "economy"),
                max_results=int(tool_input.get("max_results", 5)),
                currency=tool_input.get("currency", "INR"),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "outbound": None, "return_flight": None})

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

    # ── Weather ──
    if name == "get_weather":
        try:
            from services.serpapi_weather import get_weather
            result = await get_weather(location=tool_input.get("location", ""))
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "location": tool_input.get("location", ""), "temp_c": 0, "forecast": []})

    # ── Visa requirements ──
    if name == "get_visa_requirements":
        try:
            from services.visa import get_visa_requirements
            result = await get_visa_requirements(
                passport_country=tool_input.get("passport_country", ""),
                destination_country=tool_input.get("destination_country", ""),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "visa_type": "unknown", "label": "Unknown", "notes": []})

    # ── Destination guide ──
    if name == "get_destination_guide":
        from services.destination_guide import get_destination_guide
        result = await get_destination_guide(
            destination=tool_input.get("destination", ""),
            duration_days=tool_input.get("duration_days", 5),
            interests=tool_input.get("interests"),
        )
        return json.dumps(result)

    # ── Currency conversion ──
    if name == "convert_currency":
        try:
            from services.currency import get_exchange_rates
            result = await get_exchange_rates(
                base_currency=tool_input.get("from_currency", "USD"),
                amount=float(tool_input.get("amount", 1.0)),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({
                "error": str(e),
                "base_currency": tool_input.get("from_currency", ""),
                "amount": tool_input.get("amount", 1.0),
                "rates": [],
            })

    # ── Itinerary ──
    if name == "get_itinerary":
        from services.itinerary import get_itinerary
        result = await get_itinerary(
            destination=tool_input.get("destination", ""),
            start_date=tool_input.get("start_date", ""),
            end_date=tool_input.get("end_date", ""),
            interests=tool_input.get("interests"),
            hotel_area=tool_input.get("hotel_area", ""),
        )
        return json.dumps(result)

    # ── Packing list ──
    if name == "get_packing_list":
        from services.packing_list import get_packing_list
        result = await get_packing_list(
            destination=tool_input.get("destination", ""),
            duration_days=tool_input.get("duration_days", 7),
            trip_type=tool_input.get("trip_type", "leisure"),
            weather=tool_input.get("weather", "warm"),
            activities=tool_input.get("activities"),
        )
        return json.dumps(result)

    # ── Price prediction ──
    if name == "predict_flight_price":
        from services.price_prediction import predict_flight_price
        try:
            result = await predict_flight_price(
                origin=tool_input.get("origin", ""),
                destination=tool_input.get("destination", ""),
                departure_date=tool_input.get("departure_date", ""),
                price=float(tool_input.get("price", 0)),
                currency=tool_input.get("currency", "INR"),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e)})

    # ── Flight status ──
    if name == "get_flight_status":
        try:
            result = await get_flight_status(
                flight_number=tool_input.get("flight_number", ""),
                departure_date=tool_input.get("departure_date", ""),
            )
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "flight_number": tool_input.get("flight_number", ""), "status": "Unknown"})

    # ── Airport transit ──
    if name == "get_airport_transit":
        from services.airport_transit import get_airport_transit
        result = await get_airport_transit(
            airport_iata=tool_input.get("airport_iata", ""),
            airport_name=tool_input.get("airport_name", ""),
            hotel_area=tool_input.get("hotel_area", ""),
            currency=tool_input.get("currency", "INR"),
        )
        return json.dumps(result)

    # ── Phrasebook ──
    if name == "get_phrasebook":
        from services.phrasebook import get_phrasebook
        result = await get_phrasebook(
            destination=tool_input.get("destination", ""),
            language=tool_input.get("language", ""),
        )
        return json.dumps(result)

    # ── Travel insurance ──
    if name == "get_travel_insurance":
        from services.travel_insurance import get_travel_insurance
        result = await get_travel_insurance(
            destination=tool_input.get("destination", ""),
            duration_days=tool_input.get("duration_days", 7),
            trip_cost=float(tool_input.get("trip_cost", 0)),
            activities=tool_input.get("activities"),
            currency=tool_input.get("currency", "INR"),
        )
        return json.dumps(result)

    # ── Group expense splitter ──
    if name == "split_group_expenses":
        import json as _json
        members  = tool_input.get("members", [])
        expenses = tool_input.get("expenses", [])
        currency = tool_input.get("currency", "INR")
        n = len(members)

        # Track net balance per person (positive = owed money, negative = owes money)
        balances = {m: 0.0 for m in members}
        expense_rows = []

        for exp in expenses:
            amount   = float(exp.get("amount", 0))
            paid_by  = exp.get("paid_by", "")
            split    = exp.get("split", "equal")
            shares   = exp.get("shares", {})

            if split == "custom" and shares:
                per_person = shares
            else:
                each = amount / n if n else 0
                per_person = {m: each for m in members}

            # payer gets credit for full amount
            if paid_by in balances:
                balances[paid_by] += amount
            # each member owes their share
            for m, share in per_person.items():
                if m in balances:
                    balances[m] -= share

            expense_rows.append({
                "name":       exp.get("name", ""),
                "emoji":      exp.get("emoji", "💰"),
                "amount":     amount,
                "paid_by":    paid_by,
                "per_person": per_person,
            })

        # Compute settlements (who pays whom) using greedy algorithm
        pos = [(m, b) for m, b in balances.items() if b > 0.01]   # creditors
        neg = [(m, -b) for m, b in balances.items() if b < -0.01] # debtors
        pos.sort(key=lambda x: -x[1])
        neg.sort(key=lambda x: -x[1])

        settlements = []
        i, j = 0, 0
        while i < len(pos) and j < len(neg):
            creditor, credit = pos[i]
            debtor,   debt   = neg[j]
            amount = min(credit, debt)
            settlements.append({"from": debtor, "to": creditor, "amount": round(amount, 2)})
            pos[i] = (creditor, credit - amount)
            neg[j] = (debtor,   debt   - amount)
            if pos[i][1] < 0.01: i += 1
            if neg[j][1] < 0.01: j += 1

        total = sum(e["amount"] for e in expenses)

        result = {
            "members":          members,
            "currency":         currency,
            "total":            round(total, 2),
            "per_person_total": round(total / n, 2) if n else 0,
            "expenses":         expense_rows,
            "balances":         {m: round(b, 2) for m, b in balances.items()},
            "settlements":      settlements,
        }
        return _json.dumps(result)

    # ── Trip budget ──
    if name == "calculate_trip_budget":
        try:
            dest        = tool_input.get("destination", "")
            from_city   = tool_input.get("from_city", "")
            currency    = tool_input.get("currency", "INR")
            flight      = float(tool_input.get("flight_cost", 0))
            hotel_ppn   = float(tool_input.get("hotel_cost_per_night", 0))
            nights      = int(tool_input.get("nights", 0))
            meal_pd     = float(tool_input.get("daily_meal_budget", 0))
            days        = int(tool_input.get("days", nights))
            activities  = float(tool_input.get("activities_budget", 0))
            misc        = float(tool_input.get("misc_budget", 0))
            num_people  = int(tool_input.get("num_people", 1))

            hotel_total  = hotel_ppn * nights
            meal_total   = meal_pd * days
            grand_total  = flight + hotel_total + meal_total + activities + misc

            items = []
            if flight      > 0: items.append({"label": f"Flights {'(return) ' if from_city else ''}","icon": "✈️", "amount": flight,       "detail": f"{'Return ' if from_city else ''}flight cost"})
            if hotel_total > 0: items.append({"label": "Hotel",     "icon": "🏨", "amount": hotel_total,  "detail": f"{nights} night{'s' if nights!=1 else ''} × {currency} {hotel_ppn:,.0f}"})
            if meal_total  > 0: items.append({"label": "Meals",     "icon": "🍽️", "amount": meal_total,   "detail": f"{days} day{'s' if days!=1 else ''} × {currency} {meal_pd:,.0f}/day"})
            if activities  > 0: items.append({"label": "Activities","icon": "🎯", "amount": activities,   "detail": "Sightseeing & experiences"})
            if misc        > 0: items.append({"label": "Misc",      "icon": "🛍️", "amount": misc,         "detail": "Transport, shopping, tips"})

            result = {
                "destination":   dest,
                "from_city":     from_city,
                "currency":      currency,
                "items":         items,
                "total":         grand_total,
                "per_person":    grand_total / max(num_people, 1),
                "num_people":    num_people,
                "nights":        nights,
                "days":          days,
            }
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e), "items": [], "total": 0})

    # ── Trip timeline ──
    if name == "get_trip_timeline":
        import json as _json
        timeline = {
            "destination": tool_input.get("destination", ""),
            "outbound_flight": tool_input.get("outbound_flight"),
            "return_flight": tool_input.get("return_flight"),
            "hotel": tool_input.get("hotel"),
            "itinerary_days": tool_input.get("itinerary_days", []),
        }
        return _json.dumps(timeline)

    return json.dumps({"error": f"Unknown tool: {name}"})


# ── UI spinner labels ──────────────────────────────────────────────────────────

def _tool_label(name: str, tool_input: dict) -> str:
    orig = tool_input.get("origin", "")
    dest = tool_input.get("destination", "")
    date = tool_input.get("departure_date") or tool_input.get("date", "")
    loc  = tool_input.get("location", "")

    if name == "search_flights":
        return f"Searching flights {orig} → {dest} on {date}…"
    if name == "search_round_trip":
        dep  = tool_input.get("departure_date", "")
        ret  = tool_input.get("return_date", "")
        return f"Searching round-trip {orig} ↔ {dest} ({dep} / {ret})…"
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
    if name == "get_weather":
        return f"Checking weather in {loc}…"
    if name == "get_visa_requirements":
        p = tool_input.get("passport_country", "")
        d = tool_input.get("destination_country", "")
        return f"Checking visa requirements for {p} → {d}…"
    if name == "get_destination_guide":
        return f"Generating destination guide for {tool_input.get('destination', '')}…"
    if name == "convert_currency":
        return f"Converting {tool_input.get('amount', '')} {tool_input.get('from_currency', '')}…"
    if name == "predict_flight_price":
        return f"Analysing price for {tool_input.get('origin','')} → {tool_input.get('destination','')}…"
    if name == "calculate_trip_budget":
        return f"Calculating trip budget for {tool_input.get('destination', '')}…"
    if name == "get_itinerary":
        return f"Building {tool_input.get('destination', '')} itinerary…"
    if name == "get_packing_list":
        return f"Building packing list for {tool_input.get('destination', '')}…"
    if name == "get_flight_status":
        fn = tool_input.get("flight_number", "")
        return f"Checking status for {fn}…"
    if name == "get_airport_transit":
        airport_iata = tool_input.get("airport_iata", "")
        return f"Finding transit options from {airport_iata}…"
    if name == "get_phrasebook":
        destination = tool_input.get("destination", "")
        return f"Building {destination} phrasebook…"
    if name == "get_travel_insurance":
        destination = tool_input.get("destination", "")
        return f"Checking insurance for {destination}…"
    if name == "get_trip_timeline":
        return f"Building trip timeline for {tool_input.get('destination', '')}…"
    if name == "split_group_expenses":
        return "Splitting group expenses…"
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
                elif block.name == "search_round_trip":
                    try:
                        rd = json.loads(result_str)
                        if rd.get("outbound") or rd.get("return_flight"):
                            yield {"type": "round_trip_results", "data": rd}
                    except Exception:
                        pass
                elif block.name == "get_weather":
                    try:
                        wd = json.loads(result_str)
                        if not wd.get("error") and wd.get("temp_c") is not None:
                            yield {"type": "weather_results", "data": wd}
                    except Exception:
                        pass
                elif block.name == "get_visa_requirements":
                    try:
                        vd = json.loads(result_str)
                        if not vd.get("error"):
                            yield {"type": "visa_results", "data": vd}
                    except Exception:
                        pass
                elif block.name == "get_destination_guide":
                    try:
                        gd = json.loads(result_str)
                        if not gd.get("error") and gd.get("top_attractions"):
                            yield {"type": "guide_results", "data": gd}
                    except Exception:
                        pass
                elif block.name == "convert_currency":
                    try:
                        cd = json.loads(result_str)
                        if not cd.get("error") and cd.get("rates"):
                            yield {"type": "currency_results", "data": cd}
                    except Exception:
                        pass
                elif block.name == "calculate_trip_budget":
                    try:
                        bd = json.loads(result_str)
                        if not bd.get("error") and bd.get("total", 0) > 0:
                            yield {"type": "budget_results", "data": bd}
                    except Exception:
                        pass
                elif block.name == "predict_flight_price":
                    try:
                        pd_ = json.loads(result_str)
                        if not pd_.get("error"):
                            yield {"type": "prediction_results", "data": pd_}
                    except Exception:
                        pass
                elif block.name == "get_itinerary":
                    try:
                        it = json.loads(result_str)
                        if not it.get("error") and it.get("days"):
                            yield {"type": "itinerary_results", "data": it}
                    except Exception:
                        pass
                elif block.name == "get_packing_list":
                    try:
                        pl = json.loads(result_str)
                        if not pl.get("error") and pl.get("categories"):
                            yield {"type": "packing_results", "data": pl}
                    except Exception:
                        pass
                elif block.name == "get_flight_status":
                    try:
                        fsd = json.loads(result_str)
                        if not fsd.get("error") and fsd.get("flight_number"):
                            yield {"type": "flight_status_results", "data": fsd}
                    except Exception:
                        pass
                elif block.name == "get_airport_transit":
                    try:
                        td = json.loads(result_str)
                        yield {"type": "transit_results", "data": td}
                    except Exception:
                        pass
                elif block.name == "get_phrasebook":
                    try:
                        pb = json.loads(result_str)
                        yield {"type": "phrasebook_results", "data": pb}
                    except Exception:
                        pass
                elif block.name == "get_travel_insurance":
                    try:
                        ins = json.loads(result_str)
                        if not ins.get("error") or ins.get("coverage_types"):
                            yield {"type": "insurance_results", "data": ins}
                    except Exception:
                        pass
                elif block.name == "get_trip_timeline":
                    try:
                        tl = json.loads(result_str)
                        if tl.get("destination"):
                            yield {"type": "timeline_results", "data": tl}
                    except Exception:
                        pass
                elif block.name == "split_group_expenses":
                    try:
                        split = json.loads(result_str)
                        if split.get("members"):
                            yield {"type": "split_results", "data": split}
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
