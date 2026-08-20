from __future__ import annotations

from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ConflictException
from app.models.marketing_hub import MarketingPlatform, MarketingSocialMediaLink
from app.schemas.marketing_hub import MarketingPlatformCreate, MarketingPlatformUpdate
from app.utils.integration_url import normalize_integration_url


def _swap_sort_order_if_taken(
    db: Session,
    *,
    desired_sort_order: int,
    exclude_platform_id: int | None = None,
    previous_sort_order: int | None = None,
) -> None:
    """If another platform already has desired_sort_order, swap with it.

    Create and Edit use the same rule: the occupant takes previous_sort_order
    (the slot the incoming platform is leaving / would have used). Extra
    duplicate occupants of the same number are moved to unused next slots.
    """
    query = db.query(MarketingPlatform).filter(
        MarketingPlatform.sort_order == desired_sort_order
    )
    if exclude_platform_id is not None:
        query = query.filter(MarketingPlatform.id != exclude_platform_id)
    occupants = query.order_by(MarketingPlatform.id.asc()).all()
    if not occupants:
        return

    replacement = (
        previous_sort_order if previous_sort_order is not None else next_sort_order(db)
    )
    occupants[0].sort_order = replacement
    db.flush()
    for extra in occupants[1:]:
        extra.sort_order = next_sort_order(db)
        db.flush()


def next_sort_order(db: Session) -> int:
    """Next unused catalog position: max(sort_order) + 1, or 1 if empty."""
    max_order = db.query(func.max(MarketingPlatform.sort_order)).scalar()
    return int(max_order or 0) + 1


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

    normalized_url = normalize_integration_url(url)

    if link:
        # Update existing link
        link.url = normalized_url
        link.is_active = is_active
        link.updated_at = datetime.utcnow()
        link.updated_by = user_id
    else:
        # Create new link
        link = MarketingSocialMediaLink(
            scope_type="TENANT",
            tenant_id=tenant_id,
            platform_id=platform_id,
            url=normalized_url,
            is_active=is_active,
            created_at=datetime.utcnow(),
            created_by=user_id,
        )
        db.add(link)

    db.commit()
    db.refresh(link)
    return link


def get_platform_config_for_tenant(
    db: Session,
    tenant_id: int,
    platform_id: int,
) -> dict:
    """Get a single active platform with tenant-specific link configuration."""
    platform = (
        db.query(MarketingPlatform)
        .filter(
            MarketingPlatform.id == platform_id,
            MarketingPlatform.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not platform:
        raise NotFoundException("Marketing platform", platform_id)

    link = (
        db.query(MarketingSocialMediaLink)
        .filter(
            MarketingSocialMediaLink.tenant_id == tenant_id,
            MarketingSocialMediaLink.platform_id == platform_id,
        )
        .first()
    )

    return {
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
    }


def update_platform(
    db: Session,
    platform_id: int,
    data: MarketingPlatformUpdate,
    user_id: int | None = None,
) -> MarketingPlatform:
    """Update an existing platform in the global marketing catalog."""
    platform = (
        db.query(MarketingPlatform)
        .filter(MarketingPlatform.id == platform_id)
        .first()
    )
    if not platform:
        raise NotFoundException("Marketing platform", platform_id)

    if data.name is not None:
        platform.name = data.name.strip()
    if data.category is not None:
        platform.category = data.category.strip()
    if data.description is not None:
        platform.description = data.description.strip() if data.description else None
    if data.icon_url is not None:
        platform.icon_url = data.icon_url.strip() if data.icon_url else None
    if data.sort_order is not None and data.sort_order != platform.sort_order:
        previous_sort_order = int(platform.sort_order or 0)
        _swap_sort_order_if_taken(
            db,
            desired_sort_order=data.sort_order,
            exclude_platform_id=platform.id,
            previous_sort_order=previous_sort_order,
        )
        platform.sort_order = data.sort_order
        db.flush()
    if data.is_active is not None:
        platform.is_active = data.is_active

    platform.updated_at = datetime.utcnow()
    platform.updated_by = user_id
    db.commit()
    db.refresh(platform)
    return platform


def delete_marketing_link(
    db: Session,
    tenant_id: int,
    link_id: int,
) -> None:
    """Remove a tenant's URL configuration for a marketing platform."""
    link = (
        db.query(MarketingSocialMediaLink)
        .filter(
            MarketingSocialMediaLink.id == link_id,
            MarketingSocialMediaLink.tenant_id == tenant_id,
        )
        .first()
    )
    if not link:
        raise NotFoundException("Marketing link", link_id)

    db.delete(link)
    db.commit()


def delete_platform(
    db: Session,
    platform_id: int,
    user_id: int | None = None,
) -> None:
    """Soft-delete a platform from the global marketing catalog."""
    platform = (
        db.query(MarketingPlatform)
        .filter(MarketingPlatform.id == platform_id)
        .first()
    )
    if not platform:
        raise NotFoundException("Marketing platform", platform_id)

    platform.is_active = False
    platform.updated_at = datetime.utcnow()
    platform.updated_by = user_id
    db.commit()


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

    vacated_sort_order = next_sort_order(db)
    sort_order = int(data.sort_order or 0)
    if sort_order < 1:
        sort_order = vacated_sort_order

    # Same swap as Edit: e.g. YouTube=1, new default=24, user saves 1
    # -> new platform=1, YouTube=24.
    _swap_sort_order_if_taken(
        db,
        desired_sort_order=sort_order,
        previous_sort_order=vacated_sort_order if sort_order != vacated_sort_order else None,
    )

    platform = MarketingPlatform(
        name=data.name.strip(),
        code=data.code.strip().lower(),
        category=data.category.strip(),
        description=data.description.strip() if data.description else None,
        icon_url=data.icon_url.strip() if data.icon_url else None,
        sort_order=sort_order,
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
        {"name": "Instagram", "code": "instagram", "category": "Social Media", "sort_order": 1},
        {"name": "Facebook", "code": "facebook", "category": "Social Media", "sort_order": 2},
        {"name": "YouTube", "code": "youtube", "category": "Social Media", "sort_order": 3},
        {"name": "Meta Ads", "code": "meta_ads", "category": "Advertising", "sort_order": 4},
        {"name": "Google Ads", "code": "google_ads", "category": "Advertising", "sort_order": 5},
        {"name": "WhatsApp", "code": "whatsapp", "category": "Communication", "sort_order": 6},
        {"name": "Email Campaign", "code": "email_campaign", "category": "Communication", "sort_order": 7},
        {"name": "Canva", "code": "canva", "category": "Branding", "sort_order": 8},
        {"name": "Brochure", "code": "brochure", "category": "Branding", "sort_order": 9},
        {"name": "School Website", "code": "school_website", "category": "Website & Reviews", "sort_order": 10},
        {"name": "Google Review", "code": "google_review", "category": "Website & Reviews", "sort_order": 11},
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
