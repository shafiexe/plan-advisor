"""
Real-time agent ↔ traveller chat.

WebSocket: WS /ws/agent-chat/{room_id}?user_email=<email>
REST:
  GET  /api/chat/rooms                         — list all rooms for current user
  GET  /api/chat/rooms/{room_id}/messages      — message history (paginated)
  POST /api/chat/rooms/{room_id}/read          — mark all messages in room as read
  POST /api/chat/rooms/{room_id}/start         — create/get a room between two users
"""
import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal, get_db
from models import AgentMessage, _now
from routers.agent_auth import current_user

log = logging.getLogger(__name__)
router = APIRouter()

# In-memory connection registry: room_id → set of WebSocket connections
_rooms: dict[str, set[WebSocket]] = defaultdict(set)


def _room_id(email_a: str, email_b: str) -> str:
    return ":".join(sorted([email_a.lower(), email_b.lower()]))


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/agent-chat/{room_id}")
async def agent_chat_ws(
    websocket: WebSocket,
    room_id: str,
    user_email: str = Query(...),
):
    await websocket.accept()
    user_email = user_email.lower().strip()
    _rooms[room_id].add(websocket)

    # Send last 50 messages on connect
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(AgentMessage)
            .where(AgentMessage.room_id == room_id)
            .order_by(AgentMessage.created_at.desc())
            .limit(50)
        )).scalars().all()
        history = [
            {"id": r.id, "sender": r.sender_email, "content": r.content, "ts": r.created_at.isoformat()}
            for r in reversed(rows)
        ]
    await websocket.send_json({"type": "history", "messages": history})

    try:
        while True:
            data = await websocket.receive_json()
            content = (data.get("content") or "").strip()
            if not content:
                continue

            async with AsyncSessionLocal() as db:
                msg = AgentMessage(
                    room_id=room_id,
                    sender_email=user_email,
                    content=content,
                )
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

            payload = {
                "type": "message",
                "id": msg.id,
                "sender": user_email,
                "content": content,
                "ts": msg.created_at.isoformat(),
            }

            # Broadcast to everyone in the room (including sender for confirmation)
            dead: set[WebSocket] = set()
            for ws in _rooms[room_id]:
                try:
                    await ws.send_json(payload)
                except Exception:
                    dead.add(ws)
            _rooms[room_id] -= dead

    except WebSocketDisconnect:
        _rooms[room_id].discard(websocket)


# ── REST ──────────────────────────────────────────────────────────────────────

@router.get("/api/chat/rooms")
async def list_rooms(
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all chat rooms the current user participates in, newest first."""
    rows = (await db.execute(
        select(AgentMessage)
        .where(AgentMessage.room_id.like(f"%{email}%"))
        .order_by(AgentMessage.created_at.desc())
    )).scalars().all()

    seen: dict[str, dict] = {}
    for r in rows:
        if r.room_id not in seen:
            other = [e for e in r.room_id.split(":") if e != email]
            seen[r.room_id] = {
                "room_id":      r.room_id,
                "other_email":  other[0] if other else "",
                "last_message": r.content,
                "last_ts":      r.created_at.isoformat() if r.created_at else None,
                "unread":       0,
            }

    # Count unread per room
    for room_id, info in seen.items():
        unread_rows = (await db.execute(
            select(AgentMessage).where(
                AgentMessage.room_id == room_id,
                AgentMessage.sender_email != email,
                AgentMessage.is_read == False,
            )
        )).scalars().all()
        info["unread"] = len(unread_rows)

    return list(seen.values())


@router.get("/api/chat/rooms/{room_id}/messages")
async def get_messages(
    room_id: str,
    email: str = Depends(current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(AgentMessage)
        .where(AgentMessage.room_id == room_id)
        .order_by(AgentMessage.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )).scalars().all()
    return [
        {"id": r.id, "sender": r.sender_email, "content": r.content, "is_read": r.is_read, "ts": r.created_at.isoformat()}
        for r in reversed(rows)
    ]


@router.post("/api/chat/rooms/{room_id}/read")
async def mark_room_read(
    room_id: str,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(AgentMessage).where(
            AgentMessage.room_id == room_id,
            AgentMessage.sender_email != email,
            AgentMessage.is_read == False,
        )
    )).scalars().all()
    for r in rows:
        r.is_read = True
    await db.commit()
    return {"ok": True, "marked": len(rows)}


@router.post("/api/chat/rooms/{room_id}/start")
async def start_room(
    room_id: str,
    email: str = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return room_id for a chat between two users (create if needed)."""
    emails = room_id.split(":")
    if len(emails) != 2 or email not in emails:
        raise HTTPException(status_code=400, detail="Invalid room_id. Must be 'email_a:email_b' sorted.")
    return {"room_id": room_id}
