"""
Tour package CRUD + AI-assisted draft generation.
All endpoints require an active AgentProfile (checked via require_agent from agent_auth).
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
    model  = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")

    system = """You are a travel package content writer for Indian travel agents.
Given a short brief about a tour package, produce a complete, detailed JSON draft.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.

The JSON must have exactly these fields:
{
  "title": "Package name (catchy, includes destination + duration)",
  "highlights": ["Top highlight 1", "Top highlight 2", "...up to 6"],
  "itinerary": [
    {"day": 1, "title": "Day title", "activities": ["Activity 1", "Activity 2", "..."]},
    ...one object per day
  ],
  "inclusions": ["What's included item 1", "..."],
  "exclusions": ["What's NOT included 1", "..."],
  "what_to_carry": ["Packing item 1 with reason", "..."],
  "cancellation_policy": "Standard cancellation policy text",
  "price_estimate": 5000,
  "destinations": ["City1", "City2"],
  "duration_days": 3,
  "duration_nights": 2,
  "difficulty": "easy"
}

Use Indian context: rupees, Indian destinations, Indian food/transport preferences.
Write in a friendly, professional tone suitable for travelers booking through an agent.
"""

    category_note = f" Category: {body.category}." if body.category else ""
    prompt = f"Brief:{category_note} {body.brief}\n\nGenerate the full package JSON draft."

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
