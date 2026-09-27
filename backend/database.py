import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, StaticPool

# SQLite for local dev. Swap to PostgreSQL for production:
#   DATABASE_URL = "postgresql+asyncpg://user:pass@host/dbname"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./plan_advisor.db")

is_sqlite = DATABASE_URL.startswith("sqlite")

# SQLite: NullPool avoids cross-process lock contention; StaticPool is not
# safe across threads. PostgreSQL uses the default pool.
engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    poolclass=NullPool if is_sqlite else None,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Create all tables on startup, and apply any missing column migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add columns that were introduced after the initial schema
        if is_sqlite:
            for col_def in (
                "ALTER TABLE conversations ADD COLUMN pinned BOOLEAN DEFAULT 0",
                "ALTER TABLE conversations ADD COLUMN share_token TEXT",
                "ALTER TABLE trips ADD COLUMN collaborators JSON",
                "ALTER TABLE agent_profiles ADD COLUMN languages JSON",
                "ALTER TABLE agent_profiles ADD COLUMN experience_years INTEGER DEFAULT 0",
                "ALTER TABLE agent_profiles ADD COLUMN agency_code TEXT DEFAULT ''",
                "ALTER TABLE user_preferences ADD COLUMN onboarding_done BOOLEAN DEFAULT 0",
                "ALTER TABLE user_preferences ADD COLUMN packing_essentials JSON",
                "ALTER TABLE tour_packages ADD COLUMN meeting_point TEXT DEFAULT ''",
                "ALTER TABLE tour_packages ADD COLUMN special_notes TEXT DEFAULT ''",
                "ALTER TABLE tour_packages ADD COLUMN departure_city TEXT DEFAULT ''",
                "ALTER TABLE tickets ADD COLUMN airline_name TEXT DEFAULT ''",
                "ALTER TABLE tickets ADD COLUMN flight_number TEXT DEFAULT ''",
                "ALTER TABLE tickets ADD COLUMN travel_class TEXT DEFAULT 'economy'",
                "ALTER TABLE tickets ADD COLUMN is_nonstop BOOLEAN DEFAULT 1",
                "ALTER TABLE tickets ADD COLUMN layovers JSON DEFAULT '[]'",
                "ALTER TABLE tickets ADD COLUMN arrival_time TEXT DEFAULT ''",
                "ALTER TABLE tickets ADD COLUMN original_price INTEGER",
                # Agent approval + Aadhaar + license fields
                "ALTER TABLE agent_profiles ADD COLUMN services_offered JSON DEFAULT '[]'",
                "ALTER TABLE agent_profiles ADD COLUMN aadhaar_verified BOOLEAN DEFAULT 0",
                "ALTER TABLE agent_profiles ADD COLUMN aadhaar_last4 TEXT DEFAULT ''",
                "ALTER TABLE agent_profiles ADD COLUMN license_url TEXT DEFAULT ''",
                "ALTER TABLE agent_profiles ADD COLUMN license_filename TEXT DEFAULT ''",
                "ALTER TABLE agent_profiles ADD COLUMN approval_status TEXT DEFAULT 'pending_review'",
                "ALTER TABLE agent_profiles ADD COLUMN approval_note TEXT DEFAULT ''",
                "ALTER TABLE agent_profiles ADD COLUMN approved_at DATETIME",
                "ALTER TABLE agent_profiles ADD COLUMN approved_by TEXT DEFAULT ''",
            ):
                try:
                    await conn.execute(text(col_def))
                except Exception:
                    pass
        else:
            for col_def in (
                "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE",
                "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE",
                "ALTER TABLE trips ADD COLUMN IF NOT EXISTS collaborators JSON",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS languages JSON",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS agency_code TEXT DEFAULT ''",
                "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT FALSE",
                "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS packing_essentials JSON",
                "ALTER TABLE tour_packages ADD COLUMN IF NOT EXISTS meeting_point TEXT DEFAULT ''",
                "ALTER TABLE tour_packages ADD COLUMN IF NOT EXISTS special_notes TEXT DEFAULT ''",
                "ALTER TABLE tour_packages ADD COLUMN IF NOT EXISTS departure_city TEXT DEFAULT ''",
                "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS airline_name TEXT DEFAULT ''",
                "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS flight_number TEXT DEFAULT ''",
                "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS travel_class TEXT DEFAULT 'economy'",
                "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_nonstop BOOLEAN DEFAULT TRUE",
                "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS layovers JSON DEFAULT '[]'",
                "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS arrival_time TEXT DEFAULT ''",
                "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS original_price INTEGER",
                # Agent approval + Aadhaar + license fields
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS services_offered JSON",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS aadhaar_verified BOOLEAN DEFAULT FALSE",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS aadhaar_last4 TEXT DEFAULT ''",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS license_url TEXT DEFAULT ''",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS license_filename TEXT DEFAULT ''",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending_review'",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS approval_note TEXT DEFAULT ''",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP",
                "ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS approved_by TEXT DEFAULT ''",
            ):
                try:
                    await conn.execute(text(col_def))
                except Exception:
                    pass

        # New tables for Phase 2-4 (create_all handles new tables; these guard existing DBs)
        if is_sqlite:
            for tbl_sql in (
                """CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_email TEXT NOT NULL,
                    plan_type TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    razorpay_sub_id TEXT UNIQUE,
                    starts_at DATETIME,
                    ends_at DATETIME,
                    created_at DATETIME,
                    updated_at DATETIME
                )""",
                """CREATE TABLE IF NOT EXISTS api_usage_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_email TEXT,
                    api_type TEXT NOT NULL,
                    endpoint TEXT DEFAULT '',
                    tokens_used INTEGER DEFAULT 0,
                    cost_paise INTEGER DEFAULT 0,
                    created_at DATETIME
                )""",
                """CREATE TABLE IF NOT EXISTS agent_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id TEXT NOT NULL,
                    sender_email TEXT NOT NULL,
                    content TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT 0,
                    created_at DATETIME
                )""",
                """CREATE TABLE IF NOT EXISTS aadhaar_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_email TEXT NOT NULL,
                    client_id TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    used BOOLEAN DEFAULT 0,
                    created_at DATETIME
                )""",
            ):
                try:
                    await conn.execute(text(tbl_sql))
                except Exception:
                    pass

        # Backfill: agents active before the approval system are grandfathered as 'approved'
        try:
            if is_sqlite:
                await conn.execute(text(
                    "UPDATE agent_profiles SET approval_status = 'approved' "
                    "WHERE is_active = 1 AND (approval_status IS NULL OR approval_status = 'pending_review') "
                    "AND created_at < '2026-09-27 00:00:00'"
                ))
            else:
                await conn.execute(text(
                    "UPDATE agent_profiles SET approval_status = 'approved' "
                    "WHERE is_active = TRUE AND (approval_status IS NULL OR approval_status = 'pending_review') "
                    "AND created_at < '2026-09-27 00:00:00'"
                ))
        except Exception:
            pass
