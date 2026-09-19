"""Price alert endpoints.

User-facing endpoints are protected by the X-User-Email header (same pattern
as user_data.py).  The /check endpoint is public but requires an
X-Check-Secret header matching the ALERT_CHECK_SECRET env var.
"""

import logging
import os
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import PriceAlert
from services.email import send_price_alert_email
from services.push import send_price_alert_push
from services.serpapi_flights import search_flights

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts")


# ── Auth helpers ───────────────────────────────────────────────────────────────

async def current_user(x_user_email: str = Header(..., alias="X-User-Email")) -> str:
    if not x_user_email or "@" not in x_user_email:
        raise HTTPException(status_code=401, detail="Valid X-User-Email header required")
    return x_user_email.lower().strip()


def _row_to_dict(r: PriceAlert) -> dict:
    return {
        "id":             r.id,
        "user_email":     r.user_email,
        "origin":         r.origin,
        "destination":    r.destination,
        "departure_date": r.departure_date,
        "threshold_inr":  r.threshold_inr,
        "last_price_inr": r.last_price_inr,
        "triggered":      bool(r.triggered),
        "active":         bool(r.active),
        "created_at":     r.created_at.isoformat() if r.created_at else None,
        "last_checked":   r.last_checked.isoformat() if r.last_checked else None,
    }


# ── User endpoints ─────────────────────────────────────────────────────────────

@router.get("")
async def list_alerts(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all active price alerts for the authenticated user."""
    rows = (await db.execute(
        select(PriceAlert)
        .where(PriceAlert.user_email == email, PriceAlert.active == True)  # noqa: E712
        .order_by(PriceAlert.created_at.desc())
    )).scalars().all()
    return [_row_to_dict(r) for r in rows]


class AlertBody(BaseModel):
    origin:         str
    destination:    str
    departure_date: str   # YYYY-MM-DD
    threshold_inr:  int


@router.post("", status_code=201)
async def create_alert(
    body: AlertBody,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new price alert for the authenticated user."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    alert = PriceAlert(
        user_email=email,
        origin=body.origin.strip().upper(),
        destination=body.destination.strip().upper(),
        departure_date=body.departure_date.strip(),
        threshold_inr=body.threshold_inr,
        created_at=now,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return _row_to_dict(alert)


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete (hard-delete) a price alert owned by the authenticated user."""
    row = (await db.execute(
        select(PriceAlert).where(
            PriceAlert.id == alert_id,
            PriceAlert.user_email == email,
        )
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(row)
    await db.commit()
    return {"ok": True}


# ── Internal check endpoint ────────────────────────────────────────────────────

@router.post("/check")
async def check_alerts(
    x_check_secret: str = Header(..., alias="X-Check-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Run the alert check for all active alerts.

    Protected by X-Check-Secret header matching the ALERT_CHECK_SECRET env var.
    Intended to be called by a scheduler or an external cron job.
    """
    expected = os.getenv("ALERT_CHECK_SECRET", "")
    if not expected or x_check_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid check secret")

    result = await _run_alert_check(db)
    return result


# ── Shared check logic (also called by the APScheduler job) ───────────────────

async def run_check_with_new_session() -> dict:
    """Entry-point for the APScheduler job — creates its own DB session."""
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        return await _run_alert_check(db)


async def _run_alert_check(db: AsyncSession) -> dict:
    """Core check logic: iterate active alerts, fetch prices, send emails."""
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    active_rows = (await db.execute(
        select(PriceAlert).where(PriceAlert.active == True)  # noqa: E712
    )).scalars().all()

    checked = 0
    triggered = 0
    deactivated = 0
    errors = 0

    for alert in active_rows:
        # Deactivate past-date alerts
        if alert.departure_date < today_str:
            alert.active = False
            deactivated += 1
            log.info("Deactivated past-date alert id=%d (%s→%s on %s)",
                     alert.id, alert.origin, alert.destination, alert.departure_date)
            continue

        try:
            result = await search_flights(
                origin=alert.origin,
                destination=alert.destination,
                departure_date=alert.departure_date,
                adults=1,
                currency="INR",
                max_results=3,
            )

            alert.last_checked = now
            checked += 1

            if result.get("flights_found", 0) > 0:
                min_price = min(r["price_number"] for r in result["results"])
                alert.last_price_inr = min_price

                if min_price <= alert.threshold_inr:
                    log.info(
                        "Alert id=%d triggered: %s→%s on %s price=₹%s threshold=₹%s",
                        alert.id, alert.origin, alert.destination,
                        alert.departure_date, f"{min_price:,}", f"{alert.threshold_inr:,}",
                    )
                    await send_price_alert_email(
                        to_email=alert.user_email,
                        origin=alert.origin,
                        destination=alert.destination,
                        departure_date=alert.departure_date,
                        price=min_price,
                        threshold=alert.threshold_inr,
                    )
                    # Also fire a browser push notification (non-fatal if it fails)
                    try:
                        await send_price_alert_push(
                            db=db,
                            user_email=alert.user_email,
                            origin=alert.origin,
                            destination=alert.destination,
                            departure_date=alert.departure_date,
                            price=min_price,
                        )
                    except Exception as _push_exc:
                        log.warning("Push notification failed (non-fatal): %s", _push_exc)
                    alert.triggered = True
                    triggered += 1

        except Exception:
            errors += 1
            log.error(
                "Error checking alert id=%d (%s→%s on %s):\n%s",
                alert.id, alert.origin, alert.destination,
                alert.departure_date, traceback.format_exc(),
            )

    await db.commit()
    log.info(
        "Alert check complete: checked=%d triggered=%d deactivated=%d errors=%d",
        checked, triggered, deactivated, errors,
    )
    return {
        "checked":     checked,
        "triggered":   triggered,
        "deactivated": deactivated,
        "errors":      errors,
    }
