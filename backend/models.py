from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, UniqueConstraint, Uuid, JSON
from sqlalchemy.sql import func
import uuid
import re as _re
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
    id                 = Column(Integer, primary_key=True)
    user_email         = Column(String, nullable=False, unique=True, index=True)
    nationality        = Column(String, nullable=True, default="India")
    home_city          = Column(String, nullable=True, default="")   # city name
    home_iata          = Column(String, nullable=True, default="")   # IATA code e.g. BLR
    currency           = Column(String, nullable=True, default="INR")
    travel_style       = Column(String, nullable=True, default="")   # budget | mid-range | luxury
    passport_expiry    = Column(String, nullable=True, default="")   # YYYY-MM-DD
    onboarding_done    = Column(Boolean, nullable=False, default=False)
    packing_essentials = Column(JSON, nullable=True, default=list)   # list of always-carry item strings
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


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


class AgentProfile(Base):
    """Travel agent or agency profile — linked to an existing OAuth user by email."""
    __tablename__ = "agent_profiles"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_email      = Column(String, nullable=False, unique=True, index=True)
    agent_type      = Column(String, nullable=False)       # "agency" | "individual"
    name            = Column(String, nullable=False)        # agency name or personal name
    phone           = Column(String, nullable=False)
    phone_verified  = Column(Boolean, default=False)
    location        = Column(String, default="")
    website         = Column(String, default="")
    description     = Column(Text, default="")
    logo_url        = Column(String, default="")
    specializations = Column(JSON, default=list)           # ["pilgrimage","adventure",…]
    languages       = Column(JSON, default=list)           # individual agents only
    experience_years= Column(Integer, default=0)           # individual agents only
    agency_code     = Column(String, default="")           # link to agency if individual
    is_active       = Column(Boolean, default=True)        # can be deactivated by admin
    created_at      = Column(DateTime, default=_now)
    updated_at      = Column(DateTime, default=_now, onupdate=_now)


class OTPRecord(Base):
    """Stores phone OTP for agent phone verification."""
    __tablename__ = "otp_records"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    phone      = Column(String, nullable=False, index=True)
    otp_hash   = Column(String, nullable=False)   # SHA-256 of the OTP string
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)


class TourPackage(Base):
    __tablename__ = "tour_packages"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    agent_email      = Column(String, nullable=False, index=True)   # FK by email
    title            = Column(String(200), nullable=False)
    slug             = Column(String(220), unique=True, nullable=False)
    category         = Column(String(40), default="")       # adventure/family/honeymoon/pilgrimage/beach/cultural/wildlife/budget
    destinations     = Column(JSON, default=list)           # ["Ooty","Coonoor"]
    duration_days    = Column(Integer, default=1)
    duration_nights  = Column(Integer, default=0)
    itinerary        = Column(JSON, default=list)           # [{day,title,activities:[str]}]
    highlights       = Column(JSON, default=list)
    inclusions       = Column(JSON, default=list)
    exclusions       = Column(JSON, default=list)
    what_to_carry    = Column(JSON, default=list)
    cancellation_policy = Column(Text, default="")
    price_per_person = Column(Integer, default=0)           # in INR
    price_couple     = Column(Integer, nullable=True)
    price_child      = Column(Integer, nullable=True)
    group_min        = Column(Integer, nullable=True)
    group_max        = Column(Integer, nullable=True)
    available_dates  = Column(JSON, default=list)           # ["2026-10-15",…]
    difficulty       = Column(String(20), default="easy")   # easy/moderate/challenging
    age_min          = Column(Integer, nullable=True)
    age_max          = Column(Integer, nullable=True)
    images           = Column(JSON, default=list)           # [url,…] up to 8
    booking_phone    = Column(String(20), default="")
    booking_whatsapp = Column(String(20), default="")
    booking_email    = Column(String(120), default="")
    is_public        = Column(Boolean, default=False)
    status           = Column(String(20), default="draft")  # draft/published/archived
    views_count      = Column(Integer, default=0)
    enquiries_count  = Column(Integer, default=0)
    created_at       = Column(DateTime, default=_now)
    updated_at       = Column(DateTime, default=_now, onupdate=_now)


class Ticket(Base):
    __tablename__ = "tickets"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    agent_email      = Column(String, nullable=False, index=True)
    title            = Column(String(200), nullable=False)
    ticket_type      = Column(String(20), nullable=False)   # group / individual
    mode             = Column(String(20), nullable=False)   # bus/train/flight/boat/cab
    origin           = Column(String(100), nullable=False)
    destination      = Column(String(100), nullable=False)
    travel_date      = Column(String(20), nullable=False)   # YYYY-MM-DD
    travel_time      = Column(String(10), default="")       # HH:MM
    return_date      = Column(String(20), default="")
    total_seats      = Column(Integer, default=1)
    available_seats  = Column(Integer, default=1)
    price_per_seat   = Column(Integer, default=0)           # INR
    booking_deadline = Column(String(20), default="")
    departure_point  = Column(String(200), default="")
    pickup_points    = Column(JSON, default=list)           # [{location,time}]
    amenities        = Column(JSON, default=list)           # ["AC","Sleeper",…]
    vehicle_details  = Column(JSON, default=dict)
    notes            = Column(Text, default="")
    contact_phone    = Column(String(20), default="")
    contact_whatsapp = Column(String(20), default="")
    contact_email    = Column(String(120), default="")
    is_public        = Column(Boolean, default=False)
    created_at       = Column(DateTime, default=_now)
    updated_at       = Column(DateTime, default=_now, onupdate=_now)


class VisaService(Base):
    __tablename__ = "visa_services"

    id                       = Column(Integer, primary_key=True, autoincrement=True)
    agent_email              = Column(String, nullable=False, index=True)
    destination_country      = Column(String(100), nullable=False)
    destination_country_code = Column(String(3), default="")
    visa_type                = Column(String(30), nullable=False)  # tourist/visiting/work/student/transit/medical
    title                    = Column(String(200), nullable=False)
    validity_label           = Column(String(30), default="")     # "30 days","1 year"
    max_stay_days            = Column(Integer, default=0)
    entry_type               = Column(String(20), default="single") # single/double/multiple
    eligible_nationalities   = Column(JSON, default=list)
    required_documents       = Column(JSON, default=list)
    photo_specs              = Column(JSON, default=dict)
    processing_time_min      = Column(Integer, default=1)
    processing_time_max      = Column(Integer, default=7)
    govt_fee_amount          = Column(Integer, default=0)
    govt_fee_currency        = Column(String(5), default="INR")
    agent_service_fee        = Column(Integer, default=0)
    application_method       = Column(String(30), default="")  # online/embassy/on_arrival/vfs
    embassy_details          = Column(JSON, default=dict)
    process_steps            = Column(JSON, default=list)
    important_notes          = Column(JSON, default=list)
    is_public                = Column(Boolean, default=False)
    status                   = Column(String(20), default="active") # active/paused/discontinued
    created_at               = Column(DateTime, default=_now)
    updated_at               = Column(DateTime, default=_now, onupdate=_now)


def make_slug(title: str, suffix: str) -> str:
    """Generate a URL-friendly slug: 'Ooty Family Tour' -> 'ooty-family-tour-ab12'"""
    base = _re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:80]
    return f"{base}-{suffix}"
