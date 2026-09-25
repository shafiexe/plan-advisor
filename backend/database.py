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
            ):
                try:
                    await conn.execute(text(col_def))
                except Exception:
                    pass
