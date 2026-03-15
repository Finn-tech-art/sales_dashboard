from backend.app.database import session_scope
from backend.services.hubspot_sync_service import record_deal_deletions, sync_companies_incremental, sync_deals_incremental
from backend.workers.celery_app import celery_app


@celery_app.task(name="backend.workers.hubspot_sync_deals.sync_deals")
def sync_hubspot_deals_task(
    object_ids: list[str] | None = None,
    user_id: int | None = None,
    trigger_source: str = "scheduler",
) -> dict:
    with session_scope() as db:
        return sync_deals_incremental(
            db,
            object_ids=object_ids,
            user_id=user_id,
            trigger_source=trigger_source,
        )


@celery_app.task(name="backend.workers.hubspot_sync_deals.sync_companies")
def sync_hubspot_companies_task(user_id: int | None = None, trigger_source: str = "scheduler") -> dict:
    with session_scope() as db:
        return sync_companies_incremental(db, user_id=user_id, trigger_source=trigger_source)


@celery_app.task(name="backend.workers.hubspot_sync_deals.record_deal_deletions")
def record_hubspot_deal_deletions_task(object_ids: list[str], user_id: int | None = None) -> dict:
    with session_scope() as db:
        return record_deal_deletions(db, object_ids=object_ids, user_id=user_id)
