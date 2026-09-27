"""
Razorpay Subscriptions — agent_pro and traveller_pro plans at ₹50/month.

Endpoints:
  POST /api/subscription/create   — create Razorpay subscription order
  POST /api/subscription/webhook  — Razorpay webhook (verify HMAC, update DB)
  GET  /api/subscription/status   — current plan for calling user
  POST /api/subscription/cancel   — cancel active subscription
"""
import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Subscription, _now
from routers.agent_auth import current_user

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/subscription")

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

# Razorpay plan IDs — auto-created on first use if not set in env
PLAN_IDS: dict[str, str] = {
    "agent_pro":     os.getenv("RAZORPAY_PLAN_AGENT_PRO", ""),
    "traveller_pro": os.getenv("RAZORPAY_PLAN_TRAVELLER_PRO", ""),
}

PLAN_CONFIGS = {
    "agent_pro": {
        "name": "PlanAdvisors Agent Pro",
        "description": "Unlimited listings, priority search, real-time chat",
        "amount": 5000,   # ₹50 in paise
    },
    "traveller_pro": {
        "name": "PlanAdvisors Traveller Pro",
        "description": "Agent matching, real-time chat, priority response",
        "amount": 5000,
    },
}

RZ_BASE = "https://api.razorpay.com/v1"


async def _rz_post(path: str, body: dict) -> dict:
    async with httpx.AsyncClient(timeout=15, auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) as client:
        resp = await client.post(f"{RZ_BASE}{path}", json=body)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Razorpay error: {resp.text}")
        return resp.json()


async def _ensure_plan(plan_type: str) -> str:
    """Return configured plan_id, or create the plan via API if missing/invalid."""
    plan_id = PLAN_IDS.get(plan_type, "")
    if plan_id:
        return plan_id

    if not RAZORPAY_KEY_ID:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")

    cfg = PLAN_CONFIGS[plan_type]
    async with httpx.AsyncClient(timeout=15, auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) as client:
        resp = await client.post(f"{RZ_BASE}/plans", json={
            "period": "monthly",
            "interval": 1,
            "item": {
                "name": cfg["name"],
                "amount": cfg["amount"],
                "currency": "INR",
                "description": cfg["description"],
            },
        })
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Could not create Razorpay plan: {resp.text}")
        new_plan = resp.json()
        PLAN_IDS[plan_type] = new_plan["id"]
        log.info("Auto-created Razorpay plan %s → %s", plan_type, new_plan["id"])
        return new_plan["id"]


async def _rz_post_action(path: str) -> dict:
    async with httpx.AsyncClient(timeout=15, auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) as client:
        resp = await client.post(f"{RZ_BASE}{path}")
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Razorpay error: {resp.text}")
        return resp.json()


class CreateBody(BaseModel):
    plan_type: str   # 'agent_pro' | 'traveller_pro'


@router.post("/create")
async def create_subscription(
    body: CreateBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.plan_type not in PLAN_CONFIGS:
        raise HTTPException(status_code=422, detail="Invalid plan type.")

    plan_id = await _ensure_plan(body.plan_type)

    # Cancel any existing active subscription first
    existing = (await db.execute(
        select(Subscription).where(Subscription.user_email == email, Subscription.status == "active")
    )).scalar_one_or_none()
    if existing and existing.razorpay_sub_id:
        try:
            await _rz_post_action(f"/subscriptions/{existing.razorpay_sub_id}/cancel")
        except Exception:
            pass
        existing.status = "cancelled"

    rz_sub = await _rz_post("/subscriptions", {
        "plan_id": plan_id,
        "total_count": 120,        # 10 years max; cancel any time
        "quantity": 1,
        "customer_notify": 1,
        "notes": {"user_email": email, "plan_type": body.plan_type},
    })

    sub = Subscription(
        user_email=email,
        plan_type=body.plan_type,
        status="created",
        razorpay_sub_id=rz_sub["id"],
        starts_at=None,
        ends_at=None,
    )
    db.add(sub)
    await db.commit()

    return {
        "ok": True,
        "subscription_id": rz_sub["id"],
        "short_url": rz_sub.get("short_url"),   # redirect user here to complete payment
        "razorpay_key": RAZORPAY_KEY_ID,
    }


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Razorpay sends POST here on subscription events. Verify HMAC, update DB."""
    body_bytes = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    expected = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode(),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    event = json.loads(body_bytes)
    payload = event.get("payload", {}).get("subscription", {}).get("entity", {})
    rz_sub_id = payload.get("id")

    if not rz_sub_id:
        return {"ok": True}

    sub = (await db.execute(
        select(Subscription).where(Subscription.razorpay_sub_id == rz_sub_id)
    )).scalar_one_or_none()

    if not sub:
        return {"ok": True}

    ev = event.get("event", "")
    if ev in ("subscription.activated", "subscription.charged"):
        sub.status = "active"
        if payload.get("current_start"):
            sub.starts_at = datetime.fromtimestamp(payload["current_start"], tz=timezone.utc).replace(tzinfo=None)
        if payload.get("current_end"):
            sub.ends_at = datetime.fromtimestamp(payload["current_end"], tz=timezone.utc).replace(tzinfo=None)
    elif ev in ("subscription.cancelled", "subscription.expired", "subscription.halted"):
        sub.status = "cancelled" if "cancel" in ev else "expired"

    sub.updated_at = _now()
    await db.commit()
    return {"ok": True}


@router.get("/status")
async def subscription_status(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = (await db.execute(
        select(Subscription).where(Subscription.user_email == email, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
    )).scalar_one_or_none()

    if not sub:
        return {"plan": "free", "status": "free"}

    return {
        "plan": sub.plan_type,
        "status": sub.status,
        "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
        "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
    }


@router.post("/cancel")
async def cancel_subscription(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = (await db.execute(
        select(Subscription).where(Subscription.user_email == email, Subscription.status == "active")
    )).scalar_one_or_none()

    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found.")

    if sub.razorpay_sub_id and RAZORPAY_KEY_ID:
        try:
            await _rz_post_action(f"/subscriptions/{sub.razorpay_sub_id}/cancel")
        except Exception as exc:
            log.warning("Razorpay cancel failed: %s", exc)

    sub.status = "cancelled"
    sub.updated_at = _now()
    await db.commit()
    return {"ok": True, "message": "Subscription cancelled."}


# ── Helper used by other routers ─────────────────────────────────────────────

async def get_plan(email: str, db: AsyncSession) -> str:
    """Returns 'agent_pro', 'traveller_pro', or 'free'."""
    sub = (await db.execute(
        select(Subscription).where(Subscription.user_email == email, Subscription.status == "active")
        .order_by(Subscription.created_at.desc())
    )).scalar_one_or_none()
    return sub.plan_type if sub else "free"
