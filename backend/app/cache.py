"""
Caloriq — Cache abstraction layer.

Uses Redis when available, falls back to an in-memory dictionary.
This lets Sprint 1 work with zero infrastructure dependencies.
"""

import json
import time
import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


class InMemoryCache:
    """Simple in-memory cache with TTL support. Not for production."""

    def __init__(self):
        self._store: dict[str, tuple[str, float]] = {}  # key → (value, expires_at)

    def get(self, key: str) -> str | None:
        if key in self._store:
            value, expires_at = self._store[key]
            if time.time() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: str, ex: int = 3600) -> None:
        self._store[key] = (value, time.time() + ex)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def incr(self, key: str) -> int:
        current = self.get(key)
        new_val = int(current or 0) + 1
        # Preserve existing TTL or set 1 hour default
        if key in self._store:
            _, expires_at = self._store[key]
            self._store[key] = (str(new_val), expires_at)
        else:
            self.set(key, str(new_val), ex=3600)
        return new_val

    def expire(self, key: str, seconds: int) -> None:
        if key in self._store:
            value, _ = self._store[key]
            self._store[key] = (value, time.time() + seconds)


class RedisCache:
    """Thin wrapper around redis-py for interface consistency."""

    def __init__(self):
        import redis
        self._client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    def get(self, key: str) -> str | None:
        return self._client.get(key)

    def set(self, key: str, value: str, ex: int = 3600) -> None:
        self._client.set(key, value, ex=ex)

    def delete(self, key: str) -> None:
        self._client.delete(key)

    def incr(self, key: str) -> int:
        return self._client.incr(key)

    def expire(self, key: str, seconds: int) -> None:
        self._client.expire(key, seconds)


def _create_cache() -> InMemoryCache | RedisCache:
    """Create the best available cache backend."""
    if settings.REDIS_URL:
        try:
            cache = RedisCache()
            cache.set("__ping__", "1", ex=5)
            logger.info("✅ Connected to Redis at %s", settings.REDIS_URL)
            return cache
        except Exception as e:
            logger.warning("⚠️  Redis unavailable (%s), falling back to in-memory cache", e)

    logger.info("📦 Using in-memory cache (set REDIS_URL for Redis)")
    return InMemoryCache()


# ── Singleton cache instance ─────────────────────────────
cache = _create_cache()


# ── Convenience helpers for food analysis caching ────────
def cache_food_result(query_hash: str, result: dict) -> None:
    """Store a food analysis result in cache."""
    cache.set(
        f"food:{query_hash}",
        json.dumps(result),
        ex=settings.FOOD_CACHE_TTL,
    )


def get_cached_food_result(query_hash: str) -> dict | None:
    """Retrieve a cached food analysis result."""
    raw = cache.get(f"food:{query_hash}")
    if raw:
        return json.loads(raw)
    return None
