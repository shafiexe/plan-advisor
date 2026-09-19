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
        import warnings
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from phoenix.otel import register as _phoenix_register
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _tp = _phoenix_register(
                project_name=_os.getenv("PHOENIX_PROJECT_NAME", "plan-advisor"),
                batch=True,
            )
        from openinference.instrumentation.anthropic import AnthropicInstrumentor
        AnthropicInstrumentor().instrument(tracer_provider=_tp)
        logging.getLogger(__name__).info("Arize Phoenix tracing enabled (batch mode)")
    except Exception as _e:
        logging.getLogger(__name__).warning("Phoenix init failed (non-fatal): %s", _e)
# ───────────────────────────────────────────────────────────────────────────────

log = logging.getLogger(__name__)
# Set OTA scraper to DEBUG so we can see HTML snippets during development
logging.getLogger("services.ota_scraper").setLevel(logging.DEBUG)

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
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
    try:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)
    except Exception:
        pass
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health")
async def health():
    return {"status": "ok", "app": "Plan Advisor"}



