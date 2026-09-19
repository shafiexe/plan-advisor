import json
import logging
import traceback
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Conversation, Passenger, PassengerProfile

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user")


# ── Auth ───────────────────────────────────────────────────────────────────────

async def current_user(x_user_email: str = Header(..., alias="X-User-Email")) -> str:
    if not x_user_email or "@" not in x_user_email:
        raise HTTPException(status_code=401, detail="Valid X-User-Email header required")
    return x_user_email.lower().strip()


def _now_ms(dt: datetime) -> int:
    return int(dt.replace(tzinfo=timezone.utc).timestamp() * 1000)


# ── Conversations ──────────────────────────────────────────────────────────────

class ConversationBody(BaseModel):
    title: str = ""
    messages: list = []
    pinned: bool = False


@router.get("/conversations")
async def list_conversations(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Conversation)
        .where(Conversation.user_email == email)
        .order_by(Conversation.updated_at.desc())
    )).scalars().all()

    return [
        {
            "id":        r.id,
            "title":     r.title,
            "messages":  json.loads(r.messages_json or "[]"),
            "pinned":    bool(r.pinned),
            "createdAt": _now_ms(r.created_at),
            "updatedAt": _now_ms(r.updated_at),
        }
        for r in rows
    ]


@router.put("/conversations/{conv_id}")
async def upsert_conversation(
    conv_id: str,
    body: ConversationBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        row = (await db.execute(
            select(Conversation).where(
                Conversation.id == conv_id,
                Conversation.user_email == email,
            )
        )).scalar_one_or_none()

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        _CARD_FIELDS = ("flightData", "calendarData", "hotelData", "restaurantData", "busData", "trainData")

        cleaned = []
        for m in body.messages:
            if not isinstance(m, dict):
                continue
            entry = {
                "id":        m.get("id", ""),
                "role":      m.get("role", "user"),
                "content":   m.get("content", ""),
                "timestamp": m.get("timestamp", 0),
            }
            for field in _CARD_FIELDS:
                if m.get(field):
                    entry[field] = m[field]
            cleaned.append(entry)

        msgs_json = json.dumps(cleaned)

        if row:
            row.title         = body.title
            row.messages_json = msgs_json
            row.pinned        = body.pinned
            row.updated_at    = now
        else:
            db.add(Conversation(
                id=conv_id, user_email=email,
                title=body.title, messages_json=msgs_json,
                pinned=body.pinned,
                created_at=now, updated_at=now,
            ))

        await db.commit()
        return {"ok": True}
    except Exception:
        log.error("upsert_conversation failed for conv_id=%s email=%s\n%s", conv_id, email, traceback.format_exc())
        raise


@router.post("/conversations/{conv_id}/share")
async def share_conversation(
    conv_id: str,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate (or return existing) a public share token for a conversation."""
    row = (await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_email == email,
        )
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not row.share_token:
        row.share_token = str(uuid.uuid4())
        await db.commit()
    return {"share_token": row.share_token}


@router.delete("/conversations/{conv_id}/share")
async def unshare_conversation(
    conv_id: str,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a conversation's public share link."""
    row = (await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_email == email,
        )
    )).scalar_one_or_none()
    if row:
        row.share_token = None
        await db.commit()
    return {"ok": True}


@router.get("/share/{token}", include_in_schema=True)
async def get_shared_conversation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no auth. Returns a shared conversation by token."""
    row = (await db.execute(
        select(Conversation).where(Conversation.share_token == token)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Share link not found or has been revoked")
    return {
        "title":    row.title,
        "messages": json.loads(row.messages_json or "[]"),
        "sharedAt": _now_ms(row.updated_at),
    }


@router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: str,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.user_email == email,
        )
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}


# ── Passenger profile ──────────────────────────────────────────────────────────

class ProfileBody(BaseModel):
    data: dict = {}


@router.get("/passenger-profile")
async def get_passenger_profile(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(PassengerProfile).where(PassengerProfile.user_email == email)
    )).scalar_one_or_none()
    return {"data": json.loads(row.data_json) if row else None}


@router.put("/passenger-profile")
async def save_passenger_profile(
    body: ProfileBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(PassengerProfile).where(PassengerProfile.user_email == email)
    )).scalar_one_or_none()

    data_json = json.dumps(body.data)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if row:
        row.data_json  = data_json
        row.updated_at = now
    else:
        db.add(PassengerProfile(user_email=email, data_json=data_json, updated_at=now))

    await db.commit()
    return {"ok": True}


# ── Passengers (multi-passenger per user) ──────────────────────────────────────

PASSENGER_FIELDS = [
    "label", "first_name", "last_name", "date_of_birth",
    "gender", "passport_number", "nationality", "expiry_date",
    "email", "phone",
]


class PassengerBody(BaseModel):
    label:           str = "Passenger"
    first_name:      str = ""
    last_name:       str = ""
    date_of_birth:   str = ""
    gender:          str = ""
    passport_number: str = ""
    nationality:     str = ""
    expiry_date:     str = ""
    email:           str = ""
    phone:           str = ""


def _row_to_dict(r: Passenger) -> dict:
    return {
        "id":             r.id,
        "label":          r.label,
        "first_name":     r.first_name,
        "last_name":      r.last_name,
        "date_of_birth":  r.date_of_birth,
        "gender":         r.gender,
        "passport_number": r.passport_number,
        "nationality":    r.nationality,
        "expiry_date":    r.expiry_date,
        "email":          r.email,
        "phone":          r.phone,
        "created_at":     _now_ms(r.created_at) if r.created_at else 0,
        "updated_at":     _now_ms(r.updated_at) if r.updated_at else 0,
    }


@router.get("/passengers")
async def list_passengers(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Passenger)
        .where(Passenger.user_email == email)
        .order_by(Passenger.created_at)
    )).scalars().all()
    return [_row_to_dict(r) for r in rows]


@router.post("/passengers")
async def create_passenger(
    body: PassengerBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upsert by (user_email, first_name, last_name) — case-insensitive.
    If a passenger with the same full name already exists, update their details
    instead of creating a duplicate. Returns the saved record with its id.
    """
    fn = body.first_name.strip().lower()
    ln = body.last_name.strip().lower()

    # Look for an existing passenger with the same name (case-insensitive)
    existing = (await db.execute(
        select(Passenger).where(
            Passenger.user_email == email,
            Passenger.first_name.ilike(fn),
            Passenger.last_name.ilike(ln),
        )
    )).scalar_one_or_none()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if existing:
        # Update in place — treat POST as upsert
        for field in PASSENGER_FIELDS:
            setattr(existing, field, getattr(body, field))
        existing.updated_at = now
        await db.commit()
        await db.refresh(existing)
        return _row_to_dict(existing)

    p = Passenger(user_email=email, created_at=now, updated_at=now, **body.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _row_to_dict(p)


@router.put("/passengers/{passenger_id}")
async def update_passenger(
    passenger_id: int,
    body: PassengerBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(Passenger).where(
            Passenger.id == passenger_id,
            Passenger.user_email == email,
        )
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Passenger not found")

    for field in PASSENGER_FIELDS:
        setattr(row, field, getattr(body, field))
    row.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await db.commit()
    await db.refresh(row)
    return _row_to_dict(row)


@router.delete("/passengers/{passenger_id}")
async def delete_passenger(
    passenger_id: int,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(Passenger).where(
            Passenger.id == passenger_id,
            Passenger.user_email == email,
        )
    )).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"ok": True}
