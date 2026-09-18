"""
Redis cache for flight search results.

Falls back to an in-process dict if Redis is unreachable so local dev
works without a running Redis instance.
"""

import json
import logging
import os
import time
from typing import Any

log = logging.getLogger(__name__)

# ── In-process fallback ───────────────────────────────────────────────────────
# Used when Redis is unavailable. key → (expires_at, value)
_local: dict[str, tuple[float, Any]] = {}


def _local_get(key: str) -> Any | None:
    entry = _local.get(key)
    if entry and entry[0] > time.time():
        return entry[1]
    _local.pop(key, None)
    return None


def _local_set(key: str, value: Any, ttl: int) -> None:
    _local[key] = (time.time() + ttl, value)


# ── Redis client ──────────────────────────────────────────────────────────────
_redis = None


async def _get_redis():
    global _redis
    if _redis is not None:
        return _redis
    try:
        import redis.asyncio as aioredis  # type: ignore

        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        client = aioredis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        await client.ping()
        _redis = client
        log.info("Redis connected at %s", url)
    except Exception as exc:
        log.warning("Redis unavailable (%s) — using in-process cache", exc)
        _redis = None
    return _redis


async def get(key: str) -> Any | None:
    """Return cached value or None."""
    r = await _get_redis()
    if r:
        try:
            raw = await r.get(key)
            return json.loads(raw) if raw else None
        except Exception as exc:
            log.warning("Redis GET failed: %s", exc)
    return _local_get(key)


async def set(key: str, value: Any, ttl: int = 1800) -> None:
    """Store value with TTL (seconds). Default 30 min."""
    r = await _get_redis()
    if r:
        try:
            await r.setex(key, ttl, json.dumps(value))
            return
        except Exception as exc:
            log.warning("Redis SET failed: %s", exc)
    _local_set(key, value, ttl)
