"""Agent-side enquiry inbox."""
import logging
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AgentProfile, Enquiry, _now
from routers.agent_auth import require_agent

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent/enquiries")


def _enq_to_dict(e: Enquiry) -> dict:
    return {
        "id":             e.id,
        "listing_type":   e.listing_type,
        "listing_id":     e.listing_id,
        "listing_title":  e.listing_title,
        "enquirer_name":  e.enquirer_name,
        "enquirer_email": e.enquirer_email,
        "enquirer_phone": e.enquirer_phone,
        "travel_date":    e.travel_date,
        "num_travelers":  e.num_travelers,
        "message":        e.message,
        "is_read":        e.is_read,
        "created_at":     e.created_at.isoformat() if e.created_at else None,
    }


@router.get("")
async def list_enquiries(
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Enquiry)
        .where(Enquiry.agent_email == profile.user_email)
        .order_by(Enquiry.created_at.desc())
    )).scalars().all()
    return [_enq_to_dict(r) for r in rows]


@router.patch("/{enquiry_id}/read")
async def mark_read(
    enquiry_id: int,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    enq = (await db.execute(
        select(Enquiry).where(Enquiry.id == enquiry_id, Enquiry.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if enq:
        enq.is_read = True
        await db.commit()
    return {"ok": True}
