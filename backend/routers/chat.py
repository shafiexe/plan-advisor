import json
import os
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.claude import stream_response

router = APIRouter()

# Rate limit: max messages per user per window
_RL_MAX     = int(os.getenv("RATE_LIMIT_MESSAGES", "20"))   # messages
_RL_WINDOW  = int(os.getenv("RATE_LIMIT_WINDOW",   "60"))   # seconds


async def _check_rate_limit(identifier: str) -> tuple[bool, int]:
    """
    Sliding-window rate limiter using Redis.
    Returns (allowed, retry_after_seconds).
    Falls back to allow-all if Redis is unavailable.
    """
    try:
        import redis.asyncio as aioredis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        r = aioredis.from_url(redis_url, decode_responses=True)
        key = f"ratelimit:chat:{identifier}"
        now = time.time()
        window_start = now - _RL_WINDOW

        pipe = r.pipeline()
        pipe.zremrangebyscore(key, "-inf", window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, _RL_WINDOW * 2)
        results = await pipe.execute()
        await r.aclose()

        count = results[2]
        if count > _RL_MAX:
            retry_after = int(_RL_WINDOW - (now - window_start))
            return False, max(retry_after, 1)
        return True, 0
    except Exception:
        return True, 0  # Redis unavailable → fail open


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            user_text = data.get("text", "").strip()
            history: list = data.get("history", [])
            passenger_context: str | None = data.get("passenger_context") or None
            user_email: str | None = data.get("user_email") or None
            user_location: str | None = data.get("user_location") or None

            if not user_text:
                continue

            # Rate limit by email (logged-in) or IP (guest)
            client_ip = websocket.client.host if websocket.client else "unknown"
            identifier = user_email.lower() if user_email else f"ip:{client_ip}"
            allowed, retry_after = await _check_rate_limit(identifier)

            if not allowed:
                await websocket.send_json({
                    "type": "error",
                    "content": f"Rate limit reached. Please wait {retry_after}s before sending another message.",
                })
                continue

            messages = history + [{"role": "user", "content": user_text}]

            extra_parts = []
            if user_location:
                extra_parts.append(
                    f"User's current location: {user_location}. "
                    "Use this as the default departure city/airport for flights and the default location for hotels "
                    "whenever the user doesn't specify an origin. Do NOT ask them where they are — you already know."
                )
            if passenger_context:
                extra_parts.append(
                    "The user has the following saved passengers. "
                    "When they refer to a passenger by name, use these details to fill in travel forms or answer questions:\n"
                    + passenger_context
                )
            extra_system = "\n\n".join(extra_parts) or None

            await websocket.send_json({"type": "typing"})

            async for event in stream_response(messages, extra_system=extra_system):
                await websocket.send_json(event)

            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
