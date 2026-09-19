"""
Public explore endpoints — no authentication required.
Returns published/active listings visible to all travellers.
"""
import logging
from datetime import date

from fastapi import APIRouter, Query
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from database import get_db
from models import AgentProfile, TourPackage, Ticket, VisaService, Enquiry, _now

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/explore")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _agent_summary(a: AgentProfile | None) -> dict:
    if not a:
        return {}
    return {
        "id":      a.id,
        "slug":    _agent_slug(a),
        "name":    a.name,
        "type":    a.agent_type,
        "phone":   a.phone,
        "location": a.location,
        "logo_url": a.logo_url,
        "description": a.description,
        "specializations": a.specializations or [],
    }


def _ticket_status(t: Ticket) -> str:
    try:
        if date.fromisoformat(t.travel_date) < date.today():
            return "expired"
    except Exception:
        pass
    if t.available_seats <= 0:
        return "sold_out"
    if t.available_seats < 5:
        return "filling_fast"
    return "available"


def _agent_slug(a: AgentProfile) -> str:
    import re
    base = re.sub(r'[^a-z0-9]+', '-', a.name.lower()).strip('-')[:40]
    return f"{base}-{a.id}"


# ── Packages ──────────────────────────────────────────────────────────────────

@router.get("/packages")
async def list_packages(
    destination: str = Query(""),
    category:    str = Query(""),
    price_max:   int = Query(0),
    difficulty:  str = Query(""),
    page:        int = Query(1, ge=1),
    limit:       int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
):
    q = select(TourPackage).where(
        TourPackage.is_public == True,
        TourPackage.status == "published",
    )
    if destination:
        q = q.where(func.lower(func.json_extract(TourPackage.destinations, '$') if False else TourPackage.title).contains(destination.lower()))
    if category:
        q = q.where(TourPackage.category == category)
    if price_max > 0:
        q = q.where(TourPackage.price_per_person <= price_max)
    if difficulty:
        q = q.where(TourPackage.difficulty == difficulty)
    q = q.order_by(TourPackage.updated_at.desc()).offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(q)).scalars().all()

    result = []
    for r in rows:
        agent = (await db.execute(
            select(AgentProfile).where(AgentProfile.user_email == r.agent_email)
        )).scalar_one_or_none()
        result.append({
            "id":              r.id,
            "title":           r.title,
            "slug":            r.slug,
            "category":        r.category,
            "destinations":    r.destinations or [],
            "duration_days":   r.duration_days,
            "duration_nights": r.duration_nights,
            "price_per_person":r.price_per_person,
            "difficulty":      r.difficulty,
            "highlights":      (r.highlights or [])[:3],
            "images":          (r.images or [])[:1],
            "agent":           _agent_summary(agent),
        })
    return result


@router.get("/packages/{slug}")
async def get_package(slug: str, db: AsyncSession = Depends(get_db)):
    pkg = (await db.execute(
        select(TourPackage).where(
            TourPackage.slug == slug,
            TourPackage.is_public == True,
            TourPackage.status == "published",
        )
    )).scalar_one_or_none()
    if not pkg:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Package not found")

    # Increment view count
    pkg.views_count = (pkg.views_count or 0) + 1
    await db.commit()

    agent = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == pkg.agent_email)
    )).scalar_one_or_none()

    return {
        "id":                  pkg.id,
        "title":               pkg.title,
        "slug":                pkg.slug,
        "category":            pkg.category,
        "destinations":        pkg.destinations or [],
        "duration_days":       pkg.duration_days,
        "duration_nights":     pkg.duration_nights,
        "itinerary":           pkg.itinerary or [],
        "highlights":          pkg.highlights or [],
        "inclusions":          pkg.inclusions or [],
        "exclusions":          pkg.exclusions or [],
        "what_to_carry":       pkg.what_to_carry or [],
        "cancellation_policy": pkg.cancellation_policy,
        "price_per_person":    pkg.price_per_person,
        "price_couple":        pkg.price_couple,
        "price_child":         pkg.price_child,
        "group_min":           pkg.group_min,
        "group_max":           pkg.group_max,
        "available_dates":     pkg.available_dates or [],
        "difficulty":          pkg.difficulty,
        "age_min":             pkg.age_min,
        "age_max":             pkg.age_max,
        "images":              pkg.images or [],
        "booking_phone":       pkg.booking_phone,
        "booking_whatsapp":    pkg.booking_whatsapp,
        "booking_email":       pkg.booking_email,
        "views_count":         pkg.views_count,
        "agent":               _agent_summary(agent),
        "agent_email":         pkg.agent_email,
    }


# ── Tickets ───────────────────────────────────────────────────────────────────

@router.get("/tickets")
async def list_tickets(
    origin:      str = Query(""),
    destination: str = Query(""),
    travel_date: str = Query(""),
    mode:        str = Query(""),
    ticket_type: str = Query(""),
    page:        int = Query(1, ge=1),
    limit:       int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
):
    today = date.today().isoformat()
    q = select(Ticket).where(
        Ticket.is_public == True,
        Ticket.travel_date >= today,
    )
    if origin:
        q = q.where(Ticket.origin.ilike(f"%{origin}%"))
    if destination:
        q = q.where(Ticket.destination.ilike(f"%{destination}%"))
    if travel_date:
        q = q.where(Ticket.travel_date == travel_date)
    if mode:
        q = q.where(Ticket.mode == mode)
    if ticket_type:
        q = q.where(Ticket.ticket_type == ticket_type)
    q = q.order_by(Ticket.travel_date.asc()).offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(q)).scalars().all()

    result = []
    for r in rows:
        agent = (await db.execute(
            select(AgentProfile).where(AgentProfile.user_email == r.agent_email)
        )).scalar_one_or_none()
        result.append({
            "id":              r.id,
            "title":           r.title,
            "ticket_type":     r.ticket_type,
            "mode":            r.mode,
            "origin":          r.origin,
            "destination":     r.destination,
            "travel_date":     r.travel_date,
            "travel_time":     r.travel_time,
            "available_seats": r.available_seats,
            "total_seats":     r.total_seats,
            "price_per_seat":  r.price_per_seat,
            "status":          _ticket_status(r),
            "agent":           _agent_summary(agent),
        })
    return result


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: int, db: AsyncSession = Depends(get_db)):
    today = date.today().isoformat()
    t = (await db.execute(
        select(Ticket).where(
            Ticket.id == ticket_id,
            Ticket.is_public == True,
        )
    )).scalar_one_or_none()
    if not t:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ticket not found")

    agent = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == t.agent_email)
    )).scalar_one_or_none()

    return {
        "id":              t.id,
        "title":           t.title,
        "ticket_type":     t.ticket_type,
        "mode":            t.mode,
        "origin":          t.origin,
        "destination":     t.destination,
        "travel_date":     t.travel_date,
        "travel_time":     t.travel_time,
        "return_date":     t.return_date,
        "total_seats":     t.total_seats,
        "available_seats": t.available_seats,
        "price_per_seat":  t.price_per_seat,
        "booking_deadline":t.booking_deadline,
        "departure_point": t.departure_point,
        "pickup_points":   t.pickup_points or [],
        "amenities":       t.amenities or [],
        "vehicle_details": t.vehicle_details or {},
        "notes":           t.notes,
        "contact_phone":   t.contact_phone,
        "contact_whatsapp":t.contact_whatsapp,
        "contact_email":   t.contact_email,
        "status":          _ticket_status(t),
        "agent":           _agent_summary(agent),
        "agent_email":     t.agent_email,
    }


# ── Visa ──────────────────────────────────────────────────────────────────────

@router.get("/visa")
async def list_visa(
    country:   str = Query(""),
    visa_type: str = Query(""),
    page:      int = Query(1, ge=1),
    limit:     int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
):
    q = select(VisaService).where(
        VisaService.is_public == True,
        VisaService.status == "active",
    )
    if country:
        q = q.where(VisaService.destination_country.ilike(f"%{country}%"))
    if visa_type:
        q = q.where(VisaService.visa_type == visa_type)
    q = q.order_by(VisaService.created_at.desc()).offset((page - 1) * limit).limit(limit)
    rows = (await db.execute(q)).scalars().all()

    result = []
    for r in rows:
        agent = (await db.execute(
            select(AgentProfile).where(AgentProfile.user_email == r.agent_email)
        )).scalar_one_or_none()
        result.append({
            "id":                    r.id,
            "destination_country":   r.destination_country,
            "destination_country_code": r.destination_country_code,
            "visa_type":             r.visa_type,
            "title":                 r.title,
            "validity_label":        r.validity_label,
            "max_stay_days":         r.max_stay_days,
            "entry_type":            r.entry_type,
            "processing_time_min":   r.processing_time_min,
            "processing_time_max":   r.processing_time_max,
            "govt_fee_amount":       r.govt_fee_amount,
            "govt_fee_currency":     r.govt_fee_currency,
            "agent_service_fee":     r.agent_service_fee,
            "agent":                 _agent_summary(agent),
        })
    return result


@router.get("/visa/{visa_id}")
async def get_visa(visa_id: int, db: AsyncSession = Depends(get_db)):
    v = (await db.execute(
        select(VisaService).where(
            VisaService.id == visa_id,
            VisaService.is_public == True,
            VisaService.status == "active",
        )
    )).scalar_one_or_none()
    if not v:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Visa service not found")

    agent = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == v.agent_email)
    )).scalar_one_or_none()

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
        "agent":                    _agent_summary(agent),
        "agent_email":              v.agent_email,
    }


# ── Agents ────────────────────────────────────────────────────────────────────

@router.get("/agents")
async def list_agents(
    specialization: str = Query(""),
    location:       str = Query(""),
    agent_type:     str = Query(""),
    page:           int = Query(1, ge=1),
    limit:          int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
):
    q = select(AgentProfile).where(AgentProfile.is_active == True)
    if location:
        q = q.where(AgentProfile.location.ilike(f"%{location}%"))
    if agent_type:
        q = q.where(AgentProfile.agent_type == agent_type)
    q = q.order_by(AgentProfile.created_at.desc()).offset((page - 1) * limit).limit(limit)
    agents = (await db.execute(q)).scalars().all()

    result = []
    for a in agents:
        # Count public listings
        pkg_count = (await db.execute(
            select(func.count()).where(TourPackage.agent_email == a.user_email, TourPackage.is_public == True, TourPackage.status == "published")
        )).scalar() or 0
        tkt_count = (await db.execute(
            select(func.count()).where(Ticket.agent_email == a.user_email, Ticket.is_public == True, Ticket.travel_date >= date.today().isoformat())
        )).scalar() or 0
        vis_count = (await db.execute(
            select(func.count()).where(VisaService.agent_email == a.user_email, VisaService.is_public == True, VisaService.status == "active")
        )).scalar() or 0

        if specialization and specialization not in (a.specializations or []):
            continue

        result.append({
            "id":              a.id,
            "slug":            _agent_slug(a),
            "name":            a.name,
            "agent_type":      a.agent_type,
            "location":        a.location,
            "logo_url":        a.logo_url,
            "description":     a.description,
            "specializations": a.specializations or [],
            "languages":       a.languages or [],
            "package_count":   pkg_count,
            "ticket_count":    tkt_count,
            "visa_count":      vis_count,
        })
    return result


@router.get("/agents/{slug}")
async def get_agent(slug: str, db: AsyncSession = Depends(get_db)):
    # Slug format: {name-slug}-{id}
    try:
        agent_id = int(slug.rsplit("-", 1)[-1])
    except (ValueError, IndexError):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Agent not found")

    a = (await db.execute(
        select(AgentProfile).where(AgentProfile.id == agent_id, AgentProfile.is_active == True)
    )).scalar_one_or_none()
    if not a:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Agent not found")

    packages = (await db.execute(
        select(TourPackage).where(TourPackage.agent_email == a.user_email, TourPackage.is_public == True, TourPackage.status == "published")
        .order_by(TourPackage.updated_at.desc())
    )).scalars().all()

    tickets = (await db.execute(
        select(Ticket).where(Ticket.agent_email == a.user_email, Ticket.is_public == True, Ticket.travel_date >= date.today().isoformat())
        .order_by(Ticket.travel_date.asc())
    )).scalars().all()

    visa_services = (await db.execute(
        select(VisaService).where(VisaService.agent_email == a.user_email, VisaService.is_public == True, VisaService.status == "active")
    )).scalars().all()

    return {
        "id":              a.id,
        "slug":            _agent_slug(a),
        "name":            a.name,
        "agent_type":      a.agent_type,
        "phone":           a.phone,
        "location":        a.location,
        "website":         a.website,
        "logo_url":        a.logo_url,
        "description":     a.description,
        "specializations": a.specializations or [],
        "languages":       a.languages or [],
        "experience_years":a.experience_years or 0,
        "packages": [{
            "id": p.id, "title": p.title, "slug": p.slug,
            "destinations": p.destinations or [], "duration_days": p.duration_days,
            "price_per_person": p.price_per_person, "category": p.category,
            "images": (p.images or [])[:1],
        } for p in packages],
        "tickets": [{
            "id": t.id, "title": t.title, "origin": t.origin, "destination": t.destination,
            "travel_date": t.travel_date, "price_per_seat": t.price_per_seat,
            "available_seats": t.available_seats, "status": _ticket_status(t),
        } for t in tickets],
        "visa": [{
            "id": v.id, "destination_country": v.destination_country,
            "destination_country_code": v.destination_country_code,
            "visa_type": v.visa_type, "title": v.title,
            "processing_time_min": v.processing_time_min,
            "processing_time_max": v.processing_time_max,
            "govt_fee_amount": v.govt_fee_amount,
        } for v in visa_services],
    }


# ── Enquiries ─────────────────────────────────────────────────────────────────

from pydantic import BaseModel

class EnquiryBody(BaseModel):
    agent_email:    str
    listing_type:   str    # package / ticket / visa
    listing_id:     int
    listing_title:  str = ""
    enquirer_name:  str = ""
    enquirer_email: str = ""
    enquirer_phone: str = ""
    travel_date:    str = ""
    num_travelers:  int = 1
    message:        str = ""


@router.post("/enquiries", status_code=201)
async def submit_enquiry(body: EnquiryBody, db: AsyncSession = Depends(get_db)):
    if not body.enquirer_name or not body.enquirer_phone:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Name and phone are required")

    # Bump enquiry_count on the listing
    if body.listing_type == "package":
        pkg = (await db.execute(select(TourPackage).where(TourPackage.id == body.listing_id))).scalar_one_or_none()
        if pkg:
            pkg.enquiries_count = (pkg.enquiries_count or 0) + 1

    enq = Enquiry(**body.model_dump())
    db.add(enq)
    await db.commit()
    return {"ok": True, "message": "Enquiry submitted. The agent will contact you shortly."}
