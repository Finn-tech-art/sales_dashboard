from backend.app.database import session_scope
from backend.services.hubspot_sync_service import sync_contacts_incremental
from backend.workers.celery_app import celery_app


@celery_app.task(name="backend.workers.hubspot_sync_contacts.sync_contacts")
def sync_hubspot_contacts_task(
    object_ids: list[str] | None = None,
    user_id: int | None = None,
    trigger_source: str = "scheduler",
) -> dict:
    with session_scope() as db:
        return sync_contacts_incremental(
            db,
            object_ids=object_ids,
            user_id=user_id,
            trigger_source=trigger_source,
        )
