from dotenv import load_dotenv
load_dotenv()  # must run before any service module is imported

import logging
import traceback
logging.basicConfig(level=logging.INFO)

# ── Sentry error tracking ──────────────────────────────────────────────────────
import os as _os
_sentry_dsn = _os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        sentry_sdk.init(
            dsn=_sentry_dsn,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.2,
            send_default_pii=False,
        )
        logging.getLogger(__name__).info("Sentry error tracking enabled")
    except Exception as _e:
        logging.getLogger(__name__).warning("Sentry init failed (non-fatal): %s", _e)
# ───────────────────────────────────────────────────────────────────────────────

# ── Arize Phoenix tracing (must init before anthropic client is created) ───────
_phoenix_key = _os.getenv("PHOENIX_API_KEY", "")
if _phoenix_key:
    try:
        from phoenix.otel import register as _phoenix_register
        _tp = _phoenix_register(
            project_name=_os.getenv("PHOENIX_PROJECT_NAME", "plan-advisor"),
        )
        from openinference.instrumentation.anthropic import AnthropicInstrumentor
        AnthropicInstrumentor().instrument(tracer_provider=_tp)
        logging.getLogger(__name__).info("Arize Phoenix tracing enabled")
    except Exception as _e:
        logging.getLogger(__name__).warning("Phoenix init failed (non-fatal): %s", _e)
# ───────────────────────────────────────────────────────────────────────────────

log = logging.getLogger(__name__)
# Set OTA scraper to DEBUG so we can see HTML snippets during development
logging.getLogger("services.ota_scraper").setLevel(logging.DEBUG)

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import chat, transcribe, tts, passport, user_data, admin
from database import init_db

# Allow-list: local dev + any Azure App Service / custom domain
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://localhost:3000"
).split(",") if o.strip()]

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()   # create tables on startup (safe to re-run)
    yield

app = FastAPI(
    title="Plan Advisor API",
    description="AI-powered advisory chat backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router,      tags=["chat"])
app.include_router(transcribe.router, tags=["voice"])
app.include_router(tts.router,        tags=["tts"])
app.include_router(passport.router,   tags=["passport"])
app.include_router(user_data.router,  tags=["user"])
app.include_router(admin.router,      tags=["admin"])


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception %s %s\n%s", request.method, request.url, traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health")
async def health():
    return {"status": "ok", "app": "Plan Advisor"}


@app.get("/debug/html")
async def debug_html(
    origin: str = Query("BLR"),
    destination: str = Query("DXB"),
    date: str = Query("2026-10-15"),
    source: str = Query("mmt"),
):
    """Save raw scraped HTML to /tmp for selector inspection."""
    import os as _os
    from services.ota_scraper import _fetch, _to_mmddyyyy, _to_yyyymmdd, _to_ddmmyyyy, _MMT_CABIN, _CLEARTRIP_CABIN, _YATRA_CABIN

    urls = {
        "mmt":       f"https://www.makemytrip.com/flight/search?itinerary={origin.upper()}-{destination.upper()}-{_to_mmddyyyy(date)}&tripType=O&paxType=A-1_C-0_I-0&intl=Y&cabinClass=E",
        "goibibo":   f"https://www.goibibo.com/flights/search/?source={origin.upper()}&destination={destination.upper()}&departureDate={_to_yyyymmdd(date)}&adults=1&children=0&infants=0&cabin=ECONOMY",
        "cleartrip": f"https://www.cleartrip.com/flights/results/?from={origin.upper()}&to={destination.upper()}&depart_date={_to_ddmmyyyy(date, sep='-')}&adults=1&class=Economy",
        "yatra":     f"https://flights.yatra.com/air-search-result?adult=1&child=0&infant=0&type=O&from={origin.upper()}&to={destination.upper()}&depart_date={_to_ddmmyyyy(date, sep='-')}&class=Y",
    }
    url = urls.get(source, urls["mmt"])
    html = await _fetch(url)
    if not html:
        return {"error": "fetch failed"}
    path = f"/tmp/ota_{source}.html"
    with open(path, "w") as f:
        f.write(html)
    return {"saved_to": path, "html_length": len(html), "preview": html[:500]}


@app.get("/debug/scrape")
async def debug_scrape(
    origin: str = Query("BLR"),
    destination: str = Query("DXB"),
    date: str = Query("2026-10-15"),
    source: str = Query("mmt", description="mmt | goibibo | cleartrip | yatra"),
):
    """Test endpoint — scrapes one OTA and returns raw parse results + HTML length."""
    from services.ota_scraper import _mmt, _goibibo, _cleartrip, _yatra
    fn = {"mmt": _mmt, "goibibo": _goibibo, "cleartrip": _cleartrip, "yatra": _yatra}.get(source)
    if not fn:
        return {"error": f"Unknown source: {source}"}
    results = await fn(origin.upper(), destination.upper(), date, 1, "ECONOMY", "USD", 5)
    return {"source": source, "results_found": len(results), "results": results}
