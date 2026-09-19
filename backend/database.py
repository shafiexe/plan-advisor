import os
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
            for col_def in ("ALTER TABLE conversations ADD COLUMN pinned BOOLEAN DEFAULT 0",):
                try:
                    await conn.execute(__import__("sqlalchemy").text(col_def))
                except Exception:
                    pass  # column already exists
