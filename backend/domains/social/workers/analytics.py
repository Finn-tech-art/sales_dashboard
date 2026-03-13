from backend.app.database import session_scope
from backend.domains.social.services.analytics_service import collect_post_analytics
from backend.workers.celery_app import celery_app


@celery_app.task(name="backend.domains.social.workers.analytics.collect_social_analytics")
def collect_social_analytics_task(user_id: int | None = None) -> dict:
    with session_scope() as db:
        return collect_post_analytics(db, user_id=user_id)
