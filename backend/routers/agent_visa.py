"""Visa service CRUD + AI fill for known country/type requirements."""
import logging
import os
import re

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AgentProfile, VisaService, _now
from routers.agent_auth import require_admin

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent/visa")


class VisaBody(BaseModel):
    destination_country:      str
    destination_country_code: str = ""
    visa_type:                str
    title:                    str
    validity_label:           str = ""
    max_stay_days:            int = 0
    entry_type:               str = "single"
    eligible_nationalities:   list[str] = []
    required_documents:       list[str] = []
    photo_specs:              dict = {}
    processing_time_min:      int = 1
    processing_time_max:      int = 7
    govt_fee_amount:          int = 0
    govt_fee_currency:        str = "INR"
    agent_service_fee:        int = 0
    application_method:       str = ""
    embassy_details:          dict = {}
    process_steps:            list[str] = []
    important_notes:          list[str] = []
    is_public:                bool = False
    status:                   str = "active"


class AIFillBody(BaseModel):
    country:   str
    visa_type: str


def _visa_to_dict(v: VisaService) -> dict:
    return {
        "id":                       v.id,
        "destination_country":      v.destination_country,
        "destination_country_code": v.destination_country_code,
        "visa_type":                v.visa_type,
        "title":                    v.title,
        "validity_label":           v.validity_label,
        "max_stay_days":            v.max_stay_days,
        "entry_type":               v.entry_type,
        "eligible_nationalities":   v.eligible_nationalities or [],
        "required_documents":       v.required_documents or [],
        "photo_specs":              v.photo_specs or {},
        "processing_time_min":      v.processing_time_min,
        "processing_time_max":      v.processing_time_max,
        "govt_fee_amount":          v.govt_fee_amount,
        "govt_fee_currency":        v.govt_fee_currency,
        "agent_service_fee":        v.agent_service_fee,
        "application_method":       v.application_method,
        "embassy_details":          v.embassy_details or {},
        "process_steps":            v.process_steps or [],
        "important_notes":          v.important_notes or [],
        "is_public":                v.is_public,
        "status":                   v.status,
        "created_at":               v.created_at.isoformat() if v.created_at else None,
    }


@router.post("/ai-fill")
async def ai_fill(
    body: AIFillBody,
    profile: AgentProfile = Depends(require_admin),
):
    """Fill visa requirements from Claude's knowledge of country/type pairs."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.AsyncAnthropic(api_key=api_key)
    model  = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")

    system = """You are a visa information expert. Given a destination country and visa type,
provide accurate visa requirements as JSON.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.

JSON structure:
{
  "title": "Country Visa Type — Duration",
  "validity_label": "30 days",
  "max_stay_days": 30,
  "entry_type": "single",
  "eligible_nationalities": ["Indian", "Pakistani", "Bangladeshi"],
  "required_documents": ["Passport (valid 6+ months)", "..."],
  "photo_specs": {"size": "35x45mm", "background": "white", "recency_months": 6},
  "processing_time_min": 3,
  "processing_time_max": 7,
  "govt_fee_amount": 6500,
  "govt_fee_currency": "INR",
  "application_method": "online",
  "process_steps": ["Step 1: ...", "Step 2: ..."],
  "important_notes": ["Important note 1", "..."],
  "destination_country_code": "AE"
}

Use INR for govt fees where possible (convert from USD/EUR at approximate rates).
Base answers on commonly known requirements for Indian passport holders unless specified otherwise.
"""

    try:
        response = await client.messages.create(
            model=model,
            max_tokens=1500,
            system=system,
            messages=[{"role": "user", "content": f"Country: {body.country}\nVisa Type: {body.visa_type}\n\nProvide the visa requirements JSON."}],
        )
        import json
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = re.sub(r'^```[a-z]*\n?', '', text)
            text = re.sub(r'\n?```$', '', text)
        data = json.loads(text)
        return {"ok": True, "data": data}
    except Exception as e:
        log.error("Visa AI fill failed: %s", e)
        raise HTTPException(status_code=500, detail=f"AI fill failed: {str(e)}")


@router.post("", status_code=201)
async def create_visa(
    body: VisaBody,
    profile: AgentProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    v = VisaService(agent_email=profile.user_email, **body.model_dump())
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return _visa_to_dict(v)


@router.get("")
async def list_visa(
    profile: AgentProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(VisaService)
        .where(VisaService.agent_email == profile.user_email)
        .order_by(VisaService.created_at.desc())
    )).scalars().all()
    return [_visa_to_dict(r) for r in rows]


@router.put("/{visa_id}")
async def update_visa(
    visa_id: int,
    body: VisaBody,
    profile: AgentProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    v = (await db.execute(
        select(VisaService).where(VisaService.id == visa_id, VisaService.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Visa service not found")
    for field, val in body.model_dump().items():
        setattr(v, field, val)
    v.updated_at = _now()
    await db.commit()
    return _visa_to_dict(v)


@router.patch("/{visa_id}/status")
async def set_status(
    visa_id: int,
    body: dict,
    profile: AgentProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    valid = ("active", "paused", "discontinued")
    new_status = body.get("status", "")
    if new_status not in valid:
        raise HTTPException(status_code=422, detail=f"status must be one of {valid}")
    v = (await db.execute(
        select(VisaService).where(VisaService.id == visa_id, VisaService.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Visa service not found")
    v.status = new_status
    v.updated_at = _now()
    await db.commit()
    return {"ok": True, "status": v.status}


@router.delete("/{visa_id}")
async def delete_visa(
    visa_id: int,
    profile: AgentProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    v = (await db.execute(
        select(VisaService).where(VisaService.id == visa_id, VisaService.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Visa service not found")
    await db.delete(v)
    await db.commit()
    return {"ok": True}
