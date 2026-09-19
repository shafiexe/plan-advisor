"""
Agent registration and profile management.
Registration flow:
  1. POST /api/agent/register  — create AgentProfile (linked to logged-in user email)
  2. POST /api/agent/phone-otp — send a 6-digit OTP to the given phone (logged to console in dev)
  3. POST /api/agent/verify-phone — verify OTP, mark phone_verified=True
  4. GET  /api/agent/check    — returns {is_agent, profile} for the current user
  5. GET  /api/agent/profile  — full profile
  6. PUT  /api/agent/profile  — update profile fields
"""
import hashlib
import logging
import os
import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AgentProfile, OTPRecord, _now

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent")


async def current_user(x_user_email: str = Header(..., alias="X-User-Email")) -> str:
    if not x_user_email or "@" not in x_user_email:
        raise HTTPException(status_code=401, detail="Valid X-User-Email header required")
    return x_user_email.lower().strip()


async def require_agent(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentProfile:
    """Dependency: ensures the current user has an active AgentProfile."""
    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email, AgentProfile.is_active == True)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=403, detail="Agent profile required. Please register as an agent first.")
    return profile


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class RegisterBody(BaseModel):
    agent_type:       str        # "agency" | "individual"
    name:             str
    phone:            str
    location:         str = ""
    website:          str = ""
    description:      str = ""
    logo_url:         str = ""
    specializations:  list[str] = []
    languages:        list[str] = []
    experience_years: int = 0
    agency_code:      str = ""


class UpdateProfileBody(BaseModel):
    name:             str = ""
    phone:            str = ""
    location:         str = ""
    website:          str = ""
    description:      str = ""
    logo_url:         str = ""
    specializations:  list[str] = []
    languages:        list[str] = []
    experience_years: int = 0
    agency_code:      str = ""


class PhoneOTPBody(BaseModel):
    phone: str


class VerifyPhoneBody(BaseModel):
    phone: str
    otp:   str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def _profile_to_dict(p: AgentProfile) -> dict:
    return {
        "id":               p.id,
        "user_email":       p.user_email,
        "agent_type":       p.agent_type,
        "name":             p.name,
        "phone":            p.phone,
        "phone_verified":   p.phone_verified,
        "location":         p.location,
        "website":          p.website,
        "description":      p.description,
        "logo_url":         p.logo_url,
        "specializations":  p.specializations or [],
        "languages":        p.languages or [],
        "experience_years": p.experience_years or 0,
        "agency_code":      p.agency_code or "",
        "is_active":        p.is_active,
        "created_at":       p.created_at.isoformat() if p.created_at else None,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register_agent(
    body: RegisterBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create an AgentProfile for the currently logged-in user."""
    existing = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Agent profile already exists for this account.")

    if body.agent_type not in ("agency", "individual"):
        raise HTTPException(status_code=422, detail="agent_type must be 'agency' or 'individual'")

    profile = AgentProfile(
        user_email=email,
        agent_type=body.agent_type,
        name=body.name.strip(),
        phone=body.phone.strip(),
        location=body.location,
        website=body.website,
        description=body.description,
        logo_url=body.logo_url,
        specializations=body.specializations,
        languages=body.languages,
        experience_years=body.experience_years,
        agency_code=body.agency_code,
        phone_verified=False,
        is_active=True,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"ok": True, "profile": _profile_to_dict(profile)}


@router.post("/phone-otp")
async def send_phone_otp(
    body: PhoneOTPBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and 'send' a 6-digit OTP. In dev it logs to console; set PHONE_OTP_PROVIDER=msg91 for real SMS."""
    otp = "".join(random.choices(string.digits, k=6))
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=5)

    # Invalidate any old OTPs for this phone
    old_otps = (await db.execute(
        select(OTPRecord).where(OTPRecord.phone == body.phone, OTPRecord.used == False)
    )).scalars().all()
    for old in old_otps:
        old.used = True

    db.add(OTPRecord(phone=body.phone, otp_hash=_hash_otp(otp), expires_at=expires_at))
    await db.commit()

    provider = os.getenv("PHONE_OTP_PROVIDER", "console")
    if provider == "console":
        log.info("📱 [DEV] Phone OTP for %s: %s (expires 5 min)", body.phone, otp)
    # Future: elif provider == "msg91": send via MSG91 API

    return {"ok": True, "message": "OTP sent", "dev_otp": otp if os.getenv("ENVIRONMENT", "dev") == "dev" else None}


@router.post("/verify-phone")
async def verify_phone(
    body: VerifyPhoneBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify the OTP and mark phone_verified=True on the AgentProfile."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    record = (await db.execute(
        select(OTPRecord).where(
            OTPRecord.phone == body.phone,
            OTPRecord.otp_hash == _hash_otp(body.otp),
            OTPRecord.used == False,
            OTPRecord.expires_at > now,
        )
    )).scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")

    record.used = True

    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email)
    )).scalar_one_or_none()
    if profile:
        profile.phone = body.phone
        profile.phone_verified = True

    await db.commit()
    return {"ok": True, "phone_verified": True}


@router.get("/check")
async def check_agent(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Quick check: is this user an agent? Returns {is_agent, profile}."""
    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email)
    )).scalar_one_or_none()
    return {
        "is_agent": profile is not None and profile.is_active,
        "profile":  _profile_to_dict(profile) if profile else None,
    }


@router.get("/profile")
async def get_profile(profile: AgentProfile = Depends(require_agent)):
    return _profile_to_dict(profile)


@router.put("/profile")
async def update_profile(
    body: UpdateProfileBody,
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    if body.name:        profile.name             = body.name.strip()
    if body.phone:       profile.phone            = body.phone.strip()
    if body.location is not None:    profile.location         = body.location
    if body.website is not None:     profile.website          = body.website
    if body.description is not None: profile.description      = body.description
    if body.logo_url is not None:    profile.logo_url         = body.logo_url
    profile.specializations  = body.specializations
    profile.languages         = body.languages
    profile.experience_years  = body.experience_years
    profile.agency_code       = body.agency_code
    profile.updated_at        = _now()
    await db.commit()
    await db.refresh(profile)
    return {"ok": True, "profile": _profile_to_dict(profile)}


@router.get("/dashboard/stats")
async def dashboard_stats(
    profile: AgentProfile = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    """Return counts for the agent dashboard."""
    from models import TourPackage, Ticket, VisaService, Enquiry
    from sqlalchemy import func

    packages = (await db.execute(
        select(func.count()).where(TourPackage.agent_email == profile.user_email, TourPackage.status != "archived")
    )).scalar() or 0

    published_packages = (await db.execute(
        select(func.count()).where(TourPackage.agent_email == profile.user_email, TourPackage.status == "published")
    )).scalar() or 0

    tickets = (await db.execute(
        select(func.count()).where(Ticket.agent_email == profile.user_email)
    )).scalar() or 0

    visa = (await db.execute(
        select(func.count()).where(VisaService.agent_email == profile.user_email, VisaService.status == "active")
    )).scalar() or 0

    # Recent packages (last 5)
    recent_pkgs = (await db.execute(
        select(TourPackage)
        .where(TourPackage.agent_email == profile.user_email)
        .order_by(TourPackage.updated_at.desc())
        .limit(5)
    )).scalars().all()

    return {
        "packages":           packages,
        "published_packages": published_packages,
        "tickets":            tickets,
        "visa":               visa,
        "enquiries":          (await db.execute(
            select(func.count()).where(Enquiry.agent_email == profile.user_email, Enquiry.is_read == False)
        )).scalar() or 0,
        "recent_packages": [
            {"id": p.id, "title": p.title, "status": p.status, "destinations": p.destinations or []}
            for p in recent_pkgs
        ],
    }
