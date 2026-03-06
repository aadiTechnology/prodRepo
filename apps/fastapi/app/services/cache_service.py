import hashlib

from app.core.logging_config import get_logger

logger = get_logger(__name__)


def generate_requirement_hash(requirement: str) -> str:
    normalized = requirement.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()


ai_response_cache: dict[str, dict] = {}


def get_cached_response(requirement: str) -> dict | None:
    key = generate_requirement_hash(requirement)
    value = ai_response_cache.get(key)
    if value is not None:
        logger.info("Cache hit")
        return value
    logger.info("Cache miss")
    return None


def cache_response(requirement: str, response: dict) -> None:
    key = generate_requirement_hash(requirement)
    ai_response_cache[key] = response
