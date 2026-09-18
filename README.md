# Plan Advisor

An AI-powered travel assistant that helps users plan end-to-end trips — destination suggestions, real-time flight/train/bus search, hotel discovery, and restaurant recommendations — in a conversational chat interface.

---

## Features

- **Conversational AI** — Powered by Claude (Anthropic), with multi-turn streaming responses via WebSocket
- **Multi-modal transport search** — Flights (Google Flights via SerpAPI), trains, and buses with live pricing
- **Price calendar** — Cheapest day to fly in a given month
- **Hotel & restaurant search** — Real listings with ratings, prices, and amenities
- **Passenger profiles** — Save passport details for yourself and travel companions; AI auto-fills them in context
- **Voice I/O** — Microphone input (Whisper transcription) and text-to-speech playback
- **Passport scanning** — Drag-and-drop a passport photo or PDF to auto-fill passenger details
- **Conversation history** — Persisted to the server (cross-device) with localStorage fallback
- **Authentication** — Google and GitHub OAuth via NextAuth v5
- **Mobile-ready** — Capacitor configured for iOS and Android builds
- **Docker support** — One-command local stack with `docker compose up`

---

## Architecture

```
plan-advisor/
├── backend/          # Python FastAPI — AI, tools, REST + WebSocket APIs
│   ├── routers/      #   chat, transcribe, tts, passport, user_data
│   ├── services/     #   claude, serpapi_flights, places, bus_search,
│   │                 #   ground_transport, price_calendar, ota_scraper, whisper…
│   ├── models.py     #   SQLAlchemy models (Conversation, Passenger)
│   ├── database.py   #   async engine — SQLite (dev) / PostgreSQL (prod)
│   └── main.py       #   FastAPI app + CORS + lifespan
│
└── frontend/         # Next.js 16 (App Router) + React 19 + Tailwind CSS v4
    ├── app/          #   page.tsx (main chat UI), layout.tsx, login/
    ├── components/   #   ChatWindow, InputBar, result cards, ConversationSidebar…
    └── hooks/        #   useWebSocket, useServerSync, useSpeech, useVoiceInput…
```

**Key design decision — stateless backend chat**: the frontend sends the complete conversation history with every message. The backend holds no session state; each WebSocket message is self-contained. Tool calls (flights, hotels, etc.) are handled inside an agentic loop on the backend and streamed back as typed events (`token`, `tool_start`, `flight_results`, `hotel_results`, …), each rendered as a rich card in the UI.

---

## Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.12
- **Redis** (optional for local dev without Docker; needed in production for caching)
- API keys — see [Environment variables](#environment-variables) below

---

## Quick start (local dev)

### 1 — Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in .env with your API keys

uvicorn main:app --reload --port 8000
```

### 2 — Frontend

```bash
cd frontend
npm install

# Copy and edit environment variables
cp .env.local.example .env.local   # or create .env.local manually (see below)

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker

The full stack (backend + frontend + Redis) runs with a single command:

```bash
docker compose up --build
```

| Service  | Port |
|----------|------|
| frontend | 3000 |
| backend  | 8000 |
| redis    | 6379 |

The SQLite database is persisted in a named Docker volume (`backend-data`).

**First run** — make sure `backend/.env` exists with your API keys before running `docker compose up`.

To rebuild a single service after a code change:

```bash
docker compose up --build backend
```

To deploy to a custom domain, override the baked-in WebSocket URL at build time:

```bash
docker compose build \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws/chat \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  frontend
```

---

## Environment variables

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key ([console.anthropic.com](https://console.anthropic.com)) |
| `SERPAPI_KEY` | Yes | Google Flights search ([serpapi.com](https://serpapi.com)) |
| `OPENAI_API_KEY` | No | Whisper voice transcription fallback |
| `CLAUDE_MODEL` | No | Override model (default `claude-sonnet-4-5`) |
| `REDIS_URL` | No | Default `redis://localhost:6379` |
| `SCRAPE_DO_TOKEN` | No | Scrape.do proxy token for OTA scrapers |
| `TRAVELPAYOUTS_TOKEN` | No | Travelpayouts API token for `compare_flights` |
| `DATABASE_URL` | No | SQLAlchemy DSN — default `sqlite+aiosqlite:///./plan_advisor.db`; set `postgresql+asyncpg://…` for production |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default `http://localhost:3000`) |

### Frontend — `frontend/.env.local`

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes | NextAuth secret — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Public URL of the frontend (e.g. `http://localhost:3000`) |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth App client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth App client secret |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket URL (default `ws://localhost:8000/ws/chat`) |
| `NEXT_PUBLIC_API_URL` | No | Backend HTTP URL (default `http://localhost:8000`) |

---

## Mobile builds (Capacitor)

iOS and Android builds use static HTML export (`EXPORT_STATIC=true`), which bypasses NextAuth server routes. Capacitor handles the native shell.

```bash
# iOS (requires Xcode)
cd frontend && npm run mobile:ios

# Android (requires Android Studio)
cd frontend && npm run mobile:android
```

---

## Tech stack

| Layer | Technology |
|---|---|
| AI model | Anthropic Claude (claude-sonnet-4-5) |
| Backend framework | FastAPI + uvicorn |
| ORM / DB | SQLAlchemy async — SQLite (dev), PostgreSQL (prod) |
| Voice transcription | OpenAI Whisper |
| Flight search | SerpAPI (Google Flights) + Travelpayouts |
| Frontend framework | Next.js 16, React 19 |
| Styling | Tailwind CSS v4 |
| Auth | NextAuth v5 — Google, GitHub |
| Mobile | Capacitor 8 (iOS + Android) |
| Containerisation | Docker + Docker Compose |
