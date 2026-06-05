from __future__ import annotations

from datetime import datetime
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ConflictException
from app.models.marketing_hub import MarketingPlatform, MarketingSocialMediaLink
from app.schemas.marketing_hub import MarketingPlatformCreate, MarketingPlatformUpdate


def list_platforms(db: Session, active_only: bool = False) -> list[MarketingPlatform]:
    """Retrieve all marketing platforms from the catalog."""
    query = db.query(MarketingPlatform)
    if active_only:
        query = query.filter(MarketingPlatform.is_active == True)  # noqa: E712
    return query.order_by(MarketingPlatform.sort_order.asc(), MarketingPlatform.name.asc()).all()


def get_marketing_config(db: Session, tenant_id: int) -> list[dict]:
    """Get all active marketing platforms with their tenant-specific URLs."""
    # Get all active catalog platforms
    platforms = (
        db.query(MarketingPlatform)
        .filter(MarketingPlatform.is_active == True)  # noqa: E712
        .order_by(MarketingPlatform.sort_order.asc(), MarketingPlatform.name.asc())
        .all()
    )

    # Get links for this specific tenant
    links = (
        db.query(MarketingSocialMediaLink)
        .filter(MarketingSocialMediaLink.tenant_id == tenant_id)
        .all()
    )

    link_map = {link.platform_id: link for link in links}

    result = []
    for platform in platforms:
        link = link_map.get(platform.id)
        result.append({
            "platform_id": platform.id,
            "name": platform.name,
            "code": platform.code,
            "category": platform.category,
            "description": platform.description,
            "icon_url": platform.icon_url,
            "sort_order": platform.sort_order,
            "is_active": platform.is_active,
            "link_id": link.id if link else None,
            "url": link.url if link else None,
            "link_active": link.is_active if link else None,
        })
    return result


def save_marketing_link(
    db: Session,
    tenant_id: int,
    platform_id: int,
    url: str,
    is_active: bool = True,
    user_id: int | None = None,
) -> MarketingSocialMediaLink:
    """Save or update a tenant's URL configuration for a marketing platform."""
    # Check if platform exists
    platform = (
        db.query(MarketingPlatform)
        .filter(MarketingPlatform.id == platform_id)
        .first()
    )
    if not platform:
        raise NotFoundException("Marketing platform", platform_id)

    # Check if a link already exists
    link = (
        db.query(MarketingSocialMediaLink)
        .filter(
            MarketingSocialMediaLink.tenant_id == tenant_id,
            MarketingSocialMediaLink.platform_id == platform_id,
        )
        .first()
    )

    if link:
        # Update existing link
        link.url = url
        link.is_active = is_active
        link.updated_at = datetime.utcnow()
        link.updated_by = user_id
    else:
        # Create new link
        link = MarketingSocialMediaLink(
            scope_type="TENANT",
            tenant_id=tenant_id,
            platform_id=platform_id,
            url=url,
            is_active=is_active,
            created_at=datetime.utcnow(),
            created_by=user_id,
        )
        db.add(link)

    db.commit()
    db.refresh(link)
    return link


def create_platform(
    db: Session, data: MarketingPlatformCreate, user_id: int | None = None
) -> MarketingPlatform:
    """Create a new platform in the global catalog."""
    # Check for duplicate code
    existing = (
        db.query(MarketingPlatform)
        .filter(MarketingPlatform.code == data.code.strip().lower())
        .first()
    )
    if existing:
        raise ConflictException(f"Platform with code '{data.code}' already exists.")

    platform = MarketingPlatform(
        name=data.name.strip(),
        code=data.code.strip().lower(),
        category=data.category.strip(),
        description=data.description.strip() if data.description else None,
        icon_url=data.icon_url.strip() if data.icon_url else None,
        sort_order=data.sort_order,
        is_active=data.is_active,
        created_at=datetime.utcnow(),
        created_by=user_id,
    )
    db.add(platform)
    db.commit()
    db.refresh(platform)
    return platform


def seed_default_platforms(db: Session) -> None:
    """Seed default platforms into the catalog if the table is empty."""
    default_platforms = [
        {"name": "Instagram", "code": "instagram", "category": "Social Media", "sort_order": 10},
        {"name": "Facebook", "code": "facebook", "category": "Social Media", "sort_order": 20},
        {"name": "YouTube", "code": "youtube", "category": "Social Media", "sort_order": 30},
        {"name": "Meta Ads", "code": "meta_ads", "category": "Advertising", "sort_order": 40},
        {"name": "Google Ads", "code": "google_ads", "category": "Advertising", "sort_order": 50},
        {"name": "WhatsApp", "code": "whatsapp", "category": "Communication", "sort_order": 60},
        {"name": "Email Campaign", "code": "email_campaign", "category": "Communication", "sort_order": 70},
        {"name": "Canva", "code": "canva", "category": "Branding", "sort_order": 80},
        {"name": "Brochure", "code": "brochure", "category": "Branding", "sort_order": 90},
        {"name": "School Website", "code": "school_website", "category": "Website & Reviews", "sort_order": 100},
        {"name": "Google Review", "code": "google_review", "category": "Website & Reviews", "sort_order": 110},
    ]

    for p_def in default_platforms:
        # Check if platform already exists by code
        exists = db.query(MarketingPlatform).filter(MarketingPlatform.code == p_def["code"]).first()
        if not exists:
            platform = MarketingPlatform(
                name=p_def["name"],
                code=p_def["code"],
                category=p_def["category"],
                sort_order=p_def["sort_order"],
                is_active=True,
                created_at=datetime.utcnow(),
            )
            db.add(platform)

    db.commit()
