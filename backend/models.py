from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, UniqueConstraint, Uuid, JSON
from sqlalchemy.sql import func
import uuid
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
    share_token   = Column(String,  nullable=True, unique=True, index=True)
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


class PushSubscription(Base):
    """Browser push subscription — one row per device/browser per user."""
    __tablename__ = "push_subscriptions"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String, nullable=False, index=True)
    endpoint   = Column(String, nullable=False, unique=True)
    p256dh     = Column(String, nullable=False)
    auth       = Column(String, nullable=False)
    created_at = Column(DateTime, default=_now)


class Trip(Base):
    """Saved trip snapshot — full plan (flights, hotel, guide, budget, itinerary)."""
    __tablename__ = "trips"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_email    = Column(String, nullable=False, index=True)
    name          = Column(String, nullable=False)
    destination   = Column(String, nullable=False, default="")
    date_range    = Column(String, nullable=False, default="")
    data          = Column(JSON, nullable=False)   # full plan snapshot
    share_token   = Column(String, unique=True, nullable=True, index=True)
    collaborators = Column(JSON, nullable=True, default=list)  # list of email strings
    created_at    = Column(DateTime, default=_now)
    updated_at    = Column(DateTime, default=_now, onupdate=_now)


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    id              = Column(Integer, primary_key=True)
    user_email      = Column(String, nullable=False, unique=True, index=True)
    nationality     = Column(String, nullable=True, default="India")
    home_city       = Column(String, nullable=True, default="")   # city name
    home_iata       = Column(String, nullable=True, default="")   # IATA code e.g. BLR
    currency        = Column(String, nullable=True, default="INR")
    travel_style    = Column(String, nullable=True, default="")   # budget | mid-range | luxury
    onboarding_done = Column(Boolean, nullable=False, default=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PriceAlert(Base):
    """Price alert — notify a user when a flight route drops below their threshold."""
    __tablename__ = "price_alerts"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_email      = Column(String, nullable=False, index=True)
    origin          = Column(String, nullable=False)          # IATA e.g. "BLR"
    destination     = Column(String, nullable=False)          # IATA e.g. "DXB"
    departure_date  = Column(String, nullable=False)          # YYYY-MM-DD
    threshold_inr   = Column(Integer, nullable=False)         # target price
    last_price_inr  = Column(Integer, nullable=True)          # last checked price
    triggered       = Column(Boolean, default=False)          # sent at least one alert
    active          = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=_now)
    last_checked    = Column(DateTime, nullable=True)
