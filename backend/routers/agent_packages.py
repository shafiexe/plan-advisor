"""
Tour package CRUD + AI-assisted draft generation.
All endpoints require an active agent profile (ownership enforced per agent_email).
"""
import logging
import os
import re
import uuid
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AgentProfile, TourPackage, _now, make_slug
from routers.agent_auth import require_agent

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent/packages")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PackageBody(BaseModel):
    title:               str
    category:            str = ""
    destinations:        list[str] = []
    duration_days:       int = 1
    duration_nights:     int = 0
    itinerary:           list[dict] = []
    highlights:          list[str] = []
    inclusions:          list[str] = []
    exclusions:          list[str] = []
    what_to_carry:       list[str] = []
    cancellation_policy: str = ""
    price_per_person:    int = 0
    price_couple:        int | None = None
    price_child:         int | None = None
    group_min:           int | None = None
    group_max:           int | None = None
    available_dates:     list[str] = []
    difficulty:          str = "easy"
    age_min:             int | None = None
    age_max:             int | None = None
    images:              list[str] = []
    booking_phone:       str = ""
    booking_whatsapp:    str = ""
    booking_email:       str = ""
    is_public:           bool = False
    status:              str = "draft"


class AIDraftBody(BaseModel):
    brief:    str
    category: str = ""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pkg_to_dict(p: TourPackage) -> dict:
    return {
        "id":                  p.id,
        "title":               p.title,
        "slug":                p.slug,
        "category":            p.category,
        "destinations":        p.destinations or [],
        "duration_days":       p.duration_days,
        "duration_nights":     p.duration_nights,
        "itinerary":           p.itinerary or [],
        "highlights":          p.highlights or [],
        "inclusions":          p.inclusions or [],
        "exclusions":          p.exclusions or [],
        "what_to_carry":       p.what_to_carry or [],
        "cancellation_policy": p.cancellation_policy,
        "price_per_person":    p.price_per_person,
        "price_couple":        p.price_couple,
        "price_child":         p.price_child,
        "group_min":           p.group_min,
        "group_max":           p.group_max,
        "available_dates":     p.available_dates or [],
        "difficulty":          p.difficulty,
        "age_min":             p.age_min,
        "age_max":             p.age_max,
        "images":              p.images or [],
        "booking_phone":       p.booking_phone,
        "booking_whatsapp":    p.booking_whatsapp,
        "booking_email":       p.booking_email,
        "is_public":           p.is_public,
        "status":              p.status,
        "views_count":         p.views_count,
        "enquiries_count":     p.enquiries_count,
        "created_at":          p.created_at.isoformat() if p.created_at else None,
        "updated_at":          p.updated_at.isoformat() if p.updated_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/ai-draft")
async def ai_draft(
    body: AIDraftBody,
    profile: AgentProfile = Depends(require_agent),
):
    """Generate a full package draft from a short brief using Claude."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.AsyncAnthropic(api_key=api_key)
    model  = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

    system = """You are a travel package content writer for Indian travel agents.
Given a short brief, produce a COMPLETE tour package JSON with ALL fields filled in.
The agent will review and edit before publishing — so give realistic, detailed values.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.

Output EXACTLY this structure (all fields required):
{
  "title": "Catchy package name with destination + duration, e.g. '3-Day Ooty Hill Station Escape'",
  "category": "one of: adventure, family, honeymoon, pilgrimage, beach, cultural, wildlife, budget, trekking, corporate",
  "difficulty": "one of: easy, moderate, challenging",
  "destinations": ["Primary City", "Secondary City"],
  "duration_days": 3,
  "duration_nights": 2,
  "highlights": [
    "Highlight 1 — specific and enticing",
    "Highlight 2",
    "Highlight 3",
    "Highlight 4",
    "Highlight 5"
  ],
  "itinerary": [
    {
      "day": 1,
      "title": "Arrival & City Orientation",
      "activities": [
        "Pickup from railway station / airport",
        "Check-in to hotel",
        "Visit [specific landmark]",
        "Welcome dinner at local restaurant"
      ]
    }
  ],
  "inclusions": [
    "Accommodation (twin sharing) in 3-star hotel",
    "Daily breakfast and dinner",
    "All transfers by private AC vehicle",
    "Professional English-speaking guide",
    "All sightseeing as per itinerary",
    "Applicable taxes"
  ],
  "exclusions": [
    "Airfare / train tickets",
    "Lunch and beverages",
    "Camera / video fees at monuments",
    "Personal expenses and tips",
    "Travel insurance",
    "Any activity not mentioned in inclusions"
  ],
  "what_to_carry": [
    "Valid government ID proof",
    "Comfortable walking shoes",
    "Light jacket / woolens (if hill station)",
    "Sunscreen and sunglasses",
    "Personal medicines"
  ],
  "cancellation_policy": "100% refund for cancellations 15+ days before departure. 50% refund for 7-14 days. No refund within 7 days of departure. No-shows are non-refundable.",
  "price_per_person": 8500,
  "price_couple": 15000,
  "price_child": 5000,
  "group_min": 2,
  "group_max": 20,
  "age_min": 5,
  "age_max": 70
}

Guidelines:
- Use Indian Rupees (₹) for pricing. price_couple ≈ 1.8× price_per_person. price_child ≈ 0.6× price_per_person.
- Infer category and difficulty from the brief (pilgrimage → pilgrimage; ooty/hills → adventure or family; beach → beach; etc.)
- Itinerary must have exactly duration_days entries, one per day
- Each day should have 4-6 specific, realistic activities for that destination
- Inclusions and exclusions should be 6-8 items each
- Price must be realistic for the destination and duration (budget ₹3k-6k, mid-range ₹7k-15k, luxury ₹15k+/person)
"""

    prompt = f"Brief: {body.brief}\n\nGenerate the complete package JSON. Every field must be filled."

    try:
        response = await client.messages.create(
            model=model,
            max_tokens=2000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        text = response.content[0].text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = re.sub(r'^```[a-z]*\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        draft = json.loads(text)
        return {"ok": True, "draft": draft}
    except Exception as e:
        log.error("AI draft generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("", status_code=201)
async def create_package(
    body: PackageBody,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    suffix = str(uuid.uuid4())[:6]
    slug = make_slug(body.title, suffix)

    pkg = TourPackage(
        agent_email=profile.user_email,
        slug=slug,
        **{k: v for k, v in body.model_dump().items()},
    )
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return _pkg_to_dict(pkg)


@router.get("")
async def list_packages(
    status: str | None = None,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    q = select(TourPackage).where(TourPackage.agent_email == profile.user_email)
    if status:
        q = q.where(TourPackage.status == status)
    else:
        q = q.where(TourPackage.status != "archived")
    q = q.order_by(TourPackage.updated_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [_pkg_to_dict(r) for r in rows]


@router.get("/{pkg_id}")
async def get_package(
    pkg_id: int,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    pkg = (await db.execute(
        select(TourPackage).where(TourPackage.id == pkg_id, TourPackage.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    return _pkg_to_dict(pkg)


@router.put("/{pkg_id}")
async def update_package(
    pkg_id: int,
    body: PackageBody,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    pkg = (await db.execute(
        select(TourPackage).where(TourPackage.id == pkg_id, TourPackage.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    for field, val in body.model_dump().items():
        setattr(pkg, field, val)
    pkg.updated_at = _now()
    await db.commit()
    await db.refresh(pkg)
    return _pkg_to_dict(pkg)


@router.patch("/{pkg_id}/toggle")
async def toggle_public(
    pkg_id: int,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    pkg = (await db.execute(
        select(TourPackage).where(TourPackage.id == pkg_id, TourPackage.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    pkg.is_public = not pkg.is_public
    pkg.updated_at = _now()
    await db.commit()
    return {"ok": True, "is_public": pkg.is_public}


@router.patch("/{pkg_id}/status")
async def set_status(
    pkg_id: int,
    body: dict,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    valid = ("draft", "published", "archived")
    new_status = body.get("status", "")
    if new_status not in valid:
        raise HTTPException(status_code=422, detail=f"status must be one of {valid}")
    pkg = (await db.execute(
        select(TourPackage).where(TourPackage.id == pkg_id, TourPackage.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    pkg.status = new_status
    pkg.updated_at = _now()
    await db.commit()
    return {"ok": True, "status": pkg.status}


@router.delete("/{pkg_id}")
async def delete_package(
    pkg_id: int,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    pkg = (await db.execute(
        select(TourPackage).where(TourPackage.id == pkg_id, TourPackage.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    if pkg.status == "draft":
        await db.delete(pkg)
    else:
        pkg.status = "archived"
        pkg.updated_at = _now()
    await db.commit()
    return {"ok": True}
