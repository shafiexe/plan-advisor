"""Web Push subscription endpoints.

POST /api/push/subscribe   — store or update a browser push subscription
DELETE /api/push/unsubscribe — remove a push subscription
"""

import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import PushSubscription

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/push")


async def current_user(x_user_email: str = Header(..., alias="X-User-Email")) -> str:
    if not x_user_email or "@" not in x_user_email:
        raise HTTPException(status_code=401, detail="Valid X-User-Email header required")
    return x_user_email.lower().strip()


class SubscribeBody(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}


class UnsubscribeBody(BaseModel):
    endpoint: str


@router.post("/subscribe", status_code=200)
async def subscribe(
    body: SubscribeBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Store or refresh a push subscription for the authenticated user."""
    p256dh = body.keys.get("p256dh", "")
    auth = body.keys.get("auth", "")
    if not body.endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="endpoint, keys.p256dh and keys.auth are required")

    # Upsert: update if endpoint already exists, else insert
    existing = (await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )).scalar_one_or_none()

    if existing:
        existing.user_email = email
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        db.add(PushSubscription(
            user_email=email,
            endpoint=body.endpoint,
            p256dh=p256dh,
            auth=auth,
        ))

    await db.commit()
    log.info("Push subscription saved for %s", email)
    return {"ok": True}


@router.delete("/unsubscribe", status_code=200)
async def unsubscribe(
    body: UnsubscribeBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a push subscription for the authenticated user."""
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint,
            PushSubscription.user_email == email,
        )
    )
    await db.commit()
    log.info("Push subscription removed for %s", email)
    return {"ok": True}


# ── Reusable push helper ─────────────────────────────────────────────────────

async def send_push_to_user(
    db: AsyncSession,
    user_email: str,
    title: str,
    body: str,
    url: str = "/",
) -> int:
    """Send a web push notification to all subscriptions for user_email. Returns count sent."""
    private_key = os.getenv("VAPID_PRIVATE_KEY", "")
    public_key  = os.getenv("VAPID_PUBLIC_KEY", "")
    subject     = os.getenv("VAPID_SUBJECT", "mailto:admin@planadvisors.in")
    if not private_key or not public_key:
        return 0

    subs = (await db.execute(
        select(PushSubscription).where(PushSubscription.user_email == user_email.lower())
    )).scalars().all()

    if not subs:
        return 0

    try:
        from pywebpush import webpush, WebPushException  # type: ignore
        import json as _json
    except ImportError:
        return 0

    sent = 0
    for sub in subs:
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=_json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=private_key,
                vapid_claims={"sub": subject},
            )
            sent += 1
        except Exception as exc:
            log.debug("Push failed for %s: %s", sub.endpoint[:40], exc)
    return sent


# ── VAPID public key endpoint (browser needs this to subscribe) ───────────────

@router.get("/vapid-public-key")
async def vapid_public_key():
    """Return the VAPID public key in base64url format for browser use."""
    key = os.getenv("VAPID_PUBLIC_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="VAPID not configured")
    return {"publicKey": key}
