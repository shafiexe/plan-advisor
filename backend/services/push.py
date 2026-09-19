"""Web Push notification sender using pywebpush + VAPID."""

import json
import logging
import os

from pywebpush import webpush, WebPushException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger(__name__)

_VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
_VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:admin@planadvisors.in")


def _send_one(subscription_info: dict, payload: dict) -> bool:
    """Send a single push notification. Returns True on success."""
    if not _VAPID_PRIVATE_KEY:
        log.warning("VAPID_PRIVATE_KEY not configured — skipping push")
        return False
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=_VAPID_PRIVATE_KEY,
            vapid_claims={"sub": _VAPID_SUBJECT},
        )
        return True
    except WebPushException as exc:
        log.warning("Push failed (endpoint=%s): %s", subscription_info.get("endpoint", "?"), exc)
        return False
    except Exception as exc:
        log.warning("Push unexpected error: %s", exc)
        return False


async def send_price_alert_push(
    db: AsyncSession,
    user_email: str,
    origin: str,
    destination: str,
    departure_date: str,
    price: int,
) -> int:
    """Send a price-drop push notification to all of a user's subscribed browsers.

    Returns the number of successful deliveries.
    """
    from models import PushSubscription  # local import to avoid circular

    rows = (await db.execute(
        select(PushSubscription).where(PushSubscription.user_email == user_email)
    )).scalars().all()

    if not rows:
        return 0

    payload = {
        "title": "Price Drop Alert \U0001f514",
        "body": f"Flight {origin}→{destination} on {departure_date} dropped to ₹{price:,}",
        "url": "/",
    }

    sent = 0
    stale_endpoints = []

    for row in rows:
        sub_info = {
            "endpoint": row.endpoint,
            "keys": {
                "p256dh": row.p256dh,
                "auth": row.auth,
            },
        }
        ok = _send_one(sub_info, payload)
        if ok:
            sent += 1
        else:
            # 410 Gone / 404 means the subscription is expired — clean it up
            stale_endpoints.append(row.endpoint)

    # Remove stale subscriptions silently
    if stale_endpoints:
        from sqlalchemy import delete as sql_delete
        from models import PushSubscription as PS
        await db.execute(
            sql_delete(PS).where(PS.endpoint.in_(stale_endpoints))
        )
        await db.commit()

    log.info("Push notifications sent=%d stale_removed=%d for %s", sent, len(stale_endpoints), user_email)
    return sent
