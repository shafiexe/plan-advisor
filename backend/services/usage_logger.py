"""Log external API calls to api_usage_logs for admin analytics."""
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger(__name__)

# Approximate cost in paise (1/100 rupee) per unit:
# Claude: ~0.1 paise/token at Sonnet pricing; SerpAPI: ~50 paise/call; Aadhaar: ~500 paise/call
COST_MAP = {
    "claude":        0,    # logged by token, cost computed separately
    "serp_flights":  50,   # ~₹0.50/call
    "serp_hotels":   50,
    "amadeus":       10,
    "aadhaar_kyc":   700,  # ~₹7 avg for Surepass
    "msg91_sms":     25,   # ~₹0.25/SMS
    "openai_whisper":5,
}


async def log_api_call(
    db: AsyncSession,
    api_type: str,
    user_email: str | None = None,
    endpoint: str = "",
    tokens_used: int = 0,
    cost_paise: int | None = None,
) -> None:
    try:
        from models import ApiUsageLog, _now
        cost = cost_paise if cost_paise is not None else COST_MAP.get(api_type, 0)
        entry = ApiUsageLog(
            user_email=user_email,
            api_type=api_type,
            endpoint=endpoint,
            tokens_used=tokens_used,
            cost_paise=cost,
        )
        db.add(entry)
        await db.commit()
    except Exception as exc:
        log.warning("Failed to log API call: %s", exc)
