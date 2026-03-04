import hashlib


def generate_requirement_hash(requirement: str) -> str:
    normalized = requirement.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()


ai_response_cache: dict[str, dict] = {}


def get_cached_response(requirement: str) -> dict | None:
    key = generate_requirement_hash(requirement)
    return ai_response_cache.get(key)


def cache_response(requirement: str, response: dict) -> None:
    key = generate_requirement_hash(requirement)
    ai_response_cache[key] = response
