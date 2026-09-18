from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, UniqueConstraint
from database import Base


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Conversation(Base):
    __tablename__ = "conversations"

    id            = Column(String,  primary_key=True)   # "chat-<ts>-<rand>"
    user_email    = Column(String,  nullable=False, index=True)
    title         = Column(String,  default="")
    messages_json = Column(Text,    default="[]")       # JSON array of Message objects
    pinned        = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=_now)
    updated_at    = Column(DateTime, default=_now, onupdate=_now)


class PassengerProfile(Base):
    """Legacy single-profile table — kept for backwards compat."""
    __tablename__ = "passenger_profiles"

    user_email  = Column(String,  primary_key=True)
    data_json   = Column(Text,    default="{}")
    updated_at  = Column(DateTime, default=_now, onupdate=_now)


class Passenger(Base):
    """One row per saved passenger per user — supports full family / group."""
    __tablename__ = "passengers"
    __table_args__ = (
        # first_name + last_name must be unique per user (case-insensitive enforced in app layer)
        UniqueConstraint("user_email", "first_name", "last_name", name="uq_passenger_name"),
    )

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_email      = Column(String, nullable=False, index=True)
    label           = Column(String, default="Passenger")   # display name, e.g. "Myself"
    first_name      = Column(String, default="")
    last_name       = Column(String, default="")
    date_of_birth   = Column(String, default="")            # YYYY-MM-DD
    gender          = Column(String, default="")            # M / F
    passport_number = Column(String, default="")
    nationality     = Column(String, default="")
    expiry_date     = Column(String, default="")            # YYYY-MM-DD
    email           = Column(String, default="")
    phone           = Column(String, default="")
    created_at      = Column(DateTime, default=_now)
    updated_at      = Column(DateTime, default=_now, onupdate=_now)
