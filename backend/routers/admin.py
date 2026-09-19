import csv
import io
import json
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Conversation, Passenger

router = APIRouter(prefix="/api/admin")

ADMIN_EMAILS = {"shafi1379@gmail.com"}


async def require_admin(x_user_email: str = Header(..., alias="X-User-Email")) -> str:
    email = x_user_email.lower().strip()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return email


def _parse_date(d: Optional[str]) -> Optional[datetime]:
    if not d:
        return None
    try:
        return datetime.fromisoformat(d).replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid date: {d}. Use YYYY-MM-DD.")


@router.get("/stats")
async def get_stats(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    dt_from = _parse_date(from_date)
    dt_to   = _parse_date(to_date)
    if dt_to:
        dt_to = dt_to + timedelta(days=1)  # inclusive

    conversations = (await db.execute(select(Conversation))).scalars().all()
    passengers    = (await db.execute(select(Passenger))).scalars().all()

    def in_range(dt: Optional[datetime]) -> bool:
        if dt is None:
            return True
        if dt_from and dt < dt_from:
            return False
        if dt_to and dt >= dt_to:
            return False
        return True

    filtered_convs = [c for c in conversations if in_range(c.updated_at)]

    # Aggregate per user
    user_map: dict[str, dict] = {}
    for c in filtered_convs:
        u = user_map.setdefault(c.user_email, {
            "email": c.user_email, "conversations": 0,
            "messages": 0, "passengers": 0, "last_active": None,
        })
        u["conversations"] += 1
        try:
            msgs = json.loads(c.messages_json or "[]")
            u["messages"] += len(msgs)
        except Exception:
            pass
        if u["last_active"] is None or (c.updated_at and c.updated_at > u["last_active"]):
            u["last_active"] = c.updated_at

    for p in passengers:
        u = user_map.setdefault(p.user_email, {
            "email": p.user_email, "conversations": 0,
            "messages": 0, "passengers": 0, "last_active": None,
        })
        u["passengers"] += 1

    users = list(user_map.values())
    for u in users:
        if u["last_active"]:
            u["last_active"] = u["last_active"].isoformat()

    total_messages = sum(u["messages"] for u in users)

    recent = sorted(filtered_convs, key=lambda c: c.updated_at, reverse=True)[:10]
    recent_convs = [
        {
            "id": c.id,
            "user_email": c.user_email,
            "title": c.title or "(untitled)",
            "message_count": len(json.loads(c.messages_json or "[]")),
            "updated_at": c.updated_at.isoformat(),
        }
        for c in recent
    ]

    # Daily timeseries (last 30 days or within filter range)
    ts_from = dt_from or (datetime.now(timezone.utc) - timedelta(days=29))
    ts_to   = dt_to   or (datetime.now(timezone.utc) + timedelta(days=1))
    day_convs: dict[str, int] = defaultdict(int)
    day_msgs:  dict[str, int] = defaultdict(int)

    for c in conversations:
        if not c.updated_at:
            continue
        dt = c.updated_at if c.updated_at.tzinfo else c.updated_at.replace(tzinfo=timezone.utc)
        if dt < ts_from or dt >= ts_to:
            continue
        day = dt.date().isoformat()
        day_convs[day] += 1
        try:
            day_msgs[day] += len(json.loads(c.messages_json or "[]"))
        except Exception:
            pass

    # Fill every day in range so the chart has no gaps
    timeseries = []
    cur = ts_from.date()
    end = min(ts_to.date(), date.today())
    while cur <= end:
        key = cur.isoformat()
        timeseries.append({"date": key, "conversations": day_convs[key], "messages": day_msgs[key]})
        cur += timedelta(days=1)

    return {
        "overview": {
            "total_users": len(users),
            "total_conversations": len(filtered_convs),
            "total_messages": total_messages,
            "total_passengers": len(passengers),
        },
        "users": sorted(users, key=lambda u: u["messages"], reverse=True),
        "recent_conversations": recent_convs,
        "timeseries": timeseries,
    }


@router.get("/export/users")
async def export_users(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    conversations = (await db.execute(select(Conversation))).scalars().all()
    passengers    = (await db.execute(select(Passenger))).scalars().all()

    user_map: dict[str, dict] = {}
    for c in conversations:
        u = user_map.setdefault(c.user_email, {
            "email": c.user_email, "conversations": 0,
            "messages": 0, "passengers": 0, "last_active": "",
        })
        u["conversations"] += 1
        try:
            u["messages"] += len(json.loads(c.messages_json or "[]"))
        except Exception:
            pass
        if c.updated_at:
            ts = c.updated_at.isoformat()
            if not u["last_active"] or ts > u["last_active"]:
                u["last_active"] = ts

    for p in passengers:
        user_map.setdefault(p.user_email, {
            "email": p.user_email, "conversations": 0,
            "messages": 0, "passengers": 0, "last_active": "",
        })["passengers"] += 1

    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=["email", "conversations", "messages", "passengers", "last_active"])
    w.writeheader()
    w.writerows(sorted(user_map.values(), key=lambda u: u["messages"], reverse=True))

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=plan-advisor-users.csv"},
    )


@router.get("/export/conversations")
async def export_conversations(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    conversations = (await db.execute(select(Conversation))).scalars().all()

    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=["id", "user_email", "title", "message_count", "updated_at"])
    w.writeheader()
    for c in sorted(conversations, key=lambda c: c.updated_at, reverse=True):
        try:
            msg_count = len(json.loads(c.messages_json or "[]"))
        except Exception:
            msg_count = 0
        w.writerow({
            "id": c.id,
            "user_email": c.user_email,
            "title": c.title or "(untitled)",
            "message_count": msg_count,
            "updated_at": c.updated_at.isoformat() if c.updated_at else "",
        })

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=plan-advisor-conversations.csv"},
    )
