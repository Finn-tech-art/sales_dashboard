import json

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.core.cache import CacheBackend, build_cache_key
from backend.domains.leads.services.lead_service import create_workflow_run
from backend.domains.social.models.social_post import SocialPost
from backend.domains.social.models.social_trend import SocialTrend
from backend.services.n8n_client import N8NClient


def list_trends_for_user(db: Session, user_id: int, platform: str | None = None, limit: int = 25) -> list[SocialTrend]:
    query = (
        select(SocialTrend)
        .where(or_(SocialTrend.user_id == user_id, SocialTrend.user_id.is_(None)))
        .order_by(SocialTrend.discovered_at.desc())
        .limit(limit)
    )
    if platform:
        query = query.where(SocialTrend.platform == platform)
    return list(db.scalars(query).all())


def list_posts_for_user(db: Session, user_id: int, platform: str | None = None, limit: int = 25) -> list[SocialPost]:
    query = (
        select(SocialPost)
        .where(or_(SocialPost.user_id == user_id, SocialPost.user_id.is_(None)))
        .order_by(SocialPost.created_at.desc())
        .limit(limit)
    )
    if platform:
        query = query.where(SocialPost.platform == platform)
    return list(db.scalars(query).all())


def discover_trends(
    db: Session,
    *,
    topic: str,
    user_id: int | None = None,
    platforms: list[str] | None = None,
    limit: int = 12,
) -> dict:
    settings = get_settings()
    cache = CacheBackend()
    platforms = platforms or settings.SOCIAL_DEFAULT_PLATFORMS
    cache_key = build_cache_key("social", "trends", user_id or "global", topic, ",".join(sorted(platforms)), limit)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    run = create_workflow_run(
        db,
        workflow_name="social-trend-discovery",
        domain="social",
        trigger_source="worker",
        user_id=user_id,
        payload={"topic": topic, "platforms": platforms, "limit": limit},
    )
    client = N8NClient()
    response = client.trigger_workflow(
        settings.SOCIAL_TRENDS_WEBHOOK_PATH,
        {"topic": topic, "platforms": platforms, "limit": limit},
    )
    raw_trends = response.get("results") or response.get("trends") or []
    stored_ids: list[int] = []
    for item in raw_trends:
        platform = (item.get("platform") or "instagram").lower()
        keyword = item.get("keyword") or item.get("topic") or topic
        existing = db.scalar(
            select(SocialTrend).where(
                SocialTrend.platform == platform,
                SocialTrend.keyword == keyword,
                or_(SocialTrend.user_id == user_id, SocialTrend.user_id.is_(None)),
            )
        )
        trend = existing or SocialTrend(user_id=user_id, platform=platform, keyword=keyword)
        trend.summary = item.get("summary") or item.get("description")
        trend.score = float(item.get("score") or item.get("rank") or 0.0)
        trend.source = item.get("source") or "n8n"
        trend.status = "ranked"
        trend.payload = json.dumps(item)
        db.add(trend)
        db.commit()
        db.refresh(trend)
        stored_ids.append(trend.id)

    run.status = "completed"
    run.payload = json.dumps({"topic": topic, "platforms": platforms, "trend_ids": stored_ids})
    db.add(run)
    db.commit()
    cache.delete(build_cache_key("dashboard", "social", user_id or "global"))

    result = {"topic": topic, "platforms": platforms, "trend_ids": stored_ids, "count": len(stored_ids)}
    cache.set(cache_key, result, ttl=settings.CACHE_TRENDS_TTL_SECONDS)
    return result
