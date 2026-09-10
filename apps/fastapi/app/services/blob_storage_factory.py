from app.core.config import settings
from app.core.exceptions import ValidationException


def get_storage_service():
    """Return active storage service based on STORAGE_PROVIDER setting."""
    provider = (settings.STORAGE_PROVIDER or "azure").lower()

    if provider == "azure":
        from app.services import azure_blob_service
        return azure_blob_service
    elif provider == "backblaze":
        from app.services import backblaze_blob_service
        return backblaze_blob_service
    else:
        raise ValidationException(f"Unknown storage provider: {provider}")
