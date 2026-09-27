"""Free-tier enforcement for agent listings."""
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import TourPackage, Ticket, VisaService, Subscription

FREE_LIMITS = {
    "packages": 10,
    "tickets":  10,
    "visa":     5,
}


async def _is_pro(email: str, db: AsyncSession) -> bool:
    sub = (await db.execute(
        select(Subscription).where(
            Subscription.user_email == email,
            Subscription.status == "active",
        ).order_by(Subscription.created_at.desc())
    )).scalar_one_or_none()
    return sub is not None


async def check_package_limit(email: str, db: AsyncSession) -> None:
    if await _is_pro(email, db):
        return
    count = (await db.execute(
        select(func.count()).where(
            TourPackage.agent_email == email,
            TourPackage.status != "archived",
        )
    )).scalar() or 0
    if count >= FREE_LIMITS["packages"]:
        raise HTTPException(
            status_code=402,
            detail={
                "upgrade_required": True,
                "feature": "packages",
                "limit": FREE_LIMITS["packages"],
                "message": f"Free plan allows up to {FREE_LIMITS['packages']} packages. Upgrade to Pro for unlimited.",
            },
        )


async def check_ticket_limit(email: str, db: AsyncSession) -> None:
    if await _is_pro(email, db):
        return
    count = (await db.execute(
        select(func.count()).where(Ticket.agent_email == email)
    )).scalar() or 0
    if count >= FREE_LIMITS["tickets"]:
        raise HTTPException(
            status_code=402,
            detail={
                "upgrade_required": True,
                "feature": "tickets",
                "limit": FREE_LIMITS["tickets"],
                "message": f"Free plan allows up to {FREE_LIMITS['tickets']} ticket listings. Upgrade to Pro for unlimited.",
            },
        )


async def check_visa_limit(email: str, db: AsyncSession) -> None:
    if await _is_pro(email, db):
        return
    count = (await db.execute(
        select(func.count()).where(
            VisaService.agent_email == email,
            VisaService.status == "active",
        )
    )).scalar() or 0
    if count >= FREE_LIMITS["visa"]:
        raise HTTPException(
            status_code=402,
            detail={
                "upgrade_required": True,
                "feature": "visa",
                "limit": FREE_LIMITS["visa"],
                "message": f"Free plan allows up to {FREE_LIMITS['visa']} visa services. Upgrade to Pro for unlimited.",
            },
        )
