import json
import time
from dataclasses import dataclass
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from backend.app.config import get_settings


@dataclass
class MemoryCacheEntry:
    expires_at: float
    value: str


class CacheBackend:
    def __init__(self, redis_url: str | None = None):
        settings = get_settings()
        self.redis_url = redis_url or settings.REDIS_URL
        self.default_ttl = settings.CACHE_DEFAULT_TTL_SECONDS
        self._memory_store: dict[str, MemoryCacheEntry] = {}
        self._redis: Redis | None = None

    @property
    def redis(self) -> Redis | None:
        if not self.redis_url:
            return None
        if self._redis is None:
            try:
                self._redis = Redis.from_url(self.redis_url, decode_responses=True)
                self._redis.ping()
            except RedisError:
                self._redis = None
        return self._redis

    def get(self, key: str) -> Any | None:
        redis_client = self.redis
        if redis_client is not None:
            try:
                payload = redis_client.get(key)
            except RedisError:
                payload = None
            if payload:
                return json.loads(payload)

        entry = self._memory_store.get(key)
        if entry is None:
            return None
        if entry.expires_at <= time.time():
            self._memory_store.pop(key, None)
            return None
        return json.loads(entry.value)

    def set(self, key: str, value: Any, ttl: int | None = None) -> Any:
        encoded = json.dumps(value, default=str)
        ttl_seconds = ttl or self.default_ttl
        redis_client = self.redis
        if redis_client is not None:
            try:
                redis_client.setex(key, ttl_seconds, encoded)
                return value
            except RedisError:
                pass

        self._memory_store[key] = MemoryCacheEntry(
            expires_at=time.time() + ttl_seconds,
            value=encoded,
        )
        return value

    def delete(self, key: str) -> None:
        redis_client = self.redis
        if redis_client is not None:
            try:
                redis_client.delete(key)
            except RedisError:
                pass
        self._memory_store.pop(key, None)

    def remember(self, key: str, factory, ttl: int | None = None):
        cached = self.get(key)
        if cached is not None:
            return cached
        return self.set(key, factory(), ttl=ttl)


def build_cache_key(*parts: object) -> str:
    return ":".join(str(part) for part in parts if part is not None and part != "")
