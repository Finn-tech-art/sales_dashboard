from backend.app.database import session_scope
from backend.domains.social.services.content_service import create_post_from_trend, publish_post
from backend.workers.celery_app import celery_app


@celery_app.task(name="backend.domains.social.workers.content_pipeline.create_social_post")
def create_social_post_task(trend_id: int, platform: str, user_id: int | None = None) -> dict:
    with session_scope() as db:
        post = create_post_from_trend(db, trend_id=trend_id, platform=platform, user_id=user_id)
        return {"post_id": post.id, "status": post.approval_status}


@celery_app.task(name="backend.domains.social.workers.content_pipeline.publish_social_post")
def publish_social_post_task(post_id: int, user_id: int | None = None) -> dict:
    with session_scope() as db:
        post = publish_post(db, post_id=post_id, user_id=user_id)
        return {"post_id": post.id, "status": post.publish_status}
