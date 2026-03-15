import json

from backend.app.database import session_scope
from backend.services.hubspot_sync_service import delete_contact_records
from backend.workers.celery_app import celery_app
from backend.workers.hubspot_sync_contacts import sync_hubspot_contacts_task
from backend.workers.hubspot_sync_deals import record_hubspot_deal_deletions_task, sync_hubspot_deals_task


def _event_type(event: dict) -> str:
    return str(event.get("subscriptionType") or event.get("eventType") or "").lower()


def _event_object_id(event: dict) -> str | None:
    value = event.get("objectId") or event.get("object_id") or event.get("id")
    return str(value) if value not in (None, "") else None


@celery_app.task(name="backend.workers.webhook_dispatcher.dispatch_hubspot_webhook")
def dispatch_hubspot_webhook_task(payload: str, user_id: int | None = None) -> dict:
    data = json.loads(payload)
    events = data if isinstance(data, list) else data.get("events") or [data]
    queued = {"contact_creation": 0, "contact_deletion": 0, "deal_creation": 0, "deal_deletion": 0}

    contact_delete_ids: list[str] = []
    deal_delete_ids: list[str] = []

    for event in events:
        event_type = _event_type(event)
        object_id = _event_object_id(event)
        if not object_id:
            continue

        if event_type == "contact.creation":
            sync_hubspot_contacts_task.delay(object_ids=[object_id], user_id=user_id, trigger_source="webhook")
            queued["contact_creation"] += 1
        elif event_type == "contact.deletion":
            contact_delete_ids.append(object_id)
            queued["contact_deletion"] += 1
        elif event_type == "deal.creation":
            sync_hubspot_deals_task.delay(object_ids=[object_id], user_id=user_id, trigger_source="webhook")
            queued["deal_creation"] += 1
        elif event_type == "deal.deletion":
            deal_delete_ids.append(object_id)
            queued["deal_deletion"] += 1

    if contact_delete_ids:
        with session_scope() as db:
            delete_contact_records(db, contact_delete_ids)
    if deal_delete_ids:
        record_hubspot_deal_deletions_task.delay(deal_delete_ids, user_id=user_id)

    return {"queued": queued}
