from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user
from backend.app.database import get_db
from backend.domains.social.services.analytics_service import get_cached_social_dashboard
from backend.domains.social.services.content_service import approve_post, create_post_from_trend, publish_post
from backend.domains.social.services.trend_service import discover_trends, list_posts_for_user, list_trends_for_user
from backend.models.user import User
from backend.schemas.social import (
    SocialPostCreateRequest,
    SocialPostRead,
    SocialPublishRequest,
    SocialTrendRead,
    TrendDiscoveryRequest,
)


router = APIRouter(prefix="/social", tags=["social"])


@router.get("/dashboard")
def get_social_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return get_cached_social_dashboard(db, user_id=current_user.id)


@router.get("/trends", response_model=list[SocialTrendRead])
def get_trends(
    platform: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_trends_for_user(db, user_id=current_user.id, platform=platform, limit=limit)


@router.post("/trends/discover", status_code=status.HTTP_202_ACCEPTED)
def run_trend_discovery(
    request: TrendDiscoveryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return discover_trends(
        db,
        topic=request.topic,
        user_id=current_user.id,
        platforms=request.platforms,
        limit=request.limit,
    )


@router.get("/posts", response_model=list[SocialPostRead])
def get_posts(
    platform: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_posts_for_user(db, user_id=current_user.id, platform=platform, limit=limit)


@router.post("/posts", response_model=SocialPostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    request: SocialPostCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return create_post_from_trend(db, trend_id=request.trend_id, platform=request.platform, user_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/posts/{post_id}/approve", response_model=SocialPostRead)
def approve_social_post(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return approve_post(db, post_id=post_id, user_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/posts/{post_id}/publish", response_model=SocialPostRead)
def publish_social_post(
    post_id: int,
    request: SocialPublishRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return publish_post(db, post_id=post_id, user_id=current_user.id, schedule_for=request.schedule_for)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
