import math
import threading
import time
from dataclasses import dataclass

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from backend.app.config import get_settings


@dataclass
class TokenBucket:
    tokens: float
    updated_at: float


class RateLimitStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._buckets: dict[str, TokenBucket] = {}

    def consume(self, key: str, capacity: int, refill_rate: float) -> tuple[bool, int]:
        now = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                bucket = TokenBucket(tokens=float(capacity), updated_at=now)

            elapsed = max(0.0, now - bucket.updated_at)
            bucket.tokens = min(float(capacity), bucket.tokens + (elapsed * refill_rate))
            bucket.updated_at = now

            if bucket.tokens >= 1:
                bucket.tokens -= 1
                self._buckets[key] = bucket
                return True, max(0, math.floor(bucket.tokens))

            self._buckets[key] = bucket
            return False, 0


rate_limit_store = RateLimitStore()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        if request.url.path in {"/health", "/docs", "/openapi.json"}:
            return await call_next(request)

        client_host = request.client.host if request.client else "anonymous"
        user_key = request.headers.get("authorization") or client_host
        bucket_key = f"{request.method}:{request.url.path}:{user_key}"
        allowed, remaining = rate_limit_store.consume(
            key=bucket_key,
            capacity=settings.RATE_LIMIT_CAPACITY,
            refill_rate=settings.RATE_LIMIT_REFILL_RATE,
        )

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please retry shortly."},
                headers={"X-RateLimit-Remaining": "0"},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
