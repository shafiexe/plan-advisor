"""Saved trips endpoints.

User-facing CRUD for trip snapshots (full plan: flights, hotel, guide, budget, itinerary).
Protected by X-User-Email header — same pattern as alerts.py.
"""

import logging
import os
import secrets
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Any
from sqlalchemy import cast, or_, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Trip

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/trips", tags=["trips"])


# ── Auth helper ────────────────────────────────────────────────────────────────

async def current_user(x_user_email: str = Header(..., alias="X-User-Email")) -> str:
    if not x_user_email or "@" not in x_user_email:
        raise HTTPException(status_code=401, detail="Valid X-User-Email header required")
    return x_user_email.lower().strip()


# ── Schemas ────────────────────────────────────────────────────────────────────

class TripCreate(BaseModel):
    name: str
    destination: str = ""
    date_range: str = ""
    data: dict[str, Any]


class TripRename(BaseModel):
    name: str


class ShareEmailBody(BaseModel):
    to_email: str
    message: str = ""


class CollaboratorBody(BaseModel):
    email: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_trips(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all saved trips for the authenticated user (owned + shared), newest first."""
    rows = (await db.execute(
        select(Trip)
        .where(
            or_(
                Trip.user_email == email,
                # JSON array stored as text — email wrapped in quotes matches both
                # SQLite (JSON-as-text) and PostgreSQL (JSON serialized string)
                cast(Trip.collaborators, String).like(f'%"{email}"%'),
            )
        )
        .order_by(Trip.created_at.desc())
    )).scalars().all()
    return [
        {
            "id":            r.id,
            "name":          r.name,
            "destination":   r.destination,
            "date_range":    r.date_range,
            "share_token":   r.share_token,
            "collaborators": r.collaborators or [],
            "is_owner":      r.user_email == email,
            "created_at":    r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("", status_code=201)
async def create_trip(
    body: TripCreate,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a new trip snapshot for the authenticated user."""
    trip = Trip(
        user_email=email,
        name=body.name,
        destination=body.destination,
        date_range=body.date_range,
        data=body.data,
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return {
        "id":          trip.id,
        "name":        trip.name,
        "destination": trip.destination,
        "date_range":  trip.date_range,
        "created_at":  trip.created_at.isoformat() if trip.created_at else None,
    }


# ── Public shared-trip endpoint ────────────────────────────────────────────────
# IMPORTANT: must be defined BEFORE /{trip_id} to avoid FastAPI routing conflicts.

@router.get("/shared/{share_token}")
async def get_shared_trip(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — returns trip data for the share token (no auth required)."""
    trip = (await db.execute(
        select(Trip).where(Trip.share_token == share_token)
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or link expired")
    return {
        "id":          trip.id,
        "name":        trip.name,
        "destination": trip.destination,
        "date_range":  trip.date_range,
        "data":        trip.data,
        "created_at":  trip.created_at.isoformat() if trip.created_at else None,
    }


@router.get("/{trip_id}")
async def get_trip(
    trip_id: int,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single trip with full data payload. Accessible by owner or collaborators."""
    trip = (await db.execute(
        select(Trip).where(
            Trip.id == trip_id,
            or_(
                Trip.user_email == email,
                cast(Trip.collaborators, String).like(f'%"{email}"%'),
            ),
        )
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {
        "id":            trip.id,
        "name":          trip.name,
        "destination":   trip.destination,
        "date_range":    trip.date_range,
        "data":          trip.data,
        "share_token":   trip.share_token,
        "collaborators": trip.collaborators or [],
        "is_owner":      trip.user_email == email,
        "created_at":    trip.created_at.isoformat() if trip.created_at else None,
    }


@router.patch("/{trip_id}")
async def rename_trip(
    trip_id: int,
    body: TripRename,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a saved trip."""
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_email == email)
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.name = body.name
    await db.commit()
    return {"ok": True}


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: int,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a saved trip."""
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_email == email)
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    await db.delete(trip)
    await db.commit()


# ── Share / unshare endpoints ──────────────────────────────────────────────────

@router.post("/{trip_id}/share")
async def share_trip(
    trip_id: int,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate (or return existing) share token for a trip."""
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_email == email)
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if not trip.share_token:
        trip.share_token = secrets.token_urlsafe(16)
        await db.commit()
        await db.refresh(trip)
    return {
        "share_token": trip.share_token,
        "share_url": f"/trip/{trip.share_token}",
    }


@router.delete("/{trip_id}/share")
async def unshare_trip(
    trip_id: int,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke the share link for a trip."""
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_email == email)
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.share_token = None
    await db.commit()
    return {"ok": True}


# ── Email share endpoint ───────────────────────────────────────────────────────

@router.post("/{trip_id}/email")
async def email_trip(
    trip_id: int,
    body: ShareEmailBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send the trip plan to an email address."""
    trip = (await db.execute(
        select(Trip).where(
            Trip.id == trip_id,
            or_(
                Trip.user_email == email,
                cast(Trip.collaborators, String).like(f'%"{email}"%'),
            ),
        )
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Check SMTP config — same env vars as services/email.py
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_FROM_EMAIL", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        log.warning("SMTP not configured — skipping trip email to %s", body.to_email)
        raise HTTPException(status_code=503, detail="Email service not configured")

    subject = f"✈️ Trip Plan: {trip.name}"
    data = trip.data or {}

    # Build HTML sections
    sections: list[str] = []
    if data.get("flightData") or data.get("roundTripData"):
        sections.append("<h3 style='color:#4f46e5'>✈️ Flights</h3>"
                        "<p style='color:#475569'>Flight details saved in your trip plan.</p>")
    if data.get("hotelData"):
        sections.append("<h3 style='color:#4f46e5'>🏨 Hotel</h3>"
                        "<p style='color:#475569'>Hotel details saved in your trip plan.</p>")
    if data.get("itineraryData"):
        itin = data["itineraryData"]
        sections.append(
            f"<h3 style='color:#4f46e5'>🗓️ Itinerary — {itin.get('destination', '')}</h3>"
        )
        for day in (itin.get("days") or [])[:5]:
            sections.append(
                f"<h4 style='color:#334155;margin:12px 0 4px'>Day {day.get('day', '')} — {day.get('theme', '')}</h4>"
                "<ul style='margin:0;padding-left:18px;color:#475569'>"
            )
            for slot in (day.get("slots") or []):
                sections.append(
                    f"<li style='margin-bottom:4px'>"
                    f"<b>{slot.get('time', '')} {slot.get('activity', '')}</b>"
                    f"{' — ' + slot.get('location', '') if slot.get('location') else ''}</li>"
                )
            sections.append("</ul>")
    if data.get("budgetData"):
        bd = data["budgetData"]
        sections.append(
            f"<h3 style='color:#4f46e5'>💰 Budget</h3>"
            f"<p style='color:#475569'>Total: {bd.get('currency', '')} {bd.get('total', '')}</p>"
        )

    personal_msg = (
        f"<p style='color:#334155;font-style:italic;margin-bottom:16px'>{body.message}</p>"
        if body.message else ""
    )
    app_url = os.getenv("NEXTAUTH_URL", "http://localhost:3000")
    view_link = (
        f'<p style="margin-top:16px"><a href="{app_url}/trip/{trip.share_token}" '
        f'style="color:#4f46e5;font-weight:600">📎 View full trip plan online</a></p>'
        if trip.share_token else ""
    )

    html = f"""<html><body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:24px 28px">
    <h2 style="margin:0;font-size:20px">{trip.name}</h2>
    <p style="margin:6px 0 0;opacity:.85;font-size:14px">{trip.destination} · {trip.date_range}</p>
  </div>
  <div style="padding:24px 28px">
    {personal_msg}
    {"".join(sections)}
    {view_link}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
    <p style="color:#94a3b8;font-size:12px;text-align:center">Shared via Plan Advisor</p>
  </div>
</div>
</body></html>"""

    plain = (
        f"Trip: {trip.name}\n{trip.destination} · {trip.date_range}\n\n"
        f"{body.message}\n\n"
        f"{'View online: ' + app_url + '/trip/' + trip.share_token if trip.share_token else ''}"
        "\n\nShared via Plan Advisor"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Plan Advisor <{smtp_user}>"
    msg["To"] = body.to_email
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        import aiosmtplib
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            start_tls=True,
        )
        log.info("Trip share email sent to %s (trip_id=%d)", body.to_email, trip_id)
        return {"ok": True}
    except Exception as exc:
        log.error("Failed to send trip email to %s: %s", body.to_email, exc)
        raise HTTPException(status_code=502, detail="Failed to send email") from exc


# ── Collaborator endpoints ─────────────────────────────────────────────────────

@router.post("/{trip_id}/collaborators")
async def add_collaborator(
    trip_id: int,
    body: CollaboratorBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a collaborator email to a trip (owner only)."""
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_email == email)
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    collab_email = body.email.lower().strip()
    if collab_email == email:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a collaborator")
    collabs: list[str] = list(trip.collaborators or [])
    if collab_email not in collabs:
        collabs.append(collab_email)
        trip.collaborators = collabs
        await db.commit()
    return {"ok": True, "collaborators": trip.collaborators}


@router.delete("/{trip_id}/collaborators/{collab_email}")
async def remove_collaborator(
    trip_id: int,
    collab_email: str,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a collaborator from a trip (owner only)."""
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_email == email)
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.collaborators = [e for e in (trip.collaborators or []) if e != collab_email.lower().strip()]
    await db.commit()
    return {"ok": True, "collaborators": trip.collaborators}
