"""Ticket CRUD. Status is computed at query time, not stored."""
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AgentProfile, Ticket, _now
from routers.agent_auth import require_agent

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent/tickets")


class TicketBody(BaseModel):
    title:           str
    ticket_type:     str             # group / individual
    mode:            str             # bus/train/flight/boat/cab
    origin:          str
    destination:     str
    travel_date:     str             # YYYY-MM-DD
    travel_time:     str = ""
    arrival_time:    str = ""
    return_date:     str = ""
    total_seats:     int = 1
    available_seats: int = 1
    price_per_seat:  int = 0
    original_price:  int | None = None
    booking_deadline:str = ""
    departure_point: str = ""
    pickup_points:   list[dict] = []
    amenities:       list[str] = []
    vehicle_details: dict = {}
    notes:           str = ""
    # Flight-specific
    airline_name:    str = ""
    flight_number:   str = ""
    travel_class:    str = "economy"
    is_nonstop:      bool = True
    layovers:        list[dict] = []
    contact_phone:   str = ""
    contact_whatsapp:str = ""
    contact_email:   str = ""
    is_public:       bool = False


def _compute_status(t: Ticket) -> str:
    try:
        td = date.fromisoformat(t.travel_date)
        if td < date.today():
            return "expired"
    except Exception:
        pass
    if t.available_seats <= 0:
        return "sold_out"
    if t.available_seats < 5:
        return "filling_fast"
    return "available"


def _ticket_to_dict(t: Ticket) -> dict:
    return {
        "id":              t.id,
        "title":           t.title,
        "ticket_type":     t.ticket_type,
        "mode":            t.mode,
        "origin":          t.origin,
        "destination":     t.destination,
        "travel_date":     t.travel_date,
        "travel_time":     t.travel_time,
        "arrival_time":    t.arrival_time or "",
        "return_date":     t.return_date,
        "total_seats":     t.total_seats,
        "available_seats": t.available_seats,
        "price_per_seat":  t.price_per_seat,
        "original_price":  t.original_price,
        "booking_deadline":t.booking_deadline,
        "departure_point": t.departure_point,
        "pickup_points":   t.pickup_points or [],
        "amenities":       t.amenities or [],
        "vehicle_details": t.vehicle_details or {},
        "notes":           t.notes,
        "airline_name":    t.airline_name or "",
        "flight_number":   t.flight_number or "",
        "travel_class":    t.travel_class or "economy",
        "is_nonstop":      t.is_nonstop if t.is_nonstop is not None else True,
        "layovers":        t.layovers or [],
        "contact_phone":   t.contact_phone,
        "contact_whatsapp":t.contact_whatsapp,
        "contact_email":   t.contact_email,
        "is_public":       t.is_public,
        "status":          _compute_status(t),
        "created_at":      t.created_at.isoformat() if t.created_at else None,
    }


@router.post("", status_code=201)
async def create_ticket(
    body: TicketBody,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    t = Ticket(agent_email=profile.user_email, **body.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _ticket_to_dict(t)


@router.get("")
async def list_tickets(
    upcoming: bool = False,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    q = select(Ticket).where(Ticket.agent_email == profile.user_email).order_by(Ticket.travel_date)
    rows = (await db.execute(q)).scalars().all()
    result = [_ticket_to_dict(r) for r in rows]
    if upcoming:
        today = date.today().isoformat()
        result = [r for r in result if r["travel_date"] >= today]
    return result


@router.put("/{ticket_id}")
async def update_ticket(
    ticket_id: int,
    body: TicketBody,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    for field, val in body.model_dump().items():
        setattr(t, field, val)
    t.updated_at = _now()
    await db.commit()
    return _ticket_to_dict(t)


@router.patch("/{ticket_id}/seats")
async def update_seats(
    ticket_id: int,
    body: dict,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    """body: {"sold": N} — deducts N from available_seats."""
    sold = int(body.get("sold", 0))
    t = (await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    t.available_seats = max(0, t.available_seats - sold)
    t.updated_at = _now()
    await db.commit()
    return {"ok": True, "available_seats": t.available_seats, "status": _compute_status(t)}


@router.patch("/{ticket_id}/toggle")
async def toggle_public(
    ticket_id: int,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    t.is_public = not t.is_public
    t.updated_at = _now()
    await db.commit()
    return {"ok": True, "is_public": t.is_public}


@router.delete("/expired")
async def delete_expired(
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    """Delete all expired tickets for this agent."""
    today = date.today().isoformat()
    rows = (await db.execute(
        select(Ticket).where(Ticket.agent_email == profile.user_email, Ticket.travel_date < today)
    )).scalars().all()
    for t in rows:
        await db.delete(t)
    await db.commit()
    return {"ok": True, "deleted": len(rows)}


@router.delete("/{ticket_id}")
async def delete_ticket(
    ticket_id: int,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.agent_email == profile.user_email)
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.delete(t)
    await db.commit()
    return {"ok": True}
