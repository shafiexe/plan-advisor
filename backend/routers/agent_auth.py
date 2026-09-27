"""
Agent registration and profile management.
Registration flow:
  1. POST /api/agent/register        — create AgentProfile (linked to logged-in user email)
  2. POST /api/agent/phone-otp       — send a 6-digit OTP via MSG91 (console in dev)
  3. POST /api/agent/verify-phone    — verify OTP, mark phone_verified=True
  4. POST /api/agent/aadhaar-otp     — trigger Aadhaar OTP via Surepass API
  5. POST /api/agent/verify-aadhaar  — verify Aadhaar OTP, mark aadhaar_verified=True
  6. POST /api/agent/upload-license  — upload travel license to Azure Blob Storage
  7. GET  /api/agent/check           — returns {is_admin, is_agent, profile} for current user
  8. GET  /api/agent/profile         — full profile
  9. PUT  /api/agent/profile         — update profile fields
"""
import hashlib
import logging
import os
import random
import string
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AadhaarSession, AgentProfile, OTPRecord, _now

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent")

# Comma-separated admin emails in the ADMIN_EMAILS env var.
# e.g. ADMIN_EMAILS=admin@example.com,ops@example.com
ADMIN_EMAILS: set[str] = {
    e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()
}


async def current_user(x_user_email: str = Header(..., alias="X-User-Email")) -> str:
    if not x_user_email or "@" not in x_user_email:
        raise HTTPException(status_code=401, detail="Valid X-User-Email header required")
    return x_user_email.lower().strip()


async def require_agent(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentProfile:
    """Dependency: ensures the current user has an active, approved AgentProfile."""
    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email, AgentProfile.is_active == True)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=403, detail="Agent profile required.")
    if profile.approval_status == "pending_review":
        raise HTTPException(status_code=403, detail="Your account is pending admin approval. You'll receive a notification once approved.")
    if profile.approval_status == "rejected":
        raise HTTPException(status_code=403, detail=f"Your account was not approved. {profile.approval_note or 'Please contact support.'}")
    return profile


async def require_admin(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentProfile:
    """Dependency: ensures the current user is a platform admin (in ADMIN_EMAILS)
    AND has an active AgentProfile (so their content has proper agent info)."""
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required.")
    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email, AgentProfile.is_active == True)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=403, detail="Admin must have an active agent profile.")
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
    services_offered: list[str] = []


class AadhaarOTPBody(BaseModel):
    aadhaar_number: str   # 12-digit Aadhaar number


class VerifyAadhaarBody(BaseModel):
    otp: str              # 6-digit OTP from Aadhaar-linked mobile


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
        "services_offered": p.services_offered or [],
        "aadhaar_verified": p.aadhaar_verified or False,
        "aadhaar_last4":    p.aadhaar_last4 or "",
        "license_url":      p.license_url or "",
        "license_filename": p.license_filename or "",
        "approval_status":  p.approval_status or "pending_review",
        "approval_note":    p.approval_note or "",
        "approved_at":      p.approved_at.isoformat() if p.approved_at else None,
        "approved_by":      p.approved_by or "",
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
        services_offered=body.services_offered,
        phone_verified=False,
        aadhaar_verified=False,
        approval_status="pending_review",
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
    if provider == "msg91":
        auth_key = os.getenv("MSG91_AUTH_KEY", "")
        template_id = os.getenv("MSG91_OTP_TEMPLATE_ID", "")
        phone_e164 = body.phone.strip().lstrip("+")
        if not phone_e164.startswith("91"):
            phone_e164 = "91" + phone_e164
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    "https://api.msg91.com/api/v5/otp",
                    params={"authkey": auth_key, "template_id": template_id, "mobile": phone_e164, "otp": otp},
                )
                if resp.status_code != 200 or resp.json().get("type") != "success":
                    log.warning("MSG91 send failed: %s", resp.text)
        except Exception as exc:
            log.error("MSG91 error: %s", exc)
    else:
        log.info("📱 [DEV] Phone OTP for %s: %s (expires 5 min)", body.phone, otp)

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
    """Quick role check. Returns {is_admin, is_agent, profile}."""
    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email)
    )).scalar_one_or_none()
    return {
        "is_admin": email in ADMIN_EMAILS,
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


# ── Aadhaar OTP (Surepass) ───────────────────────────────────────────────────

SUREPASS_BASE = "https://kyc-api.surepass.io/api/v1"


@router.post("/aadhaar-otp")
async def send_aadhaar_otp(
    body: AadhaarOTPBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger Aadhaar OTP via Surepass. Returns masked mobile number."""
    aadhaar = body.aadhaar_number.replace(" ", "")
    if len(aadhaar) != 12 or not aadhaar.isdigit():
        raise HTTPException(status_code=422, detail="Aadhaar number must be exactly 12 digits.")

    token = os.getenv("SUREPASS_API_TOKEN", "")
    if not token:
        raise HTTPException(status_code=503, detail="Aadhaar verification not configured.")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{SUREPASS_BASE}/aadhaar-v2/generate-otp",
            json={"id_number": aadhaar},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )

    data = resp.json()
    if resp.status_code != 200 or not data.get("success"):
        raise HTTPException(status_code=400, detail=data.get("message", "Aadhaar OTP failed. Check the number and try again."))

    client_id = data["data"]["client_id"]
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)

    # Invalidate previous sessions for this user
    old = (await db.execute(
        select(AadhaarSession).where(AadhaarSession.user_email == email, AadhaarSession.used == False)
    )).scalars().all()
    for s in old:
        s.used = True

    db.add(AadhaarSession(user_email=email, client_id=client_id, expires_at=expires_at))
    await db.commit()

    from services.usage_logger import log_api_call
    await log_api_call(db, "aadhaar_kyc", user_email=email, endpoint="generate-otp")

    return {"ok": True, "message": "OTP sent to Aadhaar-linked mobile", "mobile_hint": data["data"].get("if_number", "")}


@router.post("/verify-aadhaar")
async def verify_aadhaar(
    body: VerifyAadhaarBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify Aadhaar OTP and mark aadhaar_verified=True on the agent profile."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session = (await db.execute(
        select(AadhaarSession).where(
            AadhaarSession.user_email == email,
            AadhaarSession.used == False,
            AadhaarSession.expires_at > now,
        ).order_by(AadhaarSession.created_at.desc())
    )).scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=400, detail="No active Aadhaar session. Please request OTP first.")

    token = os.getenv("SUREPASS_API_TOKEN", "")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{SUREPASS_BASE}/aadhaar-v2/submit-otp",
            json={"client_id": session.client_id, "otp": body.otp},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )

    data = resp.json()
    if resp.status_code != 200 or not data.get("success"):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please try again.")

    session.used = True

    aadhaar_data = data.get("data", {})
    aadhaar_number = str(aadhaar_data.get("aadhaar_number", ""))
    last4 = aadhaar_number[-4:] if len(aadhaar_number) >= 4 else ""

    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email)
    )).scalar_one_or_none()
    if profile:
        profile.aadhaar_verified = True
        profile.aadhaar_last4 = last4

    await db.commit()
    return {"ok": True, "aadhaar_verified": True, "aadhaar_last4": last4}


# ── License upload (Azure Blob Storage) ──────────────────────────────────────

@router.post("/upload-license")
async def upload_license(
    file: UploadFile = File(...),
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload travel license PDF/image to Azure Blob Storage."""
    if not file.filename:
        raise HTTPException(status_code=422, detail="No file provided.")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "jpg", "jpeg", "png"):
        raise HTTPException(status_code=422, detail="Only PDF, JPG, or PNG files are accepted.")

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
    container = os.getenv("AZURE_STORAGE_CONTAINER", "licenses")
    if not conn_str:
        raise HTTPException(status_code=503, detail="File storage not configured.")

    try:
        from azure.storage.blob.aio import BlobServiceClient  # type: ignore
    except ImportError:
        raise HTTPException(status_code=503, detail="azure-storage-blob package not installed.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10 MB.")

    safe_email = email.replace("@", "_at_").replace(".", "_")
    blob_name = f"{safe_email}/license.{ext}"

    async with BlobServiceClient.from_connection_string(conn_str) as svc:
        blob = svc.get_blob_client(container=container, blob=blob_name)
        await blob.upload_blob(content, overwrite=True)
        url = blob.url

    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email)
    )).scalar_one_or_none()
    if profile:
        profile.license_url = url
        profile.license_filename = file.filename

    await db.commit()
    return {"ok": True, "license_url": url, "license_filename": file.filename}


# ── Admin-only endpoints ──────────────────────────────────────────────────────

class AdminCreateAgentBody(BaseModel):
    user_email:       str
    agent_type:       str
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


@router.get("/admin/agents")
async def admin_list_agents(
    _admin: AgentProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list all agent profiles."""
    agents = (await db.execute(
        select(AgentProfile).order_by(AgentProfile.created_at.desc())
    )).scalars().all()
    return [_profile_to_dict(a) for a in agents]


@router.post("/admin/agents", status_code=201)
async def admin_create_agent(
    body: AdminCreateAgentBody,
    _admin: AgentProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: create an agent profile for any user email."""
    target_email = body.user_email.lower().strip()
    existing = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == target_email)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Agent profile already exists for this email.")
    if body.agent_type not in ("agency", "individual"):
        raise HTTPException(status_code=422, detail="agent_type must be 'agency' or 'individual'")

    profile = AgentProfile(
        user_email=target_email,
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


@router.get("/admin/users")
async def admin_list_users(
    _admin: AgentProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list all registered travellers (users with preferences)."""
    from models import UserPreferences
    users = (await db.execute(
        select(UserPreferences).order_by(UserPreferences.id.desc())
    )).scalars().all()
    return [
        {
            "email":          u.user_email,
            "home_city":      u.home_city or "",
            "nationality":    u.nationality or "",
            "travel_style":   u.travel_style or "",
            "currency":       u.currency or "INR",
            "onboarding_done": u.onboarding_done,
        }
        for u in users
    ]


# ── Agent login via email → phone OTP ────────────────────────────────────────

class LoginOTPBody(BaseModel):
    email: str


class VerifyLoginOTPBody(BaseModel):
    email: str
    otp:   str


@router.post("/login-otp")
async def send_login_otp(body: LoginOTPBody, db: AsyncSession = Depends(get_db)):
    """Step 1 of agent login: look up agent by email, send OTP to their registered phone."""
    email = body.email.lower().strip()
    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email, AgentProfile.is_active == True)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No agent account found with this email.")
    if profile.approval_status == "rejected":
        raise HTTPException(status_code=403, detail=f"Your account was not approved. {profile.approval_note or 'Please contact support.'}")

    otp = "".join(random.choices(string.digits, k=6))
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)

    old_otps = (await db.execute(
        select(OTPRecord).where(OTPRecord.phone == profile.phone, OTPRecord.used == False)
    )).scalars().all()
    for old in old_otps:
        old.used = True

    db.add(OTPRecord(phone=profile.phone, otp_hash=_hash_otp(otp), expires_at=expires_at))
    await db.commit()

    provider = os.getenv("PHONE_OTP_PROVIDER", "console")
    if provider == "msg91":
        auth_key    = os.getenv("MSG91_AUTH_KEY", "")
        template_id = os.getenv("MSG91_OTP_TEMPLATE_ID", "")
        phone_e164  = profile.phone.strip().lstrip("+")
        if not phone_e164.startswith("91"):
            phone_e164 = "91" + phone_e164
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    "https://api.msg91.com/api/v5/otp",
                    params={"authkey": auth_key, "template_id": template_id, "mobile": phone_e164, "otp": otp},
                )
        except Exception as exc:
            log.error("MSG91 login OTP error: %s", exc)
    else:
        log.info("📱 [DEV] Login OTP for %s (phone %s): %s", email, profile.phone, otp)

    phone_masked = profile.phone[-4:] if profile.phone else "****"
    return {
        "ok": True,
        "phone_hint": f"****{phone_masked}",
        "approval_status": profile.approval_status,
        "dev_otp": otp if os.getenv("ENVIRONMENT", "dev") == "dev" else None,
    }


@router.post("/verify-login-otp")
async def verify_login_otp(body: VerifyLoginOTPBody, db: AsyncSession = Depends(get_db)):
    """Step 2 of agent login: verify OTP, return agent profile as the session payload."""
    email = body.email.lower().strip()
    profile = (await db.execute(
        select(AgentProfile).where(AgentProfile.user_email == email, AgentProfile.is_active == True)
    )).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Agent not found.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    record = (await db.execute(
        select(OTPRecord).where(
            OTPRecord.phone == profile.phone,
            OTPRecord.otp_hash == _hash_otp(body.otp),
            OTPRecord.used == False,
            OTPRecord.expires_at > now,
        )
    )).scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please request a new one.")

    record.used = True
    await db.commit()

    is_admin = email in ADMIN_EMAILS
    return {
        "ok": True,
        "email": email,
        "name": profile.name,
        "agent_type": profile.agent_type,
        "approval_status": profile.approval_status,
        "is_admin": is_admin,
        "profile": _profile_to_dict(profile),
    }
