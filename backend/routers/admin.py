import json
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
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


@router.get("/stats")
async def get_stats(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    conversations = (await db.execute(select(Conversation))).scalars().all()
    passengers = (await db.execute(select(Passenger))).scalars().all()

    # Aggregate per user
    user_map: dict[str, dict] = {}
    for c in conversations:
        u = user_map.setdefault(c.user_email, {
            "email": c.user_email,
            "conversations": 0,
            "messages": 0,
            "passengers": 0,
            "last_active": None,
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
            "email": p.user_email,
            "conversations": 0,
            "messages": 0,
            "passengers": 0,
            "last_active": None,
        })
        u["passengers"] += 1

    users = list(user_map.values())
    for u in users:
        if u["last_active"]:
            u["last_active"] = u["last_active"].isoformat()

    total_messages = sum(u["messages"] for u in users)

    recent = sorted(conversations, key=lambda c: c.updated_at, reverse=True)[:10]
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

    return {
        "overview": {
            "total_users": len(users),
            "total_conversations": len(conversations),
            "total_messages": total_messages,
            "total_passengers": len(passengers),
        },
        "users": sorted(users, key=lambda u: u["messages"], reverse=True),
        "recent_conversations": recent_convs,
    }
